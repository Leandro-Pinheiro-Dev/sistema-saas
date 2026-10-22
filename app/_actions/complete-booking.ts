"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/prisma";

interface CompleteBookingParams {
  bookingId: string;
  paymentType: "PAID" | "DEBT";
}

export const completeBooking = async ({
  bookingId,
  paymentType,
}: CompleteBookingParams) => {
  // =====================================================
  // VERIFICAR LOGIN
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // SOMENTE BARBEIRO PODE CONCLUIR
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  // =====================================================
  // TRANSAÇÃO
  // =====================================================

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // Buscar agendamento completo
    const booking = await tx.booking.findUnique({
      where: {
        id: bookingId,
      },

      include: {
        service: true,
        bookingItems: {
          include: {
            service: true,
          },
        },
      },
    });

    // =====================================================
    // AGENDAMENTO NÃO EXISTE
    // =====================================================

    if (!booking) {
      throw new Error("Agendamento não encontrado.");
    }

    // =====================================================
    // JÁ FOI CONCLUÍDO
    // =====================================================

    if (booking.status === "COMPLETED") {
      throw new Error("Este agendamento já foi concluído.");
    }

    // =====================================================
    // VALOR OFICIAL DO AGENDAMENTO
    //
    // IMPORTANTE:
    // Usamos booking.total porque ele já considera:
    //
    // - todos os serviços
    // - subtotal
    // - desconto
    //
    // Não usamos booking.service.price.
    // =====================================================

    const bookingTotal = Number(booking.total);

    // =====================================================
    // MARCAR AGENDAMENTO COMO CONCLUÍDO
    // =====================================================

    const updatedBooking = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: {
          not: "COMPLETED",
        },
      },

      data: {
        status: "COMPLETED",
      },
    });

    if (updatedBooking.count === 0) {
      throw new Error("Este agendamento já foi concluído.");
    }

    // =====================================================
    // FIADO
    // =====================================================

    if (paymentType === "DEBT") {
      await tx.customerDebt.create({
        data: {
          userId: booking.userId,
          bookingId: booking.id,

          clientName: booking.clientName,
          clientPhone: booking.clientPhone,

          // Valor REAL do agendamento
          // já com desconto.
          amount: bookingTotal,

          type: "DEBT",

          description: `Fiado - ${
            booking.bookingItems.length > 0
              ? booking.bookingItems.map((item) => item.service.name).join(", ")
              : booking.service.name
          }`,
        },
      });
    }

    // =====================================================
    // PAGAMENTO
    // =====================================================

    if (paymentType === "PAID") {
      await tx.financialTransaction.create({
        data: {
          // Valor REAL do agendamento
          // já considerando desconto.
          amount: bookingTotal,

          type: "SERVICE_PAYMENT",

          description: `Pagamento - ${
            booking.bookingItems.length > 0
              ? booking.bookingItems.map((item) => item.service.name).join(", ")
              : booking.service.name
          }`,

          bookingId: booking.id,

          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
        },
      });
    }
  });

  // =====================================================
  // ATUALIZAR PÁGINAS
  // =====================================================

  revalidatePath("/barbeiro/dashboard");

  // Importante:
  // faz o cliente enxergar o agendamento como
  // COMPLETED na área "Finalizados".
  revalidatePath("/bookings");

  revalidatePath("/");

  return {
    success: true,
  };
};
