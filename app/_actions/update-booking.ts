"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface UpdateBookingParams {
  bookingId: string;
  userId?: string;
  serviceId: string;
  date: Date;
  clientName?: string;
  clientPhone?: string;
}

export const updateBooking = async ({
  bookingId,
  userId,
  serviceId,
  date,
  clientName,
  clientPhone,
}: UpdateBookingParams) => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // VERIFICAR BARBEIRO
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  // =====================================================
  // VALIDAR AGENDAMENTO
  // =====================================================

  const booking = await db.booking.findUnique({
    where: {
      id: bookingId,
    },
  });

  if (!booking) {
    throw new Error("Agendamento não encontrado.");
  }

  // =====================================================
  // VALIDAR SERVIÇO
  // =====================================================

  const service = await db.barbershopService.findUnique({
    where: {
      id: serviceId,
    },
  });

  if (!service) {
    throw new Error("Serviço não encontrado.");
  }

  // =====================================================
  // CLIENTE CADASTRADO
  // =====================================================

  if (userId) {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error("Cliente não encontrado.");
    }

    await db.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        userId,
        clientName: null,
        clientPhone: null,
        serviceId,
        date,
      },
    });
  }

  // =====================================================
  // CLIENTE MANUAL
  // =====================================================
  else {
    if (!clientName?.trim()) {
      throw new Error("Informe o nome do cliente.");
    }

    await db.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        userId: null,
        clientName: clientName.trim(),
        clientPhone: clientPhone?.trim() || null,
        serviceId,
        date,
      },
    });
  }

  // =====================================================
  // ATUALIZAR DASHBOARD
  // =====================================================

  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
  };
};
