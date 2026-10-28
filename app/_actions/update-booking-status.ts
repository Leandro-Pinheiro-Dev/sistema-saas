"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface UpdateBookingStatusParams {
  bookingId: string;
  status: BookingStatus;
}

export const updateBookingStatus = async ({
  bookingId,
  status,
}: UpdateBookingStatusParams) => {
  // 1. Verificar autenticação
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (!bookingId?.trim()) {
    throw new Error("Agendamento inválido.");
  }

  // 2. Validar o status em tempo de execução
  const allowedStatuses = [
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
  ] as const;

  if (!allowedStatuses.includes(status)) {
    throw new Error("Status de agendamento inválido.");
  }

  // 3. Buscar o agendamento e seus dados
  const booking = await db.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      user: true,
      service: true,
      bookingItems: {
        include: {
          service: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Agendamento não encontrado.");
  }

  // 4. Verificar se o usuário pertence ao estabelecimento
  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      barbershopId: booking.barbershopId,
      active: true,
      role: {
        in: ["OWNER", "BARBER"],
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!membership) {
    throw new Error(
      "Você não tem permissão para alterar agendamentos deste estabelecimento.",
    );
  }

  // 5. Funcionário só pode alterar os próprios agendamentos
  if (
    membership.role === "BARBER" &&
    booking.barberMembershipId !== membership.id
  ) {
    throw new Error(
      "Você só pode alterar o status dos seus próprios agendamentos.",
    );
  }

  // 6. Atualizar o status dentro do estabelecimento autorizado
  const updatedBooking = await db.booking.updateMany({
    where: {
      id: booking.id,
      barbershopId: booking.barbershopId,
      ...(membership.role === "BARBER"
        ? { barberMembershipId: membership.id }
        : {}),
    },
    data: {
      status,
    },
  });

  if (updatedBooking.count === 0) {
    throw new Error(
      "Não foi possível atualizar o agendamento. Verifique as permissões.",
    );
  }

  // 7. Enviar notificação quando o agendamento for confirmado
  if (status === "CONFIRMED" && booking.userId) {
    try {
      const subscriptions = await db.pushSubscription.findMany({
        where: {
          userId: booking.userId,
        },
      });

      const services =
        booking.bookingItems.length > 0
          ? booking.bookingItems.map((item) => item.service.name)
          : [booking.service.name];

      const servicesText = services.join(" + ");

      const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(booking.date);

      const formattedTime = booking.date.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      });

      for (const subscription of subscriptions) {
        try {
          await sendPushNotification(subscription, {
            title: "Agendamento confirmado! ✂️",
            body: `Seu agendamento de ${servicesText} foi confirmado para ${formattedDate} às ${formattedTime}.`,
            url: `/bookings/${booking.id}`,
          });

          console.log(
            `Push de confirmação enviado para o cliente ${booking.userId}.`,
          );
        } catch (error: unknown) {
          console.error(
            `Erro ao enviar Push para o cliente ${booking.userId}:`,
            error,
          );

          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
              ? error.statusCode
              : undefined;

          if (statusCode === 404 || statusCode === 410) {
            try {
              await db.pushSubscription.delete({
                where: {
                  id: subscription.id,
                },
              });

              console.log(`PushSubscription ${subscription.id} removida.`);
            } catch (deleteError) {
              console.error(
                "Erro ao remover PushSubscription expirada:",
                deleteError,
              );
            }
          }
        }
      }
    } catch (error) {
      // A falha no push não desfaz a confirmação do agendamento.
      console.error("Erro geral ao enviar notificação de confirmação:", error);
    }
  }

  // 8. Atualizar as páginas afetadas
  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.id}`);

  return {
    success: true,
  };
};
