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
  // =====================================================
  // 1. VERIFICAR LOGIN
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // 2. VERIFICAR SE É BARBEIRO
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  // =====================================================
  // 3. BUSCAR AGENDAMENTO
  // =====================================================

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

  // =====================================================
  // 4. ATUALIZAR STATUS
  // =====================================================

  await db.booking.update({
    where: {
      id: bookingId,
    },
    data: {
      status,
    },
  });

  // =====================================================
  // 5. ENVIAR PUSH QUANDO O BARBEIRO CONFIRMAR
  // =====================================================

  if (status === "CONFIRMED" && booking.userId) {
    try {
      // Buscar todos os dispositivos cadastrados do cliente.
      const subscriptions = await db.pushSubscription.findMany({
        where: {
          userId: booking.userId,
        },
      });

      // Nome do serviço.
      const services =
        booking.bookingItems.length > 0
          ? booking.bookingItems.map((item) => item.service.name)
          : [booking.service.name];

      const servicesText = services.join(" + ");

      // Data formatada no horário de São Paulo.
      const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(booking.date);

      // Enviar para todos os dispositivos do cliente.
      for (const subscription of subscriptions) {
        try {
          await sendPushNotification(subscription, {
            title: "Agendamento confirmado! ✂️",
            body: `Seu agendamento de ${servicesText} foi confirmado para ${formattedDate} às ${booking.date.toLocaleTimeString(
              "pt-BR",
              {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              },
            )}.`,
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

          // =================================================
          // REMOVER ASSINATURA EXPIRADA
          // =================================================

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
      // O agendamento já foi confirmado.
      // Se o Push falhar, não devemos desfazer a confirmação.
      console.error("Erro geral ao enviar notificação de confirmação:", error);
    }
  }

  // =====================================================
  // 6. ATUALIZAR CACHE
  // =====================================================

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.id}`);

  return {
    success: true,
  };
};
