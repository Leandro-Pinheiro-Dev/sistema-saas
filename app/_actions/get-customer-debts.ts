"use server";

import { db } from "@/lib/prisma";
import { requireBusinessStaff } from "@/lib/permissions/membership";

export const getCustomerDebts = async (barbershopId: string) => {
  // =====================================================
  // VALIDAR ESTABELECIMENTO E AUTORIZAÇÃO
  // =====================================================

  if (!barbershopId?.trim()) {
    throw new Error("Estabelecimento não informado.");
  }

  await requireBusinessStaff(barbershopId);

  // =====================================================
  // BUSCAR SOMENTE OS FIADOS DO ESTABELECIMENTO
  // =====================================================

  const debts = await db.customerDebt.findMany({
    where: {
      barbershopId,
    },

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
  // NORMALIZAR DADOS PARA O FRONTEND
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
