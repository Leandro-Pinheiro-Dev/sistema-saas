"use server";

import { db } from "@/lib/prisma";
import { requireBusinessOwner } from "@/lib/permissions/membership";

type MonthlyHistoryParams = {
  barbershopId: string;
  year: number;
  month: number;
};

export const getMonthlyHistory = async ({
  barbershopId,
  year,
  month,
}: MonthlyHistoryParams) => {
  if (!barbershopId?.trim()) {
    throw new Error("Estabelecimento não informado.");
  }

  await requireBusinessOwner(barbershopId);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Ano ou mês inválido.");
  }

  if (year < 2000 || year > 2100) {
    throw new Error("Ano inválido.");
  }

  if (month < 1 || month > 12) {
    throw new Error("Mês inválido.");
  }

  const startOfMonth = new Date(year, month - 1, 1);
  const startOfNextMonth = new Date(year, month, 1);

  // Agendamentos somente deste estabelecimento.
  const bookings = await db.booking.findMany({
    where: {
      barbershopId,
      date: {
        gte: startOfMonth,
        lt: startOfNextMonth,
      },
    },
    select: {
      id: true,
      date: true,
      status: true,
      subtotal: true,
      discount: true,
      total: true,
    },
  });

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "CANCELLED",
  );

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "PENDING" || booking.status === "CONFIRMED",
  );

  const subtotalServices = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.subtotal),
    0,
  );

  const totalDiscounts = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.discount),
    0,
  );

  const totalServices = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.total),
    0,
  );

  // Transações somente deste estabelecimento.
  const transactions = await db.financialTransaction.findMany({
    where: {
      barbershopId,
      createdAt: {
        gte: startOfMonth,
        lt: startOfNextMonth,
      },
      type: {
        in: ["SERVICE_PAYMENT", "DEBT_PAYMENT"],
      },
    },
    select: {
      id: true,
      amount: true,
      type: true,
      description: true,
      bookingId: true,
      customerDebtId: true,
      clientName: true,
      clientPhone: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const servicePayments = transactions.filter(
    (transaction) => transaction.type === "SERVICE_PAYMENT",
  );

  const debtPayments = transactions.filter(
    (transaction) => transaction.type === "DEBT_PAYMENT",
  );

  const serviceRevenue = servicePayments.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );

  const debtRevenue = debtPayments.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );

  const totalReceived = serviceRevenue + debtRevenue;

  const averageTicket =
    completedBookings.length > 0 ? totalServices / completedBookings.length : 0;

  const transactionHistory = transactions.map((transaction) => ({
    id: transaction.id,
    amount: Number(transaction.amount),
    type: transaction.type,
    description: transaction.description,
    bookingId: transaction.bookingId,
    customerDebtId: transaction.customerDebtId,
    clientName: transaction.clientName,
    clientPhone: transaction.clientPhone,
    createdAt: transaction.createdAt,
  }));

  return {
    year,
    month,
    totalBookings: bookings.length,
    completedBookings: completedBookings.length,
    cancelledBookings: cancelledBookings.length,
    pendingBookings: pendingBookings.length,
    subtotalServices,
    totalDiscounts,
    totalServices,
    serviceRevenue,
    debtRevenue,
    totalReceived,
    averageTicket,
    transactions: transactionHistory,
  };
};
