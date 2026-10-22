"use client";

import { useEffect, useState, useTransition } from "react";

import { toast } from "sonner";

import { getCustomerDebts } from "@/app/_actions/get-customer-debts";

import AddDebtButton from "./add-debt-button";
import PayDebtButton from "./pay-debt-button";

// =====================================================
// INTERFACES
// =====================================================

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

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
    userId?: string | null;
    serviceId?: string;
    date?: Date;
    clientName?: string | null;
    clientPhone?: string | null;

    service: {
      id: string;
      name: string;
      price: number;
    };
  } | null;
}

interface CustomerDebt {
  userId: string;

  name: string;

  clientName: string;

  clientPhone: string | null;

  email: string | null;

  amount: number;

  transactions: DebtTransaction[];

  services: {
    bookingId: string | null;
    serviceName: string;
    amount: number;
    date: Date;
  }[];
}

interface CustomerDebtsProps {
  users: User[];
}

// =====================================================
// FUNÇÃO AUXILIAR
// =====================================================

const normalizePhone = (phone?: string | null) => {
  if (!phone) {
    return "";
  }

  return phone.replace(/\D/g, "");
};

// =====================================================
// COMPONENTE
// =====================================================

const CustomerDebts = ({ users }: CustomerDebtsProps) => {
  const [customers, setCustomers] = useState<CustomerDebt[]>([]);

  const [isPending, startTransition] = useTransition();

  // =====================================================
  // CLIENTE SELECIONADO PARA HISTÓRICO
  // =====================================================

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(
    null,
  );

  // =====================================================
  // CARREGAR FIADOS
  // =====================================================

  const loadDebts = () => {
    startTransition(async () => {
      try {
        const result = await getCustomerDebts();

        // =================================================
        // CONVERTER RESULTADO DO BANCO
        // =================================================

        const transactions: DebtTransaction[] = result.map((transaction) => ({
          ...transaction,

          userId: transaction.userId,

          amount: Number(transaction.amount),

          /*
           * IMPORTANTE:
           *
           * Primeiro usamos os dados que estão diretamente
           * no CustomerDebt.
           *
           * O booking fica apenas como fallback.
           *
           * Antes estava assim:
           *
           * clientName: transaction.booking?.clientName ?? null
           * clientPhone: transaction.booking?.clientPhone ?? null
           *
           * Isso fazia o cliente manual perder o telefone
           * salvo no CustomerDebt.
           */

          clientName:
            transaction.clientName ?? transaction.booking?.clientName ?? null,

          clientPhone:
            transaction.clientPhone ?? transaction.booking?.clientPhone ?? null,

          createdAt: new Date(transaction.createdAt),

          user: transaction.user
            ? {
                id: transaction.user.id,
                name: transaction.user.name,
                email: transaction.user.email,
              }
            : null,

          booking: transaction.booking
            ? {
                id: transaction.booking.id,
                userId: transaction.booking.userId,
                serviceId: transaction.booking.serviceId,
                date: transaction.booking.date,

                clientName: transaction.booking.clientName,

                clientPhone: transaction.booking.clientPhone,

                service: {
                  id: transaction.booking.service.id,
                  name: transaction.booking.service.name,
                  price: Number(transaction.booking.service.price),
                },
              }
            : null,
        }));

        // =================================================
        // AGRUPAR TRANSAÇÕES POR CLIENTE
        // =================================================

        const customerMap = new Map<string, CustomerDebt>();

        transactions.forEach((transaction) => {
          // =================================================
          // IDENTIFICAR CLIENTE
          // =================================================

          let customerKey: string | null = null;

          // =================================================
          // CLIENTE CADASTRADO
          // =================================================

          if (transaction.userId) {
            customerKey = `USER:${transaction.userId}`;
          }

          // =================================================
          // CLIENTE MANUAL COM TELEFONE
          // =================================================
          else if (transaction.clientPhone) {
            const phone = normalizePhone(transaction.clientPhone);

            customerKey = `PHONE:${phone}`;
          }

          // =================================================
          // CLIENTE MANUAL SEM TELEFONE
          // =================================================
          else if (transaction.clientName) {
            customerKey = `NAME:${transaction.clientName.trim().toLowerCase()}`;
          }

          // =================================================
          // NÃO TEM IDENTIFICAÇÃO
          // =================================================

          if (!customerKey) {
            return;
          }

          // =================================================
          // BUSCAR CLIENTE EXISTENTE
          // =================================================

          const existing = customerMap.get(customerKey);

          // =================================================
          // CALCULAR VALOR
          // =================================================

          const value =
            transaction.type === "DEBT"
              ? transaction.amount
              : -transaction.amount;

          // =================================================
          // SERVIÇO
          // =================================================

          const service =
            transaction.type === "DEBT" && transaction.booking
              ? {
                  bookingId: transaction.bookingId,

                  serviceName: transaction.booking.service.name,

                  amount: transaction.amount,

                  date: transaction.createdAt,
                }
              : null;

          // =================================================
          // CLIENTE JÁ EXISTE
          // =================================================

          if (existing) {
            existing.amount += value;

            existing.transactions.push(transaction);

            if (service) {
              existing.services.push(service);
            }

            if (!existing.clientName && transaction.clientName) {
              existing.clientName = transaction.clientName;
            }

            if (!existing.clientPhone && transaction.clientPhone) {
              existing.clientPhone = transaction.clientPhone;
            }

            return;
          }

          // =================================================
          // CRIAR NOVO CLIENTE
          // =================================================

          customerMap.set(customerKey, {
            /*
             * Cliente cadastrado:
             *
             * USER:abc123
             *
             * Cliente manual:
             *
             * PHONE:11999999999
             *
             * ou
             *
             * NAME:joao
             */

            userId: transaction.userId ?? `manual:${customerKey}`,

            name:
              transaction.user?.name ??
              transaction.clientName ??
              "Cliente manual",

            clientName:
              transaction.clientName ??
              transaction.user?.name ??
              "Cliente manual",

            clientPhone: transaction.clientPhone,

            email: transaction.user?.email ?? null,

            amount: value,

            transactions: [transaction],

            services: service ? [service] : [],
          });
        });

        // =================================================
        // CONVERTER MAP PARA ARRAY
        // =================================================

        const customerDebts = Array.from(customerMap.values());

        // =================================================
        // SOMENTE CLIENTES COM SALDO POSITIVO
        // =================================================

        const openDebts = customerDebts.filter(
          (customer) => customer.amount > 0,
        );

        setCustomers(openDebts);

        // =================================================
        // ATUALIZAR CLIENTE SELECIONADO
        // =================================================

        setSelectedCustomer((current) => {
          if (!current) {
            return null;
          }

          const updatedCustomer = customerDebts.find(
            (customer) => customer.userId === current.userId,
          );

          return updatedCustomer ?? null;
        });
      } catch (error) {
        console.error(error);

        toast.error("Não foi possível carregar os fiados.");
      }
    });
  };

  // =====================================================
  // CARREGAR AO ABRIR
  // =====================================================

  useEffect(() => {
    loadDebts();
  }, []);

  // =====================================================
  // TOTAL DOS FIADOS
  // =====================================================

  const totalDebt = customers.reduce(
    (total, customer) => total + customer.amount,
    0,
  );

  // =====================================================
  // ABRIR HISTÓRICO
  // =====================================================

  const handleOpenHistory = (customer: CustomerDebt) => {
    setSelectedCustomer(customer);
  };

  // =====================================================
  // FECHAR HISTÓRICO
  // =====================================================

  const handleCloseHistory = () => {
    setSelectedCustomer(null);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {/* =====================================================
          CONTROLE DE FIADOS
      ===================================================== */}

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* TÍTULO */}

          <div>
            <h2 className="text-xl font-bold text-white">Controle de Fiados</h2>

            <p className="mt-1 text-sm text-zinc-400">
              Valores pendentes dos clientes
            </p>
          </div>

          {/* AÇÕES */}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* ADICIONAR FIADO */}

            <AddDebtButton users={users} />

            {/* TOTAL */}

            <div className="text-right">
              <p className="text-sm text-zinc-400">Total em aberto</p>

              <p className="text-xl font-bold text-red-400">
                R$ {totalDebt.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            CONTEÚDO
        ================================================= */}

        {isPending ? (
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-500">Carregando fiados...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
            <p className="text-zinc-400">
              Nenhum cliente possui fiado em aberto.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => (
              <div
                key={customer.userId}
                className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
              >
                {/* =================================================
                    CLIENTE
                ================================================= */}

                <div className="min-w-0">
                  <p className="font-semibold text-white">{customer.name}</p>

                  <p className="text-sm text-zinc-500">
                    {customer.email ?? "Sem e-mail"}
                  </p>

                  {customer.clientPhone && (
                    <p className="mt-1 text-xs text-zinc-600">
                      {customer.clientPhone}
                    </p>
                  )}
                </div>

                {/* =================================================
                    VALOR / AÇÕES
                ================================================= */}

                <div className="flex flex-wrap items-center gap-2">
                  {/* HISTÓRICO */}

                  <button
                    type="button"
                    onClick={() => handleOpenHistory(customer)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
                  >
                    Histórico
                  </button>

                  {/* VALOR */}

                  <div className="mr-1 text-right">
                    <p className="font-bold text-red-400">
                      R$ {customer.amount.toFixed(2)}
                    </p>

                    <p className="text-xs text-zinc-500">Em aberto</p>
                  </div>

                  {/* PAGAR */}

                  <PayDebtButton
                    userId={
                      customer.userId.startsWith("manual:")
                        ? undefined
                        : customer.userId
                    }

                    bookingId={customer.transactions[0]?.bookingId ?? undefined}

                    clientName={customer.clientName || undefined}

                    clientPhone={customer.clientPhone || undefined}

                    amount={customer.amount}

                    onSuccess={loadDebts}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          MODAL DE HISTÓRICO
      ===================================================== */}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-2xl">
            {/* CABEÇALHO */}

            <div className="border-b border-zinc-800 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold">Histórico do cliente</h2>

                  <p className="mt-1 text-base text-white">
                    {selectedCustomer.name}
                  </p>

                  {selectedCustomer.clientPhone && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {selectedCustomer.clientPhone}
                    </p>
                  )}

                  {selectedCustomer.email && (
                    <p className="text-sm text-zinc-500">
                      {selectedCustomer.email}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCloseHistory}
                  className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
                >
                  Fechar
                </button>
              </div>

              {/* SALDO */}

              <div
                className={`mt-5 rounded-xl border p-4 ${
                  selectedCustomer.amount > 0
                    ? "border-red-500/20 bg-red-500/10"
                    : "border-green-500/20 bg-green-500/10"
                }`}
              >
                <p className="text-sm text-zinc-400">Saldo atual</p>

                <p
                  className={`mt-1 text-2xl font-bold ${
                    selectedCustomer.amount > 0
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  R$ {Math.max(selectedCustomer.amount, 0).toFixed(2)}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {selectedCustomer.amount > 0
                    ? "Cliente possui valor em aberto"
                    : "Cliente está quitado"}
                </p>
              </div>
            </div>

            {/* HISTÓRICO */}

            <div className="overflow-y-auto p-6">
              {selectedCustomer.transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
                  <p className="text-sm text-zinc-500">
                    Nenhuma movimentação encontrada.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...selectedCustomer.transactions]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )
                    .map((transaction) => {
                      const isDebt = transaction.type === "DEBT";

                      const date = new Date(
                        transaction.createdAt,
                      ).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });

                      const time = new Date(
                        transaction.createdAt,
                      ).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={transaction.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* INFORMAÇÕES */}

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

                              {/* SERVIÇO */}

                              {transaction.booking?.service && (
                                <p className="mt-1 text-xs text-zinc-500">
                                  Serviço: {transaction.booking.service.name}
                                </p>
                              )}

                              {/* CLIENTE MANUAL */}

                              {transaction.clientName && (
                                <p className="mt-1 text-xs text-zinc-600">
                                  Cliente: {transaction.clientName}
                                </p>
                              )}

                              {transaction.clientPhone && (
                                <p className="mt-1 text-xs text-zinc-600">
                                  Telefone: {transaction.clientPhone}
                                </p>
                              )}
                            </div>

                            {/* VALOR */}

                            <p
                              className={`whitespace-nowrap font-bold ${
                                isDebt ? "text-red-400" : "text-green-400"
                              }`}
                            >
                              {isDebt ? "+" : "-"} R${" "}
                              {transaction.amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* RODAPÉ */}

            <div className="border-t border-zinc-800 p-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCloseHistory}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
                >
                  Fechar histórico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerDebts;
