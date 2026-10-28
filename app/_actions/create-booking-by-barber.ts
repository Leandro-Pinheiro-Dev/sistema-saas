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

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,

      barbershopId,

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
    throw new Error(
      "Você não tem permissão para criar agendamentos neste estabelecimento.",
    );
  }

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
  // 17. VERIFICAR SOBREPOSIÇÃO DE AGENDAMENTOS
  // =====================================================

  const slotStart = new Date(bookingDate);
  slotStart.setSeconds(0, 0);

  const totalDurationMinutes = services.reduce(
    (total, service) => total + service.durationMinutes,
    0,
  );

  if (totalDurationMinutes <= 0) {
    throw new Error("A duração dos serviços é inválida.");
  }

  const slotEnd = new Date(slotStart.getTime() + totalDurationMinutes * 60_000);
  const dayStart = new Date(`${date}T00:00:00-03:00`);

  const existingBookings = await db.booking.findMany({
    where: {
      barbershopId,
      date: {
        gte: dayStart,
        lt: slotEnd,
      },
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },
    select: {
      date: true,
      clientName: true,
      service: {
        select: {
          durationMinutes: true,
        },
      },
      bookingItems: {
        select: {
          service: {
            select: {
              durationMinutes: true,
            },
          },
        },
      },
    },
  });

  const conflictingBooking = existingBookings.find((existingBooking) => {
    const existingDurationMinutes =
      existingBooking.bookingItems.length > 0
        ? existingBooking.bookingItems.reduce(
            (total, item) => total + item.service.durationMinutes,
            0,
          )
        : existingBooking.service.durationMinutes;

    const existingStart = existingBooking.date;
    const existingEnd = new Date(
      existingStart.getTime() + existingDurationMinutes * 60_000,
    );

    return existingStart < slotEnd && existingEnd > slotStart;
  });

  if (conflictingBooking) {
    const existingClient = conflictingBooking.clientName || "outro cliente";
    throw new Error(
      `Este horário conflita com o agendamento de ${existingClient}.`,
    );
  }

  // =====================================================
  // 18. CRIAR AGENDAMENTO
  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: userId || null,

      barbershopId,

      barberMembershipId: membership.role === "BARBER" ? membership.id : null,

      clientName: normalizedClientName,

      clientPhone: normalizedClientPhone,

      serviceId: uniqueServiceIds[0],

      date: bookingDate,

      status: "PENDING",

      subtotal: discountResult.subtotal,

      discount: discountResult.discount,

      total: discountResult.total,

      bookingItems: {
        create: pricedServices.map((service) => ({
          serviceId: service.id,

          price: service.price,
        })),
      },
    },
  });

  // =====================================================

  // 19. ATUALIZAR PÁGINAS

  // =====================================================

  revalidatePath("/");

  revalidatePath("/bookings");

  revalidatePath("/barbeiro/dashboard");

  // =====================================================

  // 20. RETORNAR RESULTADO

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
