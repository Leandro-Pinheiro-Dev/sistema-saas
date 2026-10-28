"use server";

import { getServerSession } from "next-auth";
import { MembershipRole } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { requireBusinessMembership } from "@/lib/permissions/membership";

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

export interface BarberScheduleResult {
  bookings: BarberScheduleBooking[];
}

export async function getBarberSchedule(
  date: string,
  barbershopId: string,
): Promise<BarberScheduleResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (typeof barbershopId !== "string" || !barbershopId.trim()) {
    throw new Error("Estabelecimento inválido.");
  }

  // Valida a associação e as permissões no servidor.
  const membership = await requireBusinessMembership(barbershopId, [
    MembershipRole.OWNER,
    MembershipRole.BARBER,
  ]);

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

  // Considera o dia conforme o fuso horário de Brasília.
  const startOfDay = new Date(`${date}T00:00:00-03:00`);
  const endOfDay = new Date(`${date}T23:59:59.999-03:00`);

  // Proprietário vê todos os agendamentos do estabelecimento.
  // Funcionário vê somente os vinculados à sua Membership.
  const bookings = await db.booking.findMany({
    where: {
      barbershopId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
      ...(membership.role === MembershipRole.BARBER
        ? { barberMembershipId: membership.id }
        : {}),
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

  const formattedBookings: BarberScheduleBooking[] = bookings.map((booking) => {
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

    return {
      id: booking.id,
      userId: booking.userId,
      serviceId: booking.serviceId,
      date: booking.date,
      clientName:
        booking.clientName ??
        booking.user?.name ??
        booking.user?.email ??
        "Cliente",
      clientPhone: booking.clientPhone ?? null,
      serviceName: services.map((item) => item.name).join(" + "),
      services,
      subtotal: Number(booking.subtotal),
      discount: Number(booking.discount),
      totalPrice: Number(booking.total),
      status: booking.status,
    };
  });

  return {
    bookings: formattedBookings,
  };
}
