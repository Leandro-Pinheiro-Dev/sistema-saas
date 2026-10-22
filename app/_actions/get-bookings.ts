"use server";

import { db } from "@/lib/prisma";

interface GetBookingsProps {
  date: Date;
}

export async function getBookings({ date }: GetBookingsProps) {
  // =====================================================
  // DATA NO FUSO DE SÃO PAULO
  // =====================================================

  const dateString = date.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const startOfDay = new Date(`${dateString}T00:00:00-03:00`);

  const endOfDay = new Date(`${dateString}T23:59:59.999-03:00`);

  console.log("=================================");
  console.log("BUSCANDO AGENDAMENTOS");
  console.log("DATA:", dateString);
  console.log("INÍCIO:", startOfDay.toISOString());
  console.log("FINAL:", endOfDay.toISOString());
  console.log("=================================");

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

    orderBy: {
      date: "asc",
    },

    include: {
      bookingItems: {
        include: {
          service: true,
        },
      },

      service: {
        include: {
          barbershop: true,
        },
      },
    },
  });

  // =====================================================
  // CONVERTER DECIMAL PARA NUMBER
  // =====================================================

  const formattedBookings = bookings.map((booking) => {
    const formattedBookingItems = booking.bookingItems.map((item) => ({
      ...item,

      price: Number(item.price),

      service: {
        ...item.service,
        price: Number(item.service.price),
      },
    }));

    return {
      ...booking,

      service: {
        ...booking.service,

        price: Number(booking.service.price),

        barbershop: {
          ...booking.service.barbershop,
        },
      },

      bookingItems: formattedBookingItems,
    };
  });

  // =====================================================
  // DEBUG
  // =====================================================

  console.log("AGENDAMENTOS ENCONTRADOS:", formattedBookings.length);

  formattedBookings.forEach((booking) => {
    console.log({
      id: booking.id,

      date: booking.date.toISOString(),

      service: booking.service.name,

      price: booking.service.price,

      bookingItems: booking.bookingItems.map((item) => ({
        name: item.service.name,
        price: item.price,
      })),
    });
  });

  return formattedBookings;
}
