"use client";

import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight, History } from "lucide-react";

import { getMonthlyHistory } from "../_actions/get-monthly-history";

type MonthlyHistoryData = Awaited<ReturnType<typeof getMonthlyHistory>>;

const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatMonth = (year: number, month: number) => {
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

const MonthlyHistory = () => {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [history, setHistory] = useState<MonthlyHistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await getMonthlyHistory({
          year,
          month,
        });

        if (!cancelled) {
          setHistory(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao carregar histórico mensal:", error);

        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const previousMonth = () => {
    setLoading(true);

    if (month === 1) {
      setMonth(12);
      setYear((currentYear) => currentYear - 1);
      return;
    }

    setMonth((currentMonth) => currentMonth - 1);
  };

  const nextMonth = () => {
    setLoading(true);

    if (month === 12) {
      setMonth(1);
      setYear((currentYear) => currentYear + 1);
      return;
    }

    setMonth((currentMonth) => currentMonth + 1);
  };

  return (
    <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl sm:p-6">
      {/* =====================================================
          CABEÇALHO
      ===================================================== */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-zinc-400" />

            <h2 className="text-xl font-bold text-white">Histórico mensal</h2>
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            Total recebido em cada mês.
          </p>
        </div>

        {/* =====================================================
            NAVEGAÇÃO
        ===================================================== */}

        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <button
            type="button"
            onClick={previousMonth}
            className="rounded-md p-2 transition hover:bg-zinc-800"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="min-w-45' text-center text-sm font-semibold capitalize text-white">
            {formatMonth(year, month)}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            className="rounded-md p-2 transition hover:bg-zinc-800"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* =====================================================
          TOTAL RECEBIDO
      ===================================================== */}

      {loading ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <p className="text-sm text-zinc-500">Carregando...</p>
        </div>
      ) : (
        <div className="rounded-xl border border-green-900/50 bg-linear-to-br from-green-950/40 to-zinc-950 p-6">
          <p className="text-sm font-medium text-zinc-400">Total recebido</p>

          <p className="mt-3 text-4xl font-bold text-green-400">
            {formatCurrency(history?.totalReceived ?? 0)}
          </p>

          <p className="mt-3 text-xs text-zinc-500">
            Serviços + pagamentos de fiado recebidos neste mês.
          </p>
        </div>
      )}
    </section>
  );
};

export default MonthlyHistory;
