"use server";

import { getServerSession } from "next-auth";

import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

import { calculateBookingDiscount } from "@/app/utils/booking-discount";

import {
  getPricedBookingServices,
  isHaircutService,
} from "@/app/utils/booking-pricing";

import { validateBusinessSchedule } from "@/lib/business-schedule";

import { sendPushNotification } from "@/lib/push";

interface CreateBookingParams {
  serviceIds: string[];

  date: string;

  time: string;

  isChild?: boolean;
}

export const createBooking = async ({
  serviceIds,

  date,

  time,

  isChild = false,
}: CreateBookingParams) => {
  // =====================================================

  // 1. VERIFICAR AUTENTICAÇÃO

  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================

  // 2. VALIDAR SERVIÇOS

  // =====================================================

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new Error("Selecione pelo menos um serviço.");
  }

  // Remove serviços duplicados.

  const uniqueServiceIds = [...new Set(serviceIds)];

  // =====================================================

  // 3. VALIDAR DATA

  // =====================================================

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data inválida.");
  }

  const [year, month, day] = date.split("-").map(Number);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error("Data inválida.");
  }

  // =====================================================

  // 4. VALIDAR SE A DATA REALMENTE EXISTE

  // =====================================================

  //

  // Usamos UTC ao meio-dia para evitar problemas de fuso

  // ao descobrir o dia da semana.

  const dateForDayOfWeek = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (Number.isNaN(dateForDayOfWeek.getTime())) {
    throw new Error("Data inválida.");
  }

  // Impede datas inexistentes como:

  // 31/02/2026

  // 31/04/2026

  // etc.

  if (
    dateForDayOfWeek.getUTCFullYear() !== year ||
    dateForDayOfWeek.getUTCMonth() !== month - 1 ||
    dateForDayOfWeek.getUTCDate() !== day
  ) {
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

  const dayOfWeek = dateForDayOfWeek.getUTCDay();

  // =====================================================

  // 7. BUSCAR OS SERVIÇOS NO BANCO

  // =====================================================

  const services = await db.barbershopService.findMany({
    where: {
      id: {
        in: uniqueServiceIds,
      },
    },
  });

  if (services.length !== uniqueServiceIds.length) {
    throw new Error("Um ou mais serviços não foram encontrados.");
  }

  // =====================================================

  // 8. GARANTIR QUE OS SERVIÇOS SÃO DA MESMA BARBEARIA

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

  // 9. VALIDAR DATA ATUAL NO HORÁRIO DE SÃO PAULO

  // =====================================================

  //

  // A aplicação trabalha com America/Sao_Paulo.

  //

  // Não utilizamos apenas new Date().getDate(), porque

  // o ambiente da Vercel pode trabalhar em UTC.

  const now = new Date();

  const saoPauloParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  }).formatToParts(now);

  const currentYear = Number(
    saoPauloParts.find((part) => part.type === "year")?.value,
  );

  const currentMonth = Number(
    saoPauloParts.find((part) => part.type === "month")?.value,
  );

  const currentDay = Number(
    saoPauloParts.find((part) => part.type === "day")?.value,
  );

  // Impede agendamento em datas passadas.

  if (
    year < currentYear ||
    (year === currentYear && month < currentMonth) ||
    (year === currentYear && month === currentMonth && day < currentDay)
  ) {
    throw new Error("Não é possível realizar agendamento em uma data passada.");
  }

  // =====================================================

  // 10. VALIDAR MÊS DA AGENDA

  // =====================================================

  //

  // Hierarquia:

  //

  // MÊS

  //   ↓

  // DIA

  //   ↓

  // HORÁRIO

  //

  // O cliente somente pode agendar se o mês estiver

  // explicitamente liberado pelo barbeiro.

  const businessMonth = await db.businessMonth.findUnique({
    where: {
      barbershopId_year_month: {
        barbershopId,

        year,

        month,
      },
    },
  });

  if (!businessMonth) {
    throw new Error("Este mês ainda não foi liberado para novos agendamentos.");
  }

  if (!businessMonth.active) {
    throw new Error("Este mês está bloqueado para novos agendamentos.");
  }

  // =====================================================

  // 11. VALIDAR REGRA DE CORTE INFANTIL

  // =====================================================

  const hasHaircut = services.some((service) => isHaircutService(service.name));

  if (isChild && !hasHaircut) {
    throw new Error(
      "O preço infantil só pode ser aplicado ao Corte de Cabelo.",
    );
  }

  // =====================================================

  // 12. VALIDAR AGENDA DA BARBEARIA

  // =====================================================

  //

  // Aqui são verificadas:

  //

  // - dia da semana;

  // - horário;

  // - BusinessDay;

  // - BusinessTimeSlot.

  await validateBusinessSchedule({
    barbershopId,

    dayOfWeek,

    time,
  });

  // =====================================================

  // 13. DEFINIR USUÁRIO

  // =====================================================

  // =====================================================

  // 14. CALCULAR PREÇOS

  // =====================================================

  const pricedServices = getPricedBookingServices(
    services.map((service) => ({
      id: service.id,

      name: service.name,

      price: Number(service.price),
    })),

    isChild,
  );

  // =====================================================

  // 15. CALCULAR DESCONTO

  // =====================================================

  const discountResult = calculateBookingDiscount(
    pricedServices.map((service) => ({
      name: service.name,

      price: service.price,
    })),
  );

  // =====================================================
  // 16. CRIAR DATA COMPLETA DO AGENDAMENTO
  // =====================================================

  // =====================================================

  //

  // O horário da barbearia é São Paulo (UTC-3).

  const bookingDate = new Date(`${date}T${time}:00-03:00`);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Não foi possível criar a data do agendamento.");
  }

  // =====================================================

  // 17. VERIFICAR SOBREPOSIÇÃO DE AGENDAMENTOS

  // =====================================================

  const slotStart = new Date(bookingDate);

  slotStart.setSeconds(0, 0);

  // Duração total de todos os serviços escolhidos pelo cliente.

  const totalDurationMinutes = services.reduce(
    (total, service) => total + service.durationMinutes,

    0,
  );

  if (totalDurationMinutes <= 0) {
    throw new Error("A duração dos serviços é inválida.");
  }

  const slotEnd = new Date(slotStart.getTime() + totalDurationMinutes * 60_000);

  // Buscar agendamentos do mesmo estabelecimento que começam

  // antes do término do novo agendamento.

  const dayStart = new Date(slotStart);

  dayStart.setHours(0, 0, 0, 0);

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

  const hasOverlap = existingBookings.some((existingBooking) => {
    const existingStart = existingBooking.date;

    // Os itens normalmente contêm todos os serviços do agendamento.

    // Para agendamentos antigos sem itens, usar o serviço principal.

    const existingDurationMinutes =
      existingBooking.bookingItems.length > 0
        ? existingBooking.bookingItems.reduce(
            (total, item) => total + item.service.durationMinutes,

            0,
          )
        : existingBooking.service.durationMinutes;

    const existingEnd = new Date(
      existingStart.getTime() + existingDurationMinutes * 60_000,
    );

    return existingStart < slotEnd && existingEnd > slotStart;
  });

  if (hasOverlap) {
    throw new Error(
      "Este horário está ocupado. Escolha outro horário disponível.",
    );
  }

  // =====================================================

  // 18. CRIAR AGENDAMENTO

  // =====================================================

  const booking = await db.booking.create({
    data: {
      userId: session.user.id,

      barbershopId,

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

  // 19. ENVIAR PUSH PARA O BARBEIRO

  // =====================================================

  try {
    const barbers = await db.user.findMany({
      where: {
        role: "BARBER",
      },

      select: {
        id: true,

        pushSubscriptions: true,
      },
    });

    const clientName = session.user.name?.trim() || "Um cliente";

    const servicesText = services.map((service) => service.name).join(" + ");

    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",

      day: "2-digit",

      month: "2-digit",

      year: "numeric",
    }).format(bookingDate);

    for (const barber of barbers) {
      for (const subscription of barber.pushSubscriptions) {
        try {
          await sendPushNotification(subscription, {
            title: "Novo agendamento ✂️",

            body: `${clientName} agendou ${servicesText} para ${formattedDate} às ${time}.`,

            url: "/barbeiro/dashboard",
          });

          console.log(`Push enviado para o barbeiro ${barber.id}.`);
        } catch (error: unknown) {
          console.error(
            `Erro ao enviar Push para o barbeiro ${barber.id}:`,

            error,
          );

          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
              ? error.statusCode
              : undefined;

          /**

           * 404 / 410 normalmente significam que a

           * subscription deixou de ser válida.

           *

           * Nesse caso removemos do banco.

           */

          if (statusCode === 404 || statusCode === 410) {
            try {
              await db.pushSubscription.delete({
                where: {
                  id: subscription.id,
                },
              });

              console.log(`PushSubscription ${subscription.id} removida.`);
            } catch (deleteError) {
              console.error(
                "Erro ao remover PushSubscription expirada:",

                deleteError,
              );
            }
          }
        }
      }
    }
  } catch (error) {
    /**

     * Falha na notificação NÃO deve cancelar

     * um agendamento que já foi criado.

     */

    console.error("Erro geral ao enviar notificação para o barbeiro:", error);
  }

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
