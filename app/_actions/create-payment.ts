"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/prisma";
import { requireBusinessStaff } from "@/lib/permissions/membership";

interface CreatePaymentParams {
  barbershopId: string;
  userId: string;
  amount: number;
  description?: string;
}

export const createPayment = async ({
  barbershopId,
  userId,
  amount,
  description,
}: CreatePaymentParams) => {
  if (!barbershopId?.trim()) {
    throw new Error("Estabelecimento não informado.");
  }

  if (!userId?.trim()) {
    throw new Error("Cliente não informado.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.");
  }

  // Confirma que o usuário possui acesso ativo ao estabelecimento.
  await requireBusinessStaff(barbershopId);

  // Confirma que o cliente existe.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Cliente não encontrado.");
  }

  // Busca somente os fiados deste cliente neste estabelecimento.
  const debts = await db.customerDebt.findMany({
    where: {
      userId,
      barbershopId,
    },
    select: {
      amount: true,
      type: true,
    },
  });

  const currentBalance = debts.reduce((total, debt) => {
    const value = Number(debt.amount);

    return debt.type === "DEBT" ? total + value : total - value;
  }, 0);

  if (currentBalance <= 0) {
    throw new Error(
      "Este cliente não possui fiado em aberto neste estabelecimento.",
    );
  }

  if (amount > currentBalance) {
    throw new Error(
      `O pagamento não pode ser maior que o saldo devedor de R$ ${currentBalance.toFixed(2)}.`,
    );
  }

  // Registra o pagamento vinculado ao estabelecimento correto.
  await db.customerDebt.create({
    data: {
      barbershopId,
      userId,
      amount,
      type: "PAYMENT",
      description: description?.trim() || "Pagamento de fiado",
    },
  });

  revalidatePath("/barbeiro/dashboard");

  return { success: true };
};
