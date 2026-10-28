"use server";

import { requireBusinessOwner } from "@/lib/permissions/membership";
import { db } from "@/lib/prisma";

export const getDashboardSummary = async (barbershopId: string) => {
  if (!barbershopId?.trim()) {
    throw new Error("Estabelecimento não informado.");
  }

  // Somente o proprietário ativo pode consultar o resumo financeiro.
  await requireBusinessOwner(barbershopId);

  // Dívidas e pagamentos de fiado deste estabelecimento.
  const debts = await db.customerDebt.findMany({
    where: { barbershopId },
    select: {
      userId: true,
      clientPhone: true,
      amount: true,
      type: true,
    },
  });

  const customerBalances = new Map<string, number>();

  for (const debt of debts) {
    let customerKey: string | null = null;

    if (debt.userId) {
      customerKey = `user:${debt.userId}`;
    } else if (debt.clientPhone) {
      const phone = debt.clientPhone.replace(/\D/g, "");
      if (phone) customerKey = `manual:${phone}`;
    }

    if (!customerKey) continue;

    const currentBalance = customerBalances.get(customerKey) ?? 0;
    const value =
      debt.type === "DEBT" ? Number(debt.amount) : -Number(debt.amount);

    customerBalances.set(customerKey, currentBalance + value);
  }

  const balances = Array.from(customerBalances.values());
  const customersWithDebt = balances.filter((balance) => balance > 0);

  const totalDebt = customersWithDebt.reduce(
    (total, balance) => total + balance,
    0,
  );

  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

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

  const [dailyTransactions, monthlyTransactions] = await Promise.all([
    db.financialTransaction.findMany({
      where: {
        barbershopId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        type: { in: ["SERVICE_PAYMENT", "DEBT_PAYMENT"] },
      },
      select: { amount: true, type: true },
    }),

    db.financialTransaction.findMany({
      where: {
        barbershopId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        type: { in: ["SERVICE_PAYMENT", "DEBT_PAYMENT"] },
      },
      select: { amount: true, type: true },
    }),
  ]);

  const sumTransactions = (
    transactions: { amount: unknown; type: string }[],
    type?: "SERVICE_PAYMENT" | "DEBT_PAYMENT",
  ) =>
    transactions
      .filter((transaction) => !type || transaction.type === type)
      .reduce((total, transaction) => total + Number(transaction.amount), 0);

  return {
    totalDebt,
    customersWithDebt: customersWithDebt.length,

    dailyRevenue: sumTransactions(dailyTransactions),
    dailyServiceRevenue: sumTransactions(dailyTransactions, "SERVICE_PAYMENT"),
    dailyDebtRevenue: sumTransactions(dailyTransactions, "DEBT_PAYMENT"),

    monthlyRevenue: sumTransactions(monthlyTransactions),
    monthlyServiceRevenue: sumTransactions(
      monthlyTransactions,
      "SERVICE_PAYMENT",
    ),
    monthlyDebtRevenue: sumTransactions(monthlyTransactions, "DEBT_PAYMENT"),
  };
};
