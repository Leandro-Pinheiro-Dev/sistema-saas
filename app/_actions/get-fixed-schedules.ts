"use server";

import { db } from "@/lib/prisma";

interface GetFixedSchedulesParams {
  barbershopId: string;
  date: string;
}

export const getFixedSchedules = async ({
  barbershopId,
  date,
}: GetFixedSchedulesParams) => {
  // Validar a data recebida
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida.");
  }

  const [year, month, day] = date.split("-").map(Number);

  // Data em UTC para evitar problemas de fuso horário
  const dateValue = new Date(Date.UTC(year, month - 1, day));

  if (
    dateValue.getUTCFullYear() !== year ||
    dateValue.getUTCMonth() !== month - 1 ||
    dateValue.getUTCDate() !== day
  ) {
    throw new Error("Data inválida.");
  }

  // Descobrir o dia da semana da data selecionada
  const dayOfWeek = dateValue.getUTCDay();

  // Buscar os horários fixos daquele dia da semana
  const fixedSchedules = await db.fixedSchedule.findMany({
    where: {
      barbershopId,
      dayOfWeek,
      active: true,
    },
    select: {
      time: true,
      clientName: true,
    },
    orderBy: {
      time: "asc",
    },
  });

  // Buscar exceções para a data específica
  const exceptions = await db.fixedScheduleException.findMany({
    where: {
      barbershopId,
      date: dateValue,
    },
    select: {
      time: true,
    },
  });

  // Horários liberados pelo barbeiro
  const releasedTimes = new Set(exceptions.map((exception) => exception.time));

  // Retornar somente os horários fixos que NÃO foram liberados
  return fixedSchedules.filter((schedule) => !releasedTimes.has(schedule.time));
};
