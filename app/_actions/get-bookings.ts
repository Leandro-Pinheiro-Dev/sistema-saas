"use server";

import { db } from "@/lib/prisma";

interface GetBookingsProps {
  barbershopId: string;
  date: Date;
}

export async function getBookings({ barbershopId, date }: GetBookingsProps) {
  if (!barbershopId?.trim()) {
    throw new Error("Estabelecimento não informado.");
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("Data inválida.");
  }

  const dateString = date.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const startOfDay = new Date(`${dateString}T00:00:00-03:00`);
  const endOfDay = new Date(`${dateString}T23:59:59.999-03:00`);

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
    orderBy: {
      date: "asc",
    },
  });

  return bookings.map((booking) => ({
    date: booking.date,
    durationMinutes:
      booking.bookingItems.length > 0
        ? booking.bookingItems.reduce(
            (total, item) => total + item.service.durationMinutes,
            0,
          )
        : booking.service.durationMinutes,
  }));
}
