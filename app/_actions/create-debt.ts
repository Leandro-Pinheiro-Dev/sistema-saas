"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { requireBusinessStaff } from "@/lib/permissions/membership";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface CreateDebtParams {
  barbershopId: string;
  userId?: string;
  bookingId?: string;
  clientName?: string;
  clientPhone?: string;
  amount: number;
  description?: string;
}

export const createDebt = async ({
  barbershopId,
  userId,
  bookingId,
  clientName: inputClientName,
  clientPhone: inputClientPhone,
  amount,
  description,
}: CreateDebtParams) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor do fiado deve ser maior que zero.");
  }
  await requireBusinessStaff(barbershopId);
  let finalUserId: string | null = userId ?? null;
  let finalClientName: string | null = inputClientName?.trim() || null;
  let finalClientPhone: string | null = inputClientPhone?.trim() || null;

  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new Error("Cliente não encontrado.");
    }

    finalUserId = user.id;
    finalClientName ??= user.name;
  }

  if (bookingId) {
    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        barbershopId,
      },
      select: {
        id: true,
        userId: true,
        clientName: true,
        clientPhone: true,
      },
    });

    if (!booking) {
      throw new Error("Agendamento não encontrado nesta empresa.");
    }

    if (userId && booking.userId && booking.userId !== userId) {
      throw new Error("O agendamento não pertence ao cliente informado.");
    }

    if (booking.userId) {
      finalUserId = booking.userId;
    }

    if (booking.clientName) {
      finalClientName = booking.clientName;
    }

    if (booking.clientPhone) {
      finalClientPhone = booking.clientPhone;
    }

    if (!booking.userId && !booking.clientName) {
      throw new Error("O agendamento manual não possui nome de cliente.");
    }
  }

  if (!finalUserId && !finalClientName) {
    throw new Error("Informe o nome do cliente manual.");
  }

  await db.customerDebt.create({
    data: {
      barbershopId,
      userId: finalUserId,
      bookingId: bookingId ?? null,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      amount,
      type: "DEBT",
      description: description?.trim() || null,
    },
  });

  revalidatePath("/barbeiro/dashboard");

  return { success: true };
};
