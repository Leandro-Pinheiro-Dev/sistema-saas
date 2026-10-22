"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

/**
 * ============================================================
 * TIPOS
 * ============================================================
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
 * ============================================================
 * VERIFICAR SE O USUÁRIO É BARBEIRO
 * ============================================================
 */

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

/**
 * ============================================================
 * BUSCAR BARBEARIA
 * ============================================================
 *
 * O projeto atualmente trabalha com uma única barbearia.
 *
 * Buscamos pelo primeiro registro para não deixar um ID fixo
 * espalhado pelo código.
 */

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

/**
 * ============================================================
 * DATA ATUAL NO FUSO DA BARBEARIA
 * ============================================================
 *
 * A aplicação trabalha com o horário de São Paulo.
 *
 * Não usamos simplesmente:
 *
 * new Date().getFullYear()
 * new Date().getMonth()
 *
 * porque o servidor da Vercel pode trabalhar em UTC.
 *
 * Exemplo:
 * 23:30 em São Paulo pode já ser 02:30 do dia seguinte em UTC.
 *
 * Por isso usamos Intl com America/Sao_Paulo.
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

  return {
    year,
    month,
    day,
  };
}

/**
 * ============================================================
 * GARANTIR MESES DA AGENDA
 * ============================================================
 *
 * Mantém disponíveis para configuração:
 *
 * - mês atual
 * - próximos 11 meses
 *
 * Total:
 *
 * 12 meses.
 *
 * Regra inicial:
 *
 * - mês atual = LIBERADO
 * - meses futuros = BLOQUEADOS
 *
 * IMPORTANTE:
 *
 * Se o registro já existir, o status NÃO é alterado.
 *
 * Isso permite que o barbeiro faça sua própria configuração
 * sem que uma nova consulta sobrescreva as escolhas.
 */

async function ensureBusinessMonths(barbershopId: string) {
  const { year: currentYear, month: currentMonth } = getCurrentBusinessDate();

  for (let index = 0; index < 12; index++) {
    /**
     * Criamos uma data baseada no primeiro dia do mês atual.
     *
     * Como estamos trabalhando somente com ano/mês,
     * isso evita problemas relacionados ao dia atual.
     */
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

      /**
       * Registro existente:
       *
       * NÃO modifica active.
       */
      update: {},

      /**
       * Registro novo:
       *
       * Somente o mês atual começa liberado.
       */
      create: {
        barbershopId,
        year,
        month,
        active: index === 0,
      },
    });
  }
}

/**
 * ============================================================
 * BUSCAR CONFIGURAÇÃO DOS DIAS E HORÁRIOS
 * ============================================================
 *
 * Retorna:
 *
 * Dia
 *   └── horários
 *
 * Exemplo:
 *
 * Terça
 *   08:00 ativo
 *   09:00 ativo
 *   10:00 bloqueado
 */

export async function getBusinessSchedule(): Promise<BusinessScheduleDay[]> {
  const barbershop = await getBarbershop();

  const days = await db.businessDay.findMany({
    where: {
      barbershopId: barbershop.id,
    },

    orderBy: {
      dayOfWeek: "asc",
    },
  });

  const timeSlots = await db.businessTimeSlot.findMany({
    where: {
      barbershopId: barbershop.id,
    },

    orderBy: [
      {
        dayOfWeek: "asc",
      },
      {
        time: "asc",
      },
    ],
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

/**
 * ============================================================
 * BUSCAR MESES DA AGENDA
 * ============================================================
 *
 * Retorna:
 *
 * - mês atual
 * - próximos 11 meses
 *
 * Caso algum mês ainda não exista no banco,
 * ele será criado automaticamente.
 */

export async function getBusinessMonths(): Promise<BusinessScheduleMonth[]> {
  const barbershop = await getBarbershop();

  await ensureBusinessMonths(barbershop.id);

  const { year: currentYear, month: currentMonth } = getCurrentBusinessDate();

  /**
   * Calculamos o limite dos 12 meses.
   *
   * Isso evita que registros antigos eventualmente existentes
   * sejam retornados para a interface.
   */
  const lastMonthDate = new Date(
    Date.UTC(currentYear, currentMonth - 1 + 11, 1),
  );

  const lastYear = lastMonthDate.getUTCFullYear();
  const lastMonth = lastMonthDate.getUTCMonth() + 1;

  const months = await db.businessMonth.findMany({
    where: {
      barbershopId: barbershop.id,

      OR: [
        {
          year: {
            gt: currentYear,
          },
        },
        {
          year: currentYear,
          month: {
            gte: currentMonth,
          },
        },
      ],

      /**
       * Limita também ao último mês do período.
       */
      AND: [
        {
          OR: [
            {
              year: {
                lt: lastYear,
              },
            },
            {
              year: lastYear,
              month: {
                lte: lastMonth,
              },
            },
          ],
        },
      ],
    },

    orderBy: [
      {
        year: "asc",
      },
      {
        month: "asc",
      },
    ],
  });

  return months.map((month) => ({
    year: month.year,
    month: month.month,
    active: month.active,
  }));
}

/**
 * ============================================================
 * ABRIR / FECHAR DIA
 * ============================================================
 *
 * dayOfWeek:
 *
 * 0 = Domingo
 * 1 = Segunda
 * 2 = Terça
 * 3 = Quarta
 * 4 = Quinta
 * 5 = Sexta
 * 6 = Sábado
 *
 * IMPORTANTE:
 *
 * Esta operação:
 *
 * - NÃO altera FixedSchedule;
 * - NÃO cancela agendamentos existentes;
 * - apenas controla novos agendamentos de clientes.
 */

export async function updateBusinessDay(dayOfWeek: number, active: boolean) {
  await requireBarber();

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("Dia da semana inválido.");
  }

  if (typeof active !== "boolean") {
    throw new Error("Status do dia inválido.");
  }

  const barbershop = await getBarbershop();

  const day = await db.businessDay.upsert({
    where: {
      barbershopId_dayOfWeek: {
        barbershopId: barbershop.id,
        dayOfWeek,
      },
    },

    update: {
      active,
    },

    create: {
      barbershopId: barbershop.id,
      dayOfWeek,
      active,
    },
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/barbershops");
  revalidatePath(`/barbershops/${barbershop.id}`);

  return {
    success: true,

    day: {
      dayOfWeek: day.dayOfWeek,
      active: day.active,
    },
  };
}

/**
 * ============================================================
 * BLOQUEAR / LIBERAR HORÁRIO
 * ============================================================
 *
 * Exemplo:
 *
 * updateBusinessTimeSlot(5, "15:00", false)
 *
 * Bloqueia sexta-feira às 15:00.
 *
 * IMPORTANTE:
 *
 * FixedSchedule continua intacto.
 */

export async function updateBusinessTimeSlot(
  dayOfWeek: number,
  time: string,
  active: boolean,
) {
  await requireBarber();

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

  const barbershop = await getBarbershop();

  const slot = await db.businessTimeSlot.upsert({
    where: {
      barbershopId_dayOfWeek_time: {
        barbershopId: barbershop.id,
        dayOfWeek,
        time,
      },
    },

    update: {
      active,
    },

    create: {
      barbershopId: barbershop.id,
      dayOfWeek,
      time,
      active,
    },
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/barbershops");
  revalidatePath(`/barbershops/${barbershop.id}`);

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
 * ============================================================
 * BLOQUEAR / LIBERAR MÊS
 * ============================================================
 *
 * Hierarquia da disponibilidade:
 *
 * MÊS
 *   ↓
 * DIA DA SEMANA
 *   ↓
 * HORÁRIO
 *   ↓
 * DISPONIBILIDADE
 *
 * Para o cliente conseguir agendar:
 *
 * 1. O mês precisa estar liberado;
 * 2. O dia da semana precisa estar ativo;
 * 3. O horário precisa estar ativo;
 * 4. Não pode existir outro bloqueio/agendamento.
 *
 * IMPORTANTE:
 *
 * Bloquear um mês:
 *
 * - NÃO cancela agendamentos existentes;
 * - NÃO altera FixedSchedule;
 * - NÃO impede o barbeiro de fazer agendamento manual.
 */

export async function updateBusinessMonth(
  year: number,
  month: number,
  active: boolean,
) {
  await requireBarber();

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("Ano inválido.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Mês inválido.");
  }

  if (typeof active !== "boolean") {
    throw new Error("Status do mês inválido.");
  }

  const barbershop = await getBarbershop();

  /**
   * Obtém o mês atual no horário de São Paulo.
   */
  const { year: currentYear, month: currentMonth } = getCurrentBusinessDate();

  /**
   * Não permite modificar meses que já passaram.
   */
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    throw new Error(
      "Não é possível alterar a disponibilidade de um mês passado.",
    );
  }

  const businessMonth = await db.businessMonth.upsert({
    where: {
      barbershopId_year_month: {
        barbershopId: barbershop.id,
        year,
        month,
      },
    },

    update: {
      active,
    },

    create: {
      barbershopId: barbershop.id,
      year,
      month,
      active,
    },
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath("/barbershops");
  revalidatePath(`/barbershops/${barbershop.id}`);

  return {
    success: true,

    month: {
      year: businessMonth.year,
      month: businessMonth.month,
      active: businessMonth.active,
    },
  };
}
