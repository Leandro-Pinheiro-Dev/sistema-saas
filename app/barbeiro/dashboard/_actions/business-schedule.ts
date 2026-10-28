"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/prisma";
import { requireBusinessOwner } from "@/lib/permissions/membership";
import { requireBusinessStaff } from "@/lib/permissions/membership";

/**
 * Tipos da configuração da agenda.
 */
export interface BusinessScheduleDay {
  dayOfWeek: number;
  active: boolean;
  timeSlots: {
    time: string;
    active: boolean;
  }[];
}

export interface BusinessScheduleMonth {
  year: number;
  month: number;
  active: boolean;
}

/**
 * Verifica a autorização do proprietário para o estabelecimento.
 *
 * O ID recebido pelo servidor não é considerado prova de acesso:
 * requireBusinessOwner confirma a associação do usuário autenticado.
 */
async function authorizeBusinessOwner(barbershopId: string) {
  if (typeof barbershopId !== "string" || !barbershopId.trim()) {
    throw new Error("Estabelecimento inválido.");
  }

  return requireBusinessOwner(barbershopId);
}

/**
 * Atualiza as páginas relacionadas ao estabelecimento.
 */
function revalidateBusinessPaths(barbershopId: string) {
  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/barbershops");
  revalidatePath(`/barbershops/${barbershopId}`);
}

/**
 * Obtém a data atual no fuso horário de São Paulo.
 */
function getCurrentBusinessDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

/**
 * Garante os registros do mês atual e dos próximos 11 meses.
 *
 * O mês atual começa ativo. Os meses futuros começam inativos.
 * Registros existentes não têm seu status sobrescrito.
 */
async function ensureBusinessMonths(barbershopId: string) {
  const { year: currentYear, month: currentMonth } = getCurrentBusinessDate();

  for (let index = 0; index < 12; index++) {
    const date = new Date(Date.UTC(currentYear, currentMonth - 1 + index, 1));

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;

    await db.businessMonth.upsert({
      where: {
        barbershopId_year_month: {
          barbershopId,
          year,
          month,
        },
      },
      update: {},
      create: {
        barbershopId,
        year,
        month,
        active: index === 0,
      },
    });
  }
}
async function readBusinessSchedule(
  barbershopId: string,
): Promise<BusinessScheduleDay[]> {
  const days = await db.businessDay.findMany({
    where: { barbershopId },
    orderBy: { dayOfWeek: "asc" },
  });

  const timeSlots = await db.businessTimeSlot.findMany({
    where: { barbershopId },
    orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
  });

  return days.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    active: day.active,
    timeSlots: timeSlots
      .filter((slot) => slot.dayOfWeek === day.dayOfWeek)
      .map((slot) => ({
        time: slot.time,
        active: slot.active,
      })),
  }));
}

/** Consulta pública: somente leitura da disponibilidade. */
export async function getPublicBusinessSchedule(
  barbershopId: string,
): Promise<BusinessScheduleDay[]> {
  if (typeof barbershopId !== "string" || !barbershopId.trim()) {
    throw new Error("Estabelecimento inválido.");
  }

  const business = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("Estabelecimento não encontrado.");
  }

  return readBusinessSchedule(barbershopId);
}

/** Consulta interna: proprietário ou funcionário ativo. */
export async function getBusinessScheduleForStaff(
  barbershopId: string,
): Promise<BusinessScheduleDay[]> {
  await requireBusinessStaff(barbershopId);
  return readBusinessSchedule(barbershopId);
}
/**
 * Busca os dias e horários do estabelecimento autorizado.
 */
export async function getBusinessSchedule(
  barbershopId: string,
): Promise<BusinessScheduleDay[]> {
  await authorizeBusinessOwner(barbershopId);
  return readBusinessSchedule(barbershopId);
}

export async function getPublicBusinessMonths(
  barbershopId: string,
): Promise<BusinessScheduleMonth[]> {
  if (typeof barbershopId !== "string" || !barbershopId.trim()) {
    throw new Error("Estabelecimento inválido.");
  }

  const business = await db.barbershop.findUnique({
    where: { id: barbershopId },
    select: { id: true },
  });

  if (!business) {
    throw new Error("Estabelecimento não encontrado.");
  }

  const { year: currentYear, month: currentMonth } = getCurrentBusinessDate();

  const lastMonthDate = new Date(
    Date.UTC(currentYear, currentMonth - 1 + 11, 1),
  );

  const lastYear = lastMonthDate.getUTCFullYear();
  const lastMonth = lastMonthDate.getUTCMonth() + 1;

  const months = await db.businessMonth.findMany({
    where: {
      barbershopId,
      OR: [
        { year: { gt: currentYear } },
        { year: currentYear, month: { gte: currentMonth } },
      ],
      AND: [
        {
          OR: [
            { year: { lt: lastYear } },
            {
              year: lastYear,
              month: { lte: lastMonth },
            },
          ],
        },
      ],
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  return months.map((item) => ({
    year: item.year,
    month: item.month,
    active: item.active,
  }));
}

/**
 * Busca o mês atual e os próximos 11 meses.
 */
export async function getBusinessMonths(
  barbershopId: string,
): Promise<BusinessScheduleMonth[]> {
  await authorizeBusinessOwner(barbershopId);
  await ensureBusinessMonths(barbershopId);

  const { year: currentYear, month: currentMonth } = getCurrentBusinessDate();

  const lastMonthDate = new Date(
    Date.UTC(currentYear, currentMonth - 1 + 11, 1),
  );

  const lastYear = lastMonthDate.getUTCFullYear();
  const lastMonth = lastMonthDate.getUTCMonth() + 1;

  const months = await db.businessMonth.findMany({
    where: {
      barbershopId,
      OR: [
        { year: { gt: currentYear } },
        {
          year: currentYear,
          month: { gte: currentMonth },
        },
      ],
      AND: [
        {
          OR: [
            { year: { lt: lastYear } },
            {
              year: lastYear,
              month: { lte: lastMonth },
            },
          ],
        },
      ],
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  return months.map((month) => ({
    year: month.year,
    month: month.month,
    active: month.active,
  }));
}

/**
 * Abre ou fecha um dia da semana.
 *
 * 0 = domingo; 1 = segunda; ...; 6 = sábado.
 * Não cancela agendamentos nem altera horários fixos.
 */
export async function updateBusinessDay(
  barbershopId: string,
  dayOfWeek: number,
  active: boolean,
) {
  await authorizeBusinessOwner(barbershopId);

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("Dia da semana inválido.");
  }

  if (typeof active !== "boolean") {
    throw new Error("Status do dia inválido.");
  }

  const day = await db.businessDay.upsert({
    where: {
      barbershopId_dayOfWeek: {
        barbershopId,
        dayOfWeek,
      },
    },
    update: { active },
    create: {
      barbershopId,
      dayOfWeek,
      active,
    },
  });

  revalidateBusinessPaths(barbershopId);

  return {
    success: true,
    day: {
      dayOfWeek: day.dayOfWeek,
      active: day.active,
    },
  };
}

/**
 * Bloqueia ou libera um horário.
 * Não altera os horários fixos existentes.
 */
export async function updateBusinessTimeSlot(
  barbershopId: string,
  dayOfWeek: number,
  time: string,
  active: boolean,
) {
  await authorizeBusinessOwner(barbershopId);

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("Dia da semana inválido.");
  }

  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Horário inválido.");
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Horário inválido.");
  }

  if (typeof active !== "boolean") {
    throw new Error("Status do horário inválido.");
  }

  const slot = await db.businessTimeSlot.upsert({
    where: {
      barbershopId_dayOfWeek_time: {
        barbershopId,
        dayOfWeek,
        time,
      },
    },
    update: { active },
    create: {
      barbershopId,
      dayOfWeek,
      time,
      active,
    },
  });

  revalidateBusinessPaths(barbershopId);

  return {
    success: true,
    slot: {
      dayOfWeek: slot.dayOfWeek,
      time: slot.time,
      active: slot.active,
    },
  };
}

/**
 * Abre ou bloqueia um mês para novos agendamentos.
 *
 * Não cancela agendamentos existentes nem altera horários fixos.
 */
export async function updateBusinessMonth(
  barbershopId: string,
  year: number,
  month: number,
  active: boolean,
) {
  await authorizeBusinessOwner(barbershopId);

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("Ano inválido.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Mês inválido.");
  }

  if (typeof active !== "boolean") {
    throw new Error("Status do mês inválido.");
  }

  const { year: currentYear, month: currentMonth } = getCurrentBusinessDate();

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    throw new Error(
      "Não é possível alterar a disponibilidade de um mês passado.",
    );
  }

  const businessMonth = await db.businessMonth.upsert({
    where: {
      barbershopId_year_month: {
        barbershopId,
        year,
        month,
      },
    },
    update: { active },
    create: {
      barbershopId,
      year,
      month,
      active,
    },
  });

  revalidateBusinessPaths(barbershopId);

  return {
    success: true,
    month: {
      year: businessMonth.year,
      month: businessMonth.month,
      active: businessMonth.active,
    },
  };
}
