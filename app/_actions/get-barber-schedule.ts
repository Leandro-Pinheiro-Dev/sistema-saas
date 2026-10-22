"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export interface BarberScheduleService {
  id: string;
  serviceId: string;
  name: string;
  price: number;
}

export interface BarberScheduleBooking {
  id: string;
  userId: string | null;
  serviceId: string;
  date: Date;
  clientName: string | null;
  clientPhone: string | null;

  serviceName: string;
  services: BarberScheduleService[];

  subtotal: number;
  discount: number;
  totalPrice: number;

  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
}

export interface BarberFixedSchedule {
  id: string;
  time: string;
  clientName: string;

  // ===================================================
  // INDICA SE O CLIENTE FIXO FOI LIBERADO NESTA DATA
  // ===================================================

  released: boolean;
}

export interface BarberScheduleResult {
  bookings: BarberScheduleBooking[];
  fixedSchedules: BarberFixedSchedule[];
}

export const getBarberSchedule = async (
  date: string,
): Promise<BarberScheduleResult> => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso permitido somente ao barbeiro.");
  }

  // =====================================================
  // VALIDAR DATA
  // =====================================================

  if (!date || typeof date !== "string") {
    throw new Error("Data não informada.");
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    throw new Error("Formato de data inválido.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const validationDate = new Date(Date.UTC(year, month - 1, day));

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    throw new Error("Data inválida para consultar a agenda.");
  }

  // =====================================================
  // DATA / DIA DA SEMANA
  // =====================================================

  const brazilDate = new Date(`${date}T12:00:00-03:00`);

  const dayOfWeek = brazilDate.getUTCDay();

  const startOfDay = new Date(`${date}T00:00:00-03:00`);

  const endOfDay = new Date(`${date}T23:59:59.999-03:00`);

  // =====================================================
  // BUSCAR BARBEARIA
  // =====================================================

  const barbershop = await db.barbershop.findFirst({
    select: {
      id: true,
    },
  });

  if (!barbershop) {
    throw new Error("Barbearia não encontrada.");
  }

  // =====================================================
  // BUSCAR AGENDAMENTOS
  // =====================================================

  const bookings = await db.booking.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },

      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },

    include: {
      user: true,

      service: true,

      bookingItems: {
        include: {
          service: true,
        },

        orderBy: {
          createdAt: "asc",
        },
      },
    },

    orderBy: {
      date: "asc",
    },
  });

  // =====================================================
  // BUSCAR HORÁRIOS FIXOS
  // =====================================================

  const fixedSchedules = await db.fixedSchedule.findMany({
    where: {
      barbershopId: barbershop.id,
      dayOfWeek,
      active: true,
    },

    orderBy: {
      time: "asc",
    },
  });

  // =====================================================
  // BUSCAR EXCEÇÕES DA DATA
  //
  // IMPORTANTE:
  //
  // A data é armazenada como @db.Date.
  // Por isso usamos UTC 00:00.
  // =====================================================

  const fixedScheduleExceptions = await db.fixedScheduleException.findMany({
    where: {
      barbershopId: barbershop.id,
      date: validationDate,
    },

    select: {
      time: true,
    },
  });

  // =====================================================
  // CRIAR SET COM OS HORÁRIOS LIBERADOS
  // =====================================================

  const releasedTimes = new Set(
    fixedScheduleExceptions.map((exception) => exception.time),
  );

  // =====================================================
  // FORMATAR AGENDAMENTOS
  // =====================================================

  const formattedBookings: BarberScheduleBooking[] = bookings.map((booking) => {
    // -------------------------------------------------
    // SERVIÇOS
    // -------------------------------------------------

    const services: BarberScheduleService[] =
      booking.bookingItems.length > 0
        ? booking.bookingItems.map((item) => ({
            id: item.id,
            serviceId: item.serviceId,
            name: item.service.name,
            price: Number(item.price),
          }))
        : [
            {
              id: booking.service.id,
              serviceId: booking.service.id,
              name: booking.service.name,
              price: Number(booking.service.price),
            },
          ];

    // -------------------------------------------------
    // VALORES FINANCEIROS
    // -------------------------------------------------

    const subtotal = Number(booking.subtotal);

    const discount = Number(booking.discount);

    const totalPrice = Number(booking.total);

    // -------------------------------------------------
    // NOME DOS SERVIÇOS
    // -------------------------------------------------

    const serviceName = services.map((item) => item.name).join(" + ");

    // -------------------------------------------------
    // CLIENTE
    // -------------------------------------------------

    const clientName =
      booking.clientName ??
      booking.user?.name ??
      booking.user?.email ??
      "Cliente";

    // -------------------------------------------------
    // RETORNO
    // -------------------------------------------------

    return {
      id: booking.id,

      userId: booking.userId,

      serviceId: booking.serviceId,

      date: booking.date,

      clientName,

      clientPhone: booking.clientPhone ?? null,

      serviceName,

      services,

      subtotal,

      discount,

      totalPrice,

      status: booking.status,
    };
  });

  // =====================================================
  // RETORNO FINAL
  // =====================================================

  return {
    bookings: formattedBookings,

    fixedSchedules: fixedSchedules.map((schedule) => ({
      id: schedule.id,
      time: schedule.time,
      clientName: schedule.clientName,

      // true = liberado nesta data
      // false = reservado normalmente
      released: releasedTimes.has(schedule.time),
    })),
  };
};
