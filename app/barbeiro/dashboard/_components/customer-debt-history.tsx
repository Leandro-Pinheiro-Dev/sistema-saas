"use client";

import { useState } from "react";

// =====================================================
// TRANSAÇÃO
// =====================================================

interface DebtTransaction {
  id: string;
  userId: string | null;
  bookingId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  amount: number;
  type: "DEBT" | "PAYMENT";
  description: string | null;
  createdAt: Date;

  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;

  booking: {
    id?: string;
    service: {
      id: string;
      name: string;
      price: number;
    };
  } | null;
}

// =====================================================
// PROPS
// =====================================================

interface CustomerDebtHistoryProps {
  name: string;
  phone?: string | null;
  email?: string | null;
  amount: number;
  transactions: DebtTransaction[];
}

// =====================================================
// COMPONENTE
// =====================================================

const CustomerDebtHistory = ({
  name,
  phone,
  email,
  amount,
  transactions,
}: CustomerDebtHistoryProps) => {
  const [open, setOpen] = useState(false);

  // =====================================================
  // ORDENAR DO MAIS RECENTE PARA O MAIS ANTIGO
  // =====================================================

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // =====================================================
  // BOTÃO
  // =====================================================

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
      >
        Histórico
      </button>
    );
  }

  // =====================================================
  // MODAL
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-2xl">
        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <div className="border-b border-zinc-800 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Histórico do cliente</h2>

              <p className="mt-1 text-sm text-zinc-300">{name}</p>

              {phone && <p className="mt-1 text-sm text-zinc-500">{phone}</p>}

              {email && <p className="text-sm text-zinc-500">{email}</p>}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
            >
              Fechar
            </button>
          </div>

          {/* =================================================
              SALDO
          ================================================= */}

          <div
            className={`mt-5 rounded-xl border p-4 ${
              amount > 0
                ? "border-red-500/20 bg-red-500/10"
                : "border-green-500/20 bg-green-500/10"
            }`}
          >
            <p className="text-sm text-zinc-400">Saldo atual</p>

            <p
              className={`mt-1 text-2xl font-bold ${
                amount > 0 ? "text-red-400" : "text-green-400"
              }`}
            >
              R$ {amount.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {amount > 0
                ? "Cliente possui valor em aberto"
                : "Cliente está quitado"}
            </p>
          </div>
        </div>

        {/* =================================================
            HISTÓRICO
        ================================================= */}

        <div className="overflow-y-auto p-6">
          {sortedTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
              <p className="text-sm text-zinc-500">
                Nenhuma movimentação encontrada.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTransactions.map((transaction) => {
                const isDebt = transaction.type === "DEBT";

                const date = new Date(transaction.createdAt).toLocaleDateString(
                  "pt-BR",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  },
                );

                const time = new Date(transaction.createdAt).toLocaleTimeString(
                  "pt-BR",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );

                return (
                  <div
                    key={transaction.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* =================================================
                          INFORMAÇÕES
                      ================================================= */}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${
                              isDebt
                                ? "bg-red-500/10 text-red-400"
                                : "bg-green-500/10 text-green-400"
                            }`}
                          >
                            {isDebt ? "FIADO" : "PAGAMENTO"}
                          </span>

                          <span className="text-xs text-zinc-500">
                            {date} às {time}
                          </span>
                        </div>

                        <p className="mt-3 font-medium text-white">
                          {transaction.description ??
                            transaction.booking?.service.name ??
                            (isDebt ? "Fiado" : "Pagamento de fiado")}
                        </p>

                        {transaction.booking?.service && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Serviço: {transaction.booking.service.name}
                          </p>
                        )}
                      </div>

                      {/* =================================================
                          VALOR
                      ================================================= */}

                      <p
                        className={`whitespace-nowrap font-bold ${
                          isDebt ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {isDebt ? "+" : "-"} R$ {transaction.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =================================================
            RODAPÉ
        ================================================= */}

        <div className="border-t border-zinc-800 p-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700"
          >
            Fechar histórico
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDebtHistory;
