"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const deleteBooking = async (bookingId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado.");
  }

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso negado.");
  }

  if (!bookingId) {
    throw new Error("Agendamento inválido.");
  }

  await db.booking.delete({
    where: {
      id: bookingId,
    },
  });

  return {
    success: true,
  };
};
