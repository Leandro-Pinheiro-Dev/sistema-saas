"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { payDebt } from "@/app/_actions/pay-debt";

interface PayDebtButtonProps {
  userId?: string | null;
  bookingId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  amount: number;
  onSuccess?: () => void;
}

const PayDebtButton = ({
  userId,
  bookingId,
  clientName,
  clientPhone,
  amount,
  onSuccess,
}: PayDebtButtonProps) => {
  const [open, setOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  // =====================================================
  // FECHAR MODAL
  // =====================================================

  const handleClose = () => {
    if (isPending) {
      return;
    }

    setOpen(false);
    setPaymentAmount("");
  };

  // =====================================================
  // FORMATAR VALOR
  // =====================================================

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // =====================================================
  // CONVERTER VALOR DIGITADO
  // =====================================================

  const parsePaymentAmount = (value: string) => {
    /**
     * Aceita:
     *
     * 35
     * 35,00
     * 35.00
     * 1.500,00
     */

    const normalized = value.trim().replace(/\./g, "").replace(",", ".");

    return Number(normalized);
  };

  // =====================================================
  // PAGAR
  // =====================================================

  const handleSubmit = () => {
    const numericAmount = parsePaymentAmount(paymentAmount);

    // ===================================================
    // VALOR INVÁLIDO
    // ===================================================

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    // ===================================================
    // PAGAMENTO MAIOR QUE O SALDO
    // ===================================================

    if (numericAmount > amount) {
      toast.error(
        `O pagamento não pode ser maior que o saldo de R$ ${formatCurrency(
          amount,
        )}.`,
      );

      return;
    }

    // ===================================================
    // VERIFICAR IDENTIFICAÇÃO
    // ===================================================

    if (!userId && !bookingId && !clientName && !clientPhone) {
      toast.error("Não foi possível identificar o cliente.");

      return;
    }

    // ===================================================
    // DEBUG
    // ===================================================

    console.log("DADOS DO PAGAMENTO:", {
      userId,
      bookingId,
      clientName,
      clientPhone,
      amount,
      numericAmount,
    });

    // ===================================================
    // REGISTRAR PAGAMENTO
    // ===================================================

    startTransition(async () => {
      try {
        const result = await payDebt({
          userId: userId ?? undefined,
          bookingId: bookingId ?? undefined,
          clientName: clientName ?? undefined,
          clientPhone: clientPhone ?? undefined,
          amount: numericAmount,
        });

        // ===============================================
        // PAGAMENTO TOTAL
        // ===============================================

        if (result.remainingAmount <= 0) {
          toast.success("Fiado pago completamente.");
        }

        // ===============================================
        // PAGAMENTO PARCIAL
        // ===============================================
        else {
          toast.success(
            `Pagamento registrado. Saldo restante: R$ ${formatCurrency(
              result.remainingAmount,
            )}.`,
          );
        }

        // ===============================================
        // FECHAR MODAL
        // ===============================================

        setOpen(false);
        setPaymentAmount("");

        // ===============================================
        // ATUALIZAR COMPONENTE PAI
        // ===============================================

        onSuccess?.();
      } catch (error) {
        console.error("ERRO AO REGISTRAR PAGAMENTO:", error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o pagamento.",
        );
      }
    });
  };

  // =====================================================
  // PAGAR VALOR TOTAL
  // =====================================================

  const handlePayFullAmount = () => {
    setPaymentAmount(amount.toFixed(2).replace(".", ","));
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {/* =================================================
          BOTÃO PAGAR
      ================================================= */}

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Pagar
      </button>

      {/* =================================================
          MODAL
      ================================================= */}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
            {/* ===========================================
                CABEÇALHO
            =========================================== */}

            <div className="mb-6">
              <h2 className="text-xl font-bold">Registrar pagamento</h2>

              <p className="mt-1 text-sm text-zinc-400">
                Informe quanto o cliente está pagando.
              </p>

              {clientName && (
                <p className="mt-3 text-sm font-medium text-zinc-200">
                  Cliente: {clientName}
                </p>
              )}

              {clientPhone && (
                <p className="mt-1 text-xs text-zinc-500">{clientPhone}</p>
              )}
            </div>

            {/* ===========================================
                SALDO ATUAL
            =========================================== */}

            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-zinc-400">Saldo em aberto</p>

              <p className="mt-1 text-2xl font-bold text-red-400">
                R$ {formatCurrency(amount)}
              </p>
            </div>

            {/* ===========================================
                VALOR DO PAGAMENTO
            =========================================== */}

            <div className="mt-5">
              <label
                htmlFor="paymentAmount"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Valor do pagamento
              </label>

              <input
                id="paymentAmount"
                type="text"
                inputMode="decimal"
                placeholder={`Ex.: ${formatCurrency(amount)}`}
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* ===========================================
                PAGAR TUDO
            =========================================== */}

            <button
              type="button"
              onClick={handlePayFullAmount}
              disabled={isPending}
              className="mt-3 text-sm text-green-400 transition hover:text-green-300 disabled:opacity-50"
            >
              Pagar valor total de R$ {formatCurrency(amount)}
            </button>

            {/* ===========================================
                BOTÕES
            =========================================== */}

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Registrando..." : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PayDebtButton;
