"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const deleteBooking = async (bookingId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (!bookingId?.trim()) {
    throw new Error("Agendamento inválido.");
  }

  const booking = await db.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: {
      id: true,
      barbershopId: true,
      barberMembershipId: true,
    },
  });

  if (!booking) {
    throw new Error("Agendamento não encontrado.");
  }

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
    throw new Error("Você não tem permissão para excluir este agendamento.");
  }

  if (
    membership.role === "BARBER" &&
    booking.barberMembershipId !== membership.id
  ) {
    throw new Error("Você só pode excluir os seus próprios agendamentos.");
  }

  await db.booking.delete({
    where: {
      id: booking.id,
    },
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/bookings");
  revalidatePath("/");

  return {
    success: true,
  };
};
