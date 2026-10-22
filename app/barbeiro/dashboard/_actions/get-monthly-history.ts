"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

type MonthlyHistoryParams = {
  year: number;
  month: number;
};

export const getMonthlyHistory = async ({
  year,
  month,
}: MonthlyHistoryParams) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error("Ano ou mês inválido.");
  }

  if (month < 1 || month > 12) {
    throw new Error("Mês inválido.");
  }

  // =====================================================
  // 1. PERÍODO DO MÊS
  // =====================================================

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);

  const startOfNextMonth = new Date(
    month === 12 ? year + 1 : year,
    month === 12 ? 0 : month,
    1,
    0,
    0,
    0,
    0,
  );

  // =====================================================
  // 2. AGENDAMENTOS DO MÊS
  //
  // Usamos a DATA DO AGENDAMENTO para saber quais
  // serviços foram realizados naquele mês.
  // =====================================================

  const bookings = await db.booking.findMany({
    where: {
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

  // =====================================================
  // 3. SERVIÇOS
  // =====================================================

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
    (total, booking) => total + Number(booking.subtotal),
    0,
  );

  const totalDiscounts = completedBookings.reduce(
    (total, booking) => total + Number(booking.discount),
    0,
  );

  const totalServices = completedBookings.reduce(
    (total, booking) => total + Number(booking.total),
    0,
  );

  // =====================================================
  // 4. TRANSAÇÕES FINANCEIRAS
  //
  // Aqui usamos createdAt porque representa quando
  // o dinheiro entrou no caixa.
  //
  // SERVICE_PAYMENT:
  // pagamento de um serviço.
  //
  // DEBT_PAYMENT:
  // pagamento de um fiado antigo.
  // =====================================================

  const transactions = await db.financialTransaction.findMany({
    where: {
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

  // =====================================================
  // 5. SEPARAR SERVIÇOS E FIADO
  // =====================================================

  const servicePayments = transactions.filter(
    (transaction) => transaction.type === "SERVICE_PAYMENT",
  );

  const debtPayments = transactions.filter(
    (transaction) => transaction.type === "DEBT_PAYMENT",
  );

  const serviceRevenue = servicePayments.reduce(
    (total, transaction) => total + Number(transaction.amount),
    0,
  );

  const debtRevenue = debtPayments.reduce(
    (total, transaction) => total + Number(transaction.amount),
    0,
  );

  const totalReceived = serviceRevenue + debtRevenue;

  // =====================================================
  // 6. TICKET MÉDIO
  //
  // Consideramos apenas os serviços concluídos.
  // =====================================================

  const averageTicket =
    completedBookings.length > 0 ? totalServices / completedBookings.length : 0;

  // =====================================================
  // 7. DETALHES DAS TRANSAÇÕES
  //
  // Convertendo Decimal para number para poder enviar
  // os dados normalmente para Client Components.
  // =====================================================

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

    // Agendamentos
    totalBookings: bookings.length,
    completedBookings: completedBookings.length,
    cancelledBookings: cancelledBookings.length,
    pendingBookings: pendingBookings.length,

    // Serviços
    subtotalServices,
    totalDiscounts,
    totalServices,

    // Caixa
    serviceRevenue,
    debtRevenue,
    totalReceived,

    // Indicadores
    averageTicket,

    // Detalhamento
    transactions: transactionHistory,
  };
};
