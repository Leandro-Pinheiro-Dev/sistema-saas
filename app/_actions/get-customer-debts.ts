"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

export const getCustomerDebts = async () => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // AUTORIZAÇÃO
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  // =====================================================
  // BUSCAR TODOS OS FIADOS
  // =====================================================

  const debts = await db.customerDebt.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      booking: {
        include: {
          service: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  // =====================================================
  // NORMALIZAR
  // =====================================================

  return debts.map((debt) => ({
    id: debt.id,

    userId: debt.userId,

    bookingId: debt.bookingId,

    clientName: debt.clientName,

    clientPhone: debt.clientPhone,

    amount: Number(debt.amount),

    type: debt.type,

    description: debt.description,

    createdAt: debt.createdAt,

    user: debt.user,

    booking: debt.booking
      ? {
          id: debt.booking.id,

          userId: debt.booking.userId,

          serviceId: debt.booking.serviceId,

          date: debt.booking.date,

          clientName: debt.booking.clientName,

          clientPhone: debt.booking.clientPhone,

          service: {
            id: debt.booking.service.id,

            name: debt.booking.service.name,

            price: Number(debt.booking.service.price),
          },
        }
      : null,
  }));
};
