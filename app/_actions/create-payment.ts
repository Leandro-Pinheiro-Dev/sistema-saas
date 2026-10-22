"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface CreatePaymentParams {
  userId: string;
  amount: number;
  description?: string;
}

export const createPayment = async ({
  userId,
  amount,
  description,
}: CreatePaymentParams) => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

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
  // VALIDAÇÃO
  // =====================================================

  if (!userId) {
    throw new Error("Cliente não informado.");
  }

  if (amount <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.");
  }

  // =====================================================
  // VERIFICAR CLIENTE
  // =====================================================

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("Cliente não encontrado.");
  }

  // =====================================================
  // CALCULAR SALDO ATUAL
  // =====================================================

  const debts = await db.customerDebt.findMany({
    where: {
      userId,
    },
    select: {
      amount: true,
      type: true,
    },
  });

  const currentBalance = debts.reduce((total, debt) => {
    const value = Number(debt.amount);

    if (debt.type === "DEBT") {
      return total + value;
    }

    return total - value;
  }, 0);

  // =====================================================
  // IMPEDIR PAGAMENTO MAIOR QUE O FIADO
  // =====================================================

  if (amount > currentBalance) {
    throw new Error(
      `O pagamento não pode ser maior que o saldo devedor de R$ ${currentBalance.toFixed(2)}.`,
    );
  }

  // =====================================================
  // REGISTRAR PAGAMENTO
  // =====================================================

  await db.customerDebt.create({
    data: {
      userId,
      amount,
      type: "PAYMENT",
      description: description ?? "Pagamento de fiado",
    },
  });

  // =====================================================
  // ATUALIZAR DASHBOARD
  // =====================================================

  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
  };
};
