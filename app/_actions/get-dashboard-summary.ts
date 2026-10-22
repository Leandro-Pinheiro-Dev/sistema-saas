"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

export const getDashboardSummary = async () => {
  const session = await getServerSession(authOptions);

  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // AUTORIZAÇÃO
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }
  // =====================================================
  // TOTAL EM FIADOS
  // =====================================================

  const debts = await db.customerDebt.findMany({
    select: {
      userId: true,
      clientName: true,
      clientPhone: true,
      amount: true,
      type: true,
    },
  });

  /*
   * Calculamos o saldo de cada cliente.
   *
   * Cliente cadastrado:
   *   chave = userId
   *
   * Cliente manual:
   *   chave = telefone
   *
   * Assim conseguimos controlar os dois tipos
   * de cliente sem perder os fiados.
   */
  const customerBalances = new Map<string, number>();

  debts.forEach((debt) => {
    // ---------------------------------------------------
    // Identifica o cliente
    // ---------------------------------------------------

    let customerKey: string | null = null;

    if (debt.userId) {
      // Cliente cadastrado
      customerKey = `user:${debt.userId}`;
    } else if (debt.clientPhone) {
      // Cliente manual
      //
      // Remove caracteres do telefone para garantir
      // que diferentes formatos sejam tratados como
      // o mesmo cliente.
      const normalizedPhone = debt.clientPhone.replace(/\D/g, "");

      if (normalizedPhone) {
        customerKey = `manual:${normalizedPhone}`;
      }
    }

    // Se não conseguimos identificar o cliente,
    // não conseguimos calcular o saldo corretamente.
    if (!customerKey) {
      return;
    }

    // ---------------------------------------------------
    // Calcula o movimento
    // ---------------------------------------------------

    const currentBalance = customerBalances.get(customerKey) ?? 0;

    const value =
      debt.type === "DEBT" ? Number(debt.amount) : -Number(debt.amount);

    customerBalances.set(customerKey, currentBalance + value);
  });

  // ---------------------------------------------------
  // Somente saldos realmente em aberto
  // ---------------------------------------------------

  const customersWithDebt = Array.from(customerBalances.values()).filter(
    (balance) => balance > 0,
  );

  // ---------------------------------------------------
  // Soma todos os fiados em aberto
  // ---------------------------------------------------

  const totalDebt = customersWithDebt.reduce(
    (total, balance) => total + balance,
    0,
  );

  // =====================================================
  // DATA ATUAL
  // =====================================================

  const now = new Date();

  // =====================================================
  // INÍCIO E FIM DO DIA
  // =====================================================

  const startOfDay = new Date(now);

  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);

  endOfDay.setHours(23, 59, 59, 999);

  // =====================================================
  // FATURAMENTO DO DIA
  // =====================================================

  const dailyTransactions = await db.financialTransaction.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },

      type: {
        in: ["SERVICE_PAYMENT", "DEBT_PAYMENT"],
      },
    },

    select: {
      amount: true,
      type: true,
    },
  });

  // =====================================================
  // SERVIÇOS RECEBIDOS HOJE
  // =====================================================

  const dailyServiceRevenue = dailyTransactions
    .filter((transaction) => transaction.type === "SERVICE_PAYMENT")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  // =====================================================
  // FIADOS RECEBIDOS HOJE
  // =====================================================

  const dailyDebtRevenue = dailyTransactions
    .filter((transaction) => transaction.type === "DEBT_PAYMENT")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  // =====================================================
  // TOTAL RECEBIDO HOJE
  // =====================================================

  const dailyRevenue = dailyTransactions.reduce(
    (total, transaction) => total + Number(transaction.amount),
    0,
  );

  // =====================================================
  // INÍCIO E FIM DO MÊS
  // =====================================================

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  // =====================================================
  // FATURAMENTO DO MÊS
  // =====================================================

  const monthlyTransactions = await db.financialTransaction.findMany({
    where: {
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },

      type: {
        in: ["SERVICE_PAYMENT", "DEBT_PAYMENT"],
      },
    },

    select: {
      amount: true,
      type: true,
    },
  });

  // =====================================================
  // SERVIÇOS RECEBIDOS NO MÊS
  // =====================================================

  const monthlyServiceRevenue = monthlyTransactions
    .filter((transaction) => transaction.type === "SERVICE_PAYMENT")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  // =====================================================
  // FIADOS RECEBIDOS NO MÊS
  // =====================================================

  const monthlyDebtRevenue = monthlyTransactions
    .filter((transaction) => transaction.type === "DEBT_PAYMENT")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  // =====================================================
  // TOTAL RECEBIDO NO MÊS
  // =====================================================

  const monthlyRevenue = monthlyTransactions.reduce(
    (total, transaction) => total + Number(transaction.amount),
    0,
  );

  // =====================================================
  // RETORNO
  // =====================================================

  return {
    totalDebt,
    customersWithDebt: customersWithDebt.length,

    dailyRevenue,
    dailyServiceRevenue,
    dailyDebtRevenue,

    monthlyRevenue,
    monthlyServiceRevenue,
    monthlyDebtRevenue,
  };
};
