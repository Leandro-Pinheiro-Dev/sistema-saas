"use server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { calculateBookingDiscount } from "@/app/utils/booking-discount";
import {
  getPricedBookingServices,
  isHaircutService,
} from "@/app/utils/booking-pricing";
import { validateBusinessSchedule } from "@/lib/business-schedule";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

interface CreateBookingByBarberParams {
  // =====================================================
  // SERVIÇOS
  // =====================================================

  serviceIds: string[];

  // =====================================================
  // DATA E HORÁRIO
  // =====================================================

  date: string;
  time: string;

  // =====================================================
  // CLIENTE
  // =====================================================

  userId?: string;
  clientName?: string;
  clientPhone?: string;

  // =====================================================
  // CORTE INFANTIL
  // =====================================================

  isChild?: boolean;
}

export const createBookingByBarber = async ({
  serviceIds,
  date,
  time,
  userId,
  clientName,
  clientPhone,
  isChild = false,
}: CreateBookingByBarberParams) => {
  // =====================================================
  // 1. AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // 2. SOMENTE BARBEIRO PODE CRIAR PELO PAINEL
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Apenas o barbeiro pode criar agendamentos.");
  }

  // =====================================================
  // 3. VALIDAR SERVIÇOS
  // =====================================================

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new Error("Selecione pelo menos um serviço.");
  }

  // Remove serviços duplicados.
  const uniqueServiceIds = [...new Set(serviceIds)];

  // =====================================================
  // 4. VALIDAR DATA
  // =====================================================

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida.");
  }

  // =====================================================
  // 5. VALIDAR HORÁRIO
  // =====================================================

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Horário inválido.");
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("Horário inválido.");
  }

  // =====================================================
  // 6. DESCOBRIR O DIA DA SEMANA
  // =====================================================

  // Usamos UTC ao meio-dia somente para descobrir
  // corretamente o dia da semana da DATA CIVIL.
  //
  // Domingo = 0
  // Segunda = 1
  // Terça = 2
  // Quarta = 3
  // Quinta = 4
  // Sexta = 5
  // Sábado = 6

  const [year, month, day] = date.split("-").map(Number);

  const dateForDayOfWeek = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (Number.isNaN(dateForDayOfWeek.getTime())) {
    throw new Error("Data inválida.");
  }

  const dayOfWeek = dateForDayOfWeek.getUTCDay();

  // =====================================================
  // 7. BUSCAR TODOS OS SERVIÇOS
  // =====================================================

  const services = await db.barbershopService.findMany({
    where: {
      id: {
        in: uniqueServiceIds,
      },
    },
  });

  // Verifica se todos os serviços existem.
  if (services.length !== uniqueServiceIds.length) {
    throw new Error("Um ou mais serviços não foram encontrados.");
  }

  // =====================================================
  // 8. GARANTIR QUE TODOS PERTENCEM À MESMA BARBEARIA
  // =====================================================

  const barbershopId = services[0].barbershopId;

  const allFromSameBarbershop = services.every(
    (service) => service.barbershopId === barbershopId,
  );

  if (!allFromSameBarbershop) {
    throw new Error(
      "Os serviços selecionados pertencem a barbearias diferentes.",
    );
  }

  // =====================================================
  // 9. VALIDAR CORTE INFANTIL
  // =====================================================

  // O preço infantil só pode ser usado quando existe
  // Corte de Cabelo entre os serviços selecionados.

  const hasHaircut = services.some((service) => isHaircutService(service.name));

  if (isChild && !hasHaircut) {
    throw new Error(
      "O preço infantil só pode ser aplicado ao Corte de Cabelo.",
    );
  }

  // =====================================================
  // 10. VALIDAR AGENDA DA BARBEARIA
  // =====================================================

  await validateBusinessSchedule({
    barbershopId,
    dayOfWeek,
    time,
  });

  // =====================================================
  // 11. CALCULAR PREÇOS DOS SERVIÇOS
  // =====================================================

  // Preço normal:
  //
  // Corte de Cabelo = R$35
  //
  // Preço infantil:
  //
  // Corte de Cabelo = R$30
  //
  // Os demais serviços continuam com seus preços normais.

  const pricedServices = getPricedBookingServices(
    services.map((service) => ({
      id: service.id,
      name: service.name,
      price: Number(service.price),
    })),
    isChild,
  );

  // =====================================================
  // 12. CALCULAR DESCONTO DOS COMBOS
  // =====================================================

  // O desconto é aplicado DEPOIS do preço infantil.
  //
  // Exemplo:
  //
  // Corte infantil + Barba
  //
  // R$30 + R$35 = R$65
  //
  // Combo Corte + Barba = -R$10
  //
  // Total = R$55

  const discountResult = calculateBookingDiscount(
    pricedServices.map((service) => ({
      name: service.name,
      price: service.price,
    })),
  );

  // =====================================================
  // 13. DEFINIR TIPO DE CLIENTE
  // =====================================================

  const hasRegisteredClient = Boolean(userId);

  const hasManualClient = Boolean(clientName?.trim());

  if (!hasRegisteredClient && !hasManualClient) {
    throw new Error("Selecione um cliente ou informe o cliente manualmente.");
  }

  if (hasRegisteredClient && hasManualClient) {
    throw new Error("Escolha apenas um tipo de cliente: cadastrado ou manual.");
  }

  // =====================================================
  // 14. CLIENTE CADASTRADO
  // =====================================================

  if (userId) {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error("Cliente cadastrado não encontrado.");
    }
  }

  // =====================================================
  // 15. CLIENTE MANUAL
  // =====================================================

  const normalizedClientName = clientName?.trim() || null;

  const normalizedClientPhone = clientPhone?.trim() || null;

  if (hasManualClient && !normalizedClientName) {
    throw new Error("Informe o nome do cliente.");
  }

  // =====================================================
  // 16. CRIAR DATA COMPLETA
  // =====================================================

  // A data é criada explicitamente no horário de São Paulo.
  //
  // Exemplo:
  //
  // 2026-09-18 + 10:00
  //
  // vira:
  //
  // 18/09/2026 às 10:00 em São Paulo.

  const bookingDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================
  // 17. VERIFICAR HORÁRIO FIXO
  // =====================================================

  const fixedSchedule = await db.fixedSchedule.findFirst({
    where: {
      barbershopId,
      dayOfWeek,
      time,
      active: true,
    },
  });

  if (fixedSchedule) {
    throw new Error(
      `Este horário já está reservado para ${fixedSchedule.clientName}.`,
    );
  }

  // =====================================================
  // 18. VERIFICAR OUTRO AGENDAMENTO
  // =====================================================

  const slotStart = new Date(bookingDate);

  slotStart.setSeconds(0, 0);

  const slotEnd = new Date(slotStart);

  slotEnd.setMinutes(slotEnd.getMinutes() + 1);

  const existingBooking = await db.booking.findFirst({
    where: {
      date: {
        gte: slotStart,
        lt: slotEnd,
      },
      status: {
        not: "CANCELLED",
      },
    },
  });

  if (existingBooking) {
    const existingClient = existingBooking.clientName || "outro cliente";

    throw new Error(`Este horário já está agendado para ${existingClient}.`);
  }

  // =====================================================
  // 19. CRIAR AGENDAMENTO
  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: userId || null,

      clientName: normalizedClientName,

      clientPhone: normalizedClientPhone,

      // Mantemos o primeiro serviço no campo legado.
      serviceId: uniqueServiceIds[0],

      date: bookingDate,

      status: "PENDING",

      // =================================================
      // VALORES FINANCEIROS
      // =================================================

      subtotal: discountResult.subtotal,

      discount: discountResult.discount,

      total: discountResult.total,

      // =================================================
      // TODOS OS SERVIÇOS
      // =================================================

      bookingItems: {
        create: pricedServices.map((service) => ({
          serviceId: service.id,

          // Guarda o preço REAL cobrado no momento
          // da criação do agendamento.
          //
          // Corte normal:
          // R$35
          //
          // Corte infantil:
          // R$30

          price: service.price,
        })),
      },
    },
  });

  // =====================================================
  // 20. ATUALIZAR PÁGINAS
  // =====================================================

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/barbeiro/dashboard");

  // =====================================================
  // 21. RETORNAR RESULTADO
  // =====================================================

  return {
    success: true,

    bookingId: booking.id,

    subtotal: discountResult.subtotal,

    discount: discountResult.discount,

    total: discountResult.total,

    discountDescription: discountResult.description,
  };
};
