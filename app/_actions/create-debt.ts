"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface CreateDebtParams {
  userId?: string;
  bookingId?: string;
  clientName?: string;
  clientPhone?: string;
  amount: number;
  description?: string;
}

export const createDebt = async ({
  userId,
  bookingId,
  clientName: inputClientName,
  clientPhone: inputClientPhone,
  amount,
  description,
}: CreateDebtParams) => {
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
  // VALIDAÇÃO DO VALOR
  // =====================================================

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor do fiado deve ser maior que zero.");
  }

  // =====================================================
  // DADOS DO CLIENTE
  // =====================================================

  let finalUserId: string | null = userId ?? null;

  let finalClientName: string | null = inputClientName?.trim() || null;

  let finalClientPhone: string | null = inputClientPhone?.trim() || null;

  // =====================================================
  // CLIENTE CADASTRADO
  // =====================================================

  if (userId) {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!user) {
      throw new Error("Cliente não encontrado.");
    }

    finalUserId = user.id;

    if (!finalClientName) {
      finalClientName = user.name ?? null;
    }
  }

  // =====================================================
  // AGENDAMENTO
  // =====================================================

  if (bookingId) {
    const booking = await db.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        userId: true,
        clientName: true,
        clientPhone: true,
      },
    });

    if (!booking) {
      throw new Error("Agendamento não encontrado.");
    }

    // ===================================================
    // VERIFICAR CONFLITO DE CLIENTE
    // ===================================================

    if (userId && booking.userId && booking.userId !== userId) {
      throw new Error("O agendamento não pertence ao cliente informado.");
    }

    // ===================================================
    // CLIENTE DO AGENDAMENTO
    // ===================================================

    if (booking.userId) {
      finalUserId = booking.userId;
    }

    if (booking.clientName) {
      finalClientName = booking.clientName;
    }

    if (booking.clientPhone) {
      finalClientPhone = booking.clientPhone;
    }

    // ===================================================
    // AGENDAMENTO MANUAL
    // ===================================================

    if (!booking.userId && !booking.clientName) {
      throw new Error("O agendamento manual não possui nome de cliente.");
    }
  }

  // =====================================================
  // VALIDAR CLIENTE MANUAL
  // =====================================================

  if (!finalUserId && !finalClientName) {
    throw new Error("Informe o nome do cliente manual.");
  }

  // =====================================================
  // CRIAR DÉBITO
  // =====================================================

  await db.customerDebt.create({
    data: {
      userId: finalUserId,
      bookingId: bookingId ?? null,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      amount,
      type: "DEBT",
      description: description?.trim() || null,
    },
  });

  // =====================================================
  // ATUALIZAR DASHBOARD
  // =====================================================

  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
  };
};
