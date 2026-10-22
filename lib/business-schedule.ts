import { db } from "@/lib/prisma";

// =====================================================
// VALIDAR DIA E HORÁRIO DA AGENDA
// =====================================================
//
// Esta função verifica a configuração atual da agenda
// diretamente no banco.
//
// IMPORTANTE:
// - Não cancela agendamentos existentes.
// - Não altera FixedSchedule.
// - Apenas impede NOVOS agendamentos em dias/horários
//   que estejam fechados ou bloqueados.
//
// =====================================================

export async function validateBusinessSchedule({
  barbershopId,
  dayOfWeek,
  time,
}: {
  barbershopId: string;
  dayOfWeek: number;
  time: string;
}) {
  // ===================================================
  // VALIDAR DIA
  // ===================================================

  const businessDay = await db.businessDay.findUnique({
    where: {
      barbershopId_dayOfWeek: {
        barbershopId,
        dayOfWeek,
      },
    },
  });

  // Se não existir configuração, consideramos fechado.
  //
  // Isso é mais seguro do que permitir um horário que
  // ainda não foi configurado.

  if (!businessDay) {
    throw new Error(
      "Este dia não está configurado para atendimento.",
    );
  }

  if (!businessDay.active) {
    throw new Error(
      "A barbearia está fechada neste dia.",
    );
  }

  // ===================================================
  // VALIDAR HORÁRIO
  // ===================================================

  const businessTimeSlot = await db.businessTimeSlot.findUnique({
    where: {
      barbershopId_dayOfWeek_time: {
        barbershopId,
        dayOfWeek,
        time,
      },
    },
  });

  // Se não existir configuração para o horário,
  // também consideramos indisponível.

  if (!businessTimeSlot) {
    throw new Error(
      "Este horário não está configurado para atendimento.",
    );
  }

  if (!businessTimeSlot.active) {
    throw new Error(
      "Este horário está bloqueado para novos agendamentos.",
    );
  }

  return {
    success: true,
    dayOfWeek,
    time,
  };
}
