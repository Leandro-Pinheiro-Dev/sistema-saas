"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface PayDebtParams {
  userId?: string | null;
  bookingId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  amount: number;
}

/**
 * Normaliza telefone deixando somente números.
 *
 * Exemplos:
 *
 * (11) 99999-9999
 * 11 99999-9999
 * 11999999999
 *
 * Todos viram:
 *
 * 11999999999
 */
const normalizePhone = (phone?: string | null) => {
  if (!phone) {
    return "";
  }

  return phone.replace(/\D/g, "");
};

/**
 * Verifica se o userId representa um cliente manual.
 *
 * O sistema utiliza:
 *
 * manual:PHONE:11999999999
 *
 * como identificador virtual para clientes que não possuem
 * cadastro de usuário no sistema.
 */
const isManualUserId = (userId?: string | null) => {
  return userId?.startsWith("manual:PHONE:") ?? false;
};

/**
 * Extrai o telefone de um identificador manual.
 *
 * manual:PHONE:11999999999
 *
 * retorna:
 *
 * 11999999999
 */
const getPhoneFromManualUserId = (userId?: string | null) => {
  if (!isManualUserId(userId)) {
    return "";
  }

  return normalizePhone(userId?.replace("manual:PHONE:", ""));
};

export const payDebt = async ({
  userId,
  bookingId,
  clientName,
  clientPhone,
  amount,
}: PayDebtParams) => {
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
  // VALIDAÇÃO DO VALOR
  // =====================================================

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.");
  }

  // =====================================================
  // IDENTIFICAÇÃO DO CLIENTE
  // =====================================================

  if (!userId && !bookingId && !clientName && !clientPhone) {
    throw new Error("Não foi possível identificar o cliente do pagamento.");
  }

  // =====================================================
  // IDENTIFICAR CLIENTE MANUAL
  // =====================================================

  const manualPhoneFromUserId = getPhoneFromManualUserId(userId);

  const normalizedClientPhone = normalizePhone(clientPhone);

  const manualPhone = manualPhoneFromUserId || normalizedClientPhone;

  const manualClient = isManualUserId(userId);

  // =====================================================
  // LOCALIZAR AS MOVIMENTAÇÕES
  // =====================================================

  let transactions;

  // -----------------------------------------------------
  // CLIENTE MANUAL IDENTIFICADO PELO TELEFONE
  // -----------------------------------------------------

  if (manualClient) {
    /**
     * Não utilizamos:
     *
     * where: {
     *   userId: "manual:PHONE:..."
     * }
     *
     * porque esse valor NÃO é um User.id real.
     *
     * Cliente manual possui:
     *
     * userId = null
     */

    const manualTransactions = await db.customerDebt.findMany({
      where: {
        userId: null,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    /**
     * Comparamos o telefone normalizado.
     *
     * Isso permite encontrar tanto:
     *
     * 11999999999
     *
     * quanto:
     *
     * (11) 99999-9999
     */
    transactions = manualTransactions.filter((transaction) => {
      const transactionPhone = normalizePhone(transaction.clientPhone);

      return transactionPhone === manualPhone;
    });
  }

  // -----------------------------------------------------
  // CLIENTE CADASTRADO
  // -----------------------------------------------------
  else if (userId) {
    transactions = await db.customerDebt.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // -----------------------------------------------------
  // AGENDAMENTO MANUAL / BOOKING
  // -----------------------------------------------------
  else if (bookingId) {
    transactions = await db.customerDebt.findMany({
      where: {
        bookingId,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // -----------------------------------------------------
  // CLIENTE MANUAL SEM BOOKING
  // -----------------------------------------------------
  else {
    /**
     * Como o telefone pode estar salvo com diferentes
     * formatos, primeiro buscamos os clientes manuais
     * e depois fazemos a comparação normalizada.
     */

    const manualTransactions = await db.customerDebt.findMany({
      where: {
        userId: null,
      },
      select: {
        id: true,
        userId: true,
        bookingId: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    transactions = manualTransactions.filter((transaction) => {
      const sameName =
        !clientName ||
        transaction.clientName?.trim().toLowerCase() ===
          clientName.trim().toLowerCase();

      const samePhone =
        !normalizedClientPhone ||
        normalizePhone(transaction.clientPhone) === normalizedClientPhone;

      return sameName && samePhone;
    });
  }

  // =====================================================
  // VERIFICAR SE EXISTEM TRANSAÇÕES
  // =====================================================

  if (!transactions || transactions.length === 0) {
    throw new Error("Nenhuma movimentação encontrada para este cliente.");
  }

  // =====================================================
  // CALCULAR SALDO
  // =====================================================

  const totalDebt = transactions.reduce((total, transaction) => {
    const value = Number(transaction.amount);

    if (transaction.type === "DEBT") {
      return total + value;
    }

    if (transaction.type === "PAYMENT") {
      return total - value;
    }

    return total;
  }, 0);

  // =====================================================
  // VERIFICAR SALDO
  // =====================================================

  if (totalDebt <= 0) {
    throw new Error("Este cliente não possui fiado em aberto.");
  }

  // =====================================================
  // PAGAMENTO MAIOR QUE A DÍVIDA
  // =====================================================

  if (amount > totalDebt) {
    throw new Error(
      `O pagamento não pode ser maior que a dívida de R$ ${totalDebt.toFixed(
        2,
      )}.`,
    );
  }

  // =====================================================
  // ÚLTIMA MOVIMENTAÇÃO
  // =====================================================

  const lastTransaction = transactions[transactions.length - 1];

  // =====================================================
  // DEFINIR DADOS DO CLIENTE
  // =====================================================

  const finalClientName = clientName ?? lastTransaction?.clientName ?? null;

  const finalClientPhone = clientPhone ?? lastTransaction?.clientPhone ?? null;

  // =====================================================
  // DEFINIR BOOKING
  // =====================================================

  const finalBookingId = bookingId ?? lastTransaction?.bookingId ?? null;

  // =====================================================
  // DEFINIR USER ID REAL
  // =====================================================

  /**
   * Cliente manual:
   *
   * userId = null
   *
   * Cliente cadastrado:
   *
   * userId = ID real do usuário
   */

  const finalUserId = manualClient
    ? null
    : (userId ?? lastTransaction?.userId ?? null);

  // =====================================================
  // CRIAR PAGAMENTO DO FIADO
  // =====================================================

  await db.customerDebt.create({
    data: {
      userId: finalUserId,
      bookingId: finalBookingId,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      amount,
      type: "PAYMENT",
      description: "Pagamento de fiado",
    },
  });

  // =====================================================
  // REGISTRAR TRANSAÇÃO FINANCEIRA
  // =====================================================

  await db.financialTransaction.create({
    data: {
      amount,
      type: "DEBT_PAYMENT",
      description: "Pagamento de fiado",
      bookingId: finalBookingId,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
    },
  });

  // =====================================================
  // NOVO SALDO
  // =====================================================

  const remainingAmount = totalDebt - amount;

  // =====================================================
  // ATUALIZAR DASHBOARD
  // =====================================================

  revalidatePath("/barbeiro/dashboard");

  // =====================================================
  // RETORNO
  // =====================================================

  return {
    success: true,
    paidAmount: amount,
    remainingAmount,
  };
};
