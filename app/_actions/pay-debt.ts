"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { requireBusinessStaff } from "@/lib/permissions/membership";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

interface PayDebtParams {
  barbershopId: string;
  userId?: string | null;
  bookingId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  amount: number;
}
/**
 * Mantém somente os números do telefone.
 */
const normalizePhone = (phone?: string | null) => {
  if (!phone) {
    return "";
  }

  return phone.replace(/\D/g, "");
};

/**
 * Identifica um cliente manual usando o identificador virtual.
 */
const isManualUserId = (userId?: string | null) => {
  return userId?.startsWith("manual:PHONE:") ?? false;
};

/**
 * Extrai o telefone do identificador de cliente manual.
 */
const getPhoneFromManualUserId = (userId?: string | null) => {
  if (!isManualUserId(userId)) {
    return "";
  }

  return normalizePhone(userId?.replace("manual:PHONE:", ""));
};

export const payDebt = async ({
  barbershopId,
  userId,
  bookingId,
  clientName,
  clientPhone,
  amount,
}: PayDebtParams) => {
  // 1. Autenticação
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // 3. Validar valor
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.");
  }

  // 4. Validar identificação do cliente
  if (!userId && !bookingId && !clientName && !clientPhone) {
    throw new Error("Não foi possível identificar o cliente do pagamento.");
  }
  await requireBusinessStaff(barbershopId);
  // 6. Identificar cliente manual
  const manualPhoneFromUserId = getPhoneFromManualUserId(userId);
  const normalizedClientPhone = normalizePhone(clientPhone);
  const manualPhone = manualPhoneFromUserId || normalizedClientPhone;
  const manualClient = isManualUserId(userId);

  // 7. Consultar movimentações somente da empresa autorizada.
  const selectFields = {
    id: true,
    userId: true,
    bookingId: true,
    barbershopId: true,
    clientName: true,
    clientPhone: true,
    amount: true,
    type: true,
    description: true,
    createdAt: true,
  } as const;

  let transactions;

  if (manualClient) {
    const manualTransactions = await db.customerDebt.findMany({
      where: {
        barbershopId,
        userId: null,
      },
      select: selectFields,
      orderBy: {
        createdAt: "asc",
      },
    });

    transactions = manualTransactions.filter((transaction) => {
      const transactionPhone = normalizePhone(transaction.clientPhone);

      return transactionPhone === manualPhone && manualPhone !== "";
    });
  } else if (userId) {
    transactions = await db.customerDebt.findMany({
      where: {
        barbershopId,
        userId,
      },
      select: selectFields,
      orderBy: {
        createdAt: "asc",
      },
    });
  } else if (bookingId) {
    transactions = await db.customerDebt.findMany({
      where: {
        barbershopId,
        bookingId,
      },
      select: selectFields,
      orderBy: {
        createdAt: "asc",
      },
    });
  } else {
    const manualTransactions = await db.customerDebt.findMany({
      where: {
        barbershopId,
        userId: null,
      },
      select: selectFields,
      orderBy: {
        createdAt: "asc",
      },
    });

    const requestedName = clientName?.trim().toLowerCase() || "";
    const requestedPhone = normalizedClientPhone;

    transactions = manualTransactions.filter((transaction) => {
      const sameName =
        !requestedName ||
        transaction.clientName?.trim().toLowerCase() === requestedName;

      const samePhone =
        !requestedPhone ||
        normalizePhone(transaction.clientPhone) === requestedPhone;

      return sameName && samePhone;
    });
  }

  if (transactions.length === 0) {
    throw new Error(
      "Nenhuma movimentação encontrada para este cliente nesta empresa.",
    );
  }

  // 8. Validar o agendamento, caso tenha sido informado.
  if (bookingId) {
    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        barbershopId,
      },
      select: {
        id: true,
      },
    });

    if (!booking) {
      throw new Error("O agendamento não pertence à empresa selecionada.");
    }
  }

  // 9. Calcular saldo devedor.
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

  if (totalDebt <= 0) {
    throw new Error("Este cliente não possui fiado em aberto.");
  }

  if (amount > totalDebt) {
    throw new Error(
      `O pagamento não pode ser maior que a dívida de R$ ${totalDebt.toFixed(2)}.`,
    );
  }

  // 10. Recuperar os dados da última movimentação.
  const lastTransaction = transactions[transactions.length - 1];

  const finalClientName =
    clientName?.trim() || lastTransaction?.clientName || null;

  const finalClientPhone =
    clientPhone?.trim() || lastTransaction?.clientPhone || null;

  const finalBookingId = bookingId ?? lastTransaction?.bookingId ?? null;

  const finalUserId = manualClient
    ? null
    : (userId ?? lastTransaction?.userId ?? null);

  // 11. Registrar pagamento e movimento financeiro
  // atomicamente para evitar gravar somente um dos registros.
  await db.$transaction(async (tx) => {
    await tx.customerDebt.create({
      data: {
        barbershopId,
        userId: finalUserId,
        bookingId: finalBookingId,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        amount,
        type: "PAYMENT",
        description: "Pagamento de fiado",
      },
    });

    await tx.financialTransaction.create({
      data: {
        barbershopId,
        amount,
        type: "DEBT_PAYMENT",
        description: "Pagamento de fiado",
        bookingId: finalBookingId,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
      },
    });
  });

  // 12. Atualizar dashboard
  revalidatePath("/barbeiro/dashboard");

  // 13. Retornar valores
  return {
    success: true,
    paidAmount: amount,
    remainingAmount: totalDebt - amount,
  };
};
