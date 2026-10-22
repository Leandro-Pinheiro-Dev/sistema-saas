"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { createDebt } from "@/app/_actions/create-debt";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface AddDebtButtonProps {
  users: User[];
}

type CustomerType = "REGISTERED" | "MANUAL";

const AddDebtButton = ({ users }: AddDebtButtonProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [customerType, setCustomerType] = useState<CustomerType>("REGISTERED");

  const [userId, setUserId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setCustomerType("REGISTERED");
    setUserId("");
    setClientName("");
    setClientPhone("");
    setAmount("");
    setDescription("");
  };

  // =====================================================
  // FECHAR
  // =====================================================

  const handleClose = () => {
    if (isPending) return;

    setOpen(false);
    resetForm();
  };

  // =====================================================
  // VALOR
  // =====================================================

  const parseAmount = (value: string) => {
    return Number(value.replace(/\./g, "").replace(",", "."));
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = () => {
    // ---------------------------------------------------
    // CLIENTE CADASTRADO
    // ---------------------------------------------------

    if (customerType === "REGISTERED" && !userId) {
      toast.error("Selecione um cliente.");
      return;
    }

    // ---------------------------------------------------
    // CLIENTE MANUAL
    // ---------------------------------------------------

    if (customerType === "MANUAL" && !clientName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    const numericAmount = parseAmount(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    startTransition(async () => {
      try {
        await createDebt({
          userId: customerType === "REGISTERED" ? userId : undefined,

          clientName: customerType === "MANUAL" ? clientName.trim() : undefined,

          clientPhone:
            customerType === "MANUAL" && clientPhone.trim()
              ? clientPhone.trim()
              : undefined,

          amount: numericAmount,

          description: description.trim() || undefined,
        });

        toast.success("Fiado adicionado com sucesso.");

        setOpen(false);
        resetForm();

        window.location.reload();
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Não foi possível adicionar o fiado.");
        }
      }
    });
  };

  // =====================================================
  // BOTÃO PRINCIPAL
  // =====================================================

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
      >
        + Adicionar Fiado
      </button>
    );
  }

  // =====================================================
  // MODAL
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <div className="mb-6">
          <h2 className="text-xl font-bold">Adicionar Fiado</h2>

          <p className="mt-1 text-sm text-zinc-400">
            Registre um novo valor pendente para o cliente.
          </p>
        </div>

        {/* =================================================
            TIPO DE CLIENTE
        ================================================= */}

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-zinc-950 p-1">
          <button
            type="button"
            onClick={() => setCustomerType("REGISTERED")}
            disabled={isPending}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              customerType === "REGISTERED"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Cliente cadastrado
          </button>

          <button
            type="button"
            onClick={() => setCustomerType("MANUAL")}
            disabled={isPending}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              customerType === "MANUAL"
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Cliente manual
          </button>
        </div>

        <div className="space-y-5">
          {/* =================================================
              CLIENTE CADASTRADO
          ================================================= */}

          {customerType === "REGISTERED" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Cliente
              </label>

              <select
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecione um cliente</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name ?? user.email ?? "Cliente"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* =================================================
              CLIENTE MANUAL
          ================================================= */}

          {customerType === "MANUAL" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Nome do cliente
                </label>

                <input
                  type="text"
                  placeholder="Ex.: João da Silva"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Telefone
                </label>

                <input
                  type="text"
                  inputMode="tel"
                  placeholder="Ex.: (11) 99999-9999"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </>
          )}

          {/* =================================================
              VALOR
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Valor
            </label>

            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex.: 35,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* =================================================
              DESCRIÇÃO
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Descrição
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: Corte + barba"
              rows={3}
              disabled={isPending}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {/* =================================================
            BOTÕES
        ================================================= */}

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
            className="rounded-lg bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDebtButton;
