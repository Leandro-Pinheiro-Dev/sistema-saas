"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface CompleteBookingParams {
  bookingId: string;
  paymentType: "PAID" | "DEBT";
}

export const completeBooking = async ({
  bookingId,
  paymentType,
}: CompleteBookingParams) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (paymentType !== "PAID" && paymentType !== "DEBT") {
    throw new Error("Tipo de pagamento inválido.");
  }

  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        bookingItems: {
          include: { service: true },
        },
        barbershop: {
          select: { id: true },
        },
      },
    });

    if (!booking) {
      throw new Error("Agendamento não encontrado.");
    }

    // Confirma que o usuário pertence à empresa do agendamento.
    const membership = await tx.membership.findFirst({
      where: {
        userId: session.user.id,
        barbershopId: booking.barbershopId,
        active: true,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!membership) {
      throw new Error("Você não tem acesso a esta empresa.");
    }

    // Funcionários só podem concluir os próprios agendamentos.
    if (
      membership.role === "BARBER" &&
      booking.barberMembershipId !== membership.id
    ) {
      throw new Error("Você só pode concluir os seus próprios agendamentos.");
    }

    if (booking.status === "COMPLETED") {
      throw new Error("Este agendamento já foi concluído.");
    }

    if (booking.status === "CANCELLED") {
      throw new Error("Não é possível concluir um agendamento cancelado.");
    }

    const bookingTotal = Number(booking.total);

    if (!Number.isFinite(bookingTotal) || bookingTotal <= 0) {
      throw new Error("O valor do agendamento é inválido.");
    }

    const updatedBooking = await tx.booking.updateMany({
      where: {
        id: bookingId,
        barbershopId: booking.barbershopId,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
      data: {
        status: "COMPLETED",
      },
    });

    if (updatedBooking.count === 0) {
      throw new Error(
        "O agendamento já foi alterado ou não pode ser concluído.",
      );
    }

    const servicesDescription =
      booking.bookingItems.length > 0
        ? booking.bookingItems.map((item) => item.service.name).join(", ")
        : booking.service.name;

    if (paymentType === "DEBT") {
      const debt = await tx.customerDebt.create({
        data: {
          userId: booking.userId,
          bookingId: booking.id,
          barbershopId: booking.barbershopId,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          amount: bookingTotal,
          type: "DEBT",
          description: `Fiado - ${servicesDescription}`,
        },
      });

      // A movimentação financeira fica vinculada ao fiado.
      await tx.financialTransaction.create({
        data: {
          barbershopId: booking.barbershopId,
          bookingId: booking.id,
          customerDebtId: debt.id,
          amount: bookingTotal,
          type: "SERVICE_PAYMENT",
          description: `Serviço a receber - ${servicesDescription}`,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
        },
      });
    }

    if (paymentType === "PAID") {
      await tx.financialTransaction.create({
        data: {
          barbershopId: booking.barbershopId,
          bookingId: booking.id,
          amount: bookingTotal,
          type: "SERVICE_PAYMENT",
          description: `Pagamento - ${servicesDescription}`,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
        },
      });
    }
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/");

  return { success: true };
};
