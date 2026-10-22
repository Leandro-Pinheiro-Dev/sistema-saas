"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// =====================================================
// VERIFICAR SE O USUÁRIO É BARBEIRO
// =====================================================

async function requireBarber() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error("Não autenticado.");
  }

  const user = await db.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  if (user.role !== "BARBER") {
    throw new Error("Acesso permitido apenas para barbeiros.");
  }

  return user;
}

// =====================================================
// BUSCAR BARBEARIA
// =====================================================

async function getBarbershop() {
  const barbershop = await db.barbershop.findFirst({
    select: {
      id: true,
    },
  });

  if (!barbershop) {
    throw new Error("Barbearia não encontrada.");
  }

  return barbershop;
}

// =====================================================
// VALIDAR DATA
// =====================================================

function validateDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida.");
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Data inválida.");
  }

  return parsed;
}

// =====================================================
// VALIDAR HORÁRIO
// =====================================================

function validateTime(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Horário inválido.");
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Horário inválido.");
  }
}

// =====================================================
// LIBERAR HORÁRIO FIXO PARA UMA DATA
// =====================================================

export async function releaseFixedSchedule({
  date,
  time,
}: {
  date: string;
  time: string;
}) {
  await requireBarber();

  const dateValue = validateDate(date);

  validateTime(time);

  const barbershop = await getBarbershop();

  // Domingo = 0
  // Segunda = 1
  // ...
  // Sexta = 5
  // Sábado = 6
  const dayOfWeek = dateValue.getUTCDay();

  // Verifica se realmente existe um cliente fixo
  // naquele dia da semana e horário.
  const fixedSchedule = await db.fixedSchedule.findFirst({
    where: {
      barbershopId: barbershop.id,
      dayOfWeek,
      time,
      active: true,
    },
  });

  if (!fixedSchedule) {
    throw new Error("Não existe cliente fixo neste dia e horário.");
  }

  // Cria a exceção somente para esta data.
  //
  // O FixedSchedule continua existindo normalmente.
  // Portanto, na próxima semana o horário volta
  // automaticamente a ser reservado.
  const exception = await db.fixedScheduleException.upsert({
    where: {
      barbershopId_date_time: {
        barbershopId: barbershop.id,
        date: dateValue,
        time,
      },
    },

    update: {},

    create: {
      barbershopId: barbershop.id,
      date: dateValue,
      time,
    },
  });

  // Atualizar páginas que exibem disponibilidade.
  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/barbershops");
  revalidatePath(`/barbershops/${barbershop.id}`);

  return {
    success: true,
    exception: {
      id: exception.id,
      date,
      time,
    },
  };
}

// =====================================================
// BLOQUEAR NOVAMENTE O HORÁRIO FIXO
// =====================================================

export async function restoreFixedSchedule({
  date,
  time,
}: {
  date: string;
  time: string;
}) {
  await requireBarber();

  const dateValue = validateDate(date);

  validateTime(time);

  const barbershop = await getBarbershop();

  // Remove somente a exceção daquela data.
  //
  // O cliente fixo não é apagado.
  // O horário volta a ser reservado normalmente.
  await db.fixedScheduleException.deleteMany({
    where: {
      barbershopId: barbershop.id,
      date: dateValue,
      time,
    },
  });

  // Atualizar páginas.
  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/barbershops");
  revalidatePath(`/barbershops/${barbershop.id}`);

  return {
    success: true,
    date,
    time,
  };
}
