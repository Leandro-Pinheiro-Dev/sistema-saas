"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { createDebt } from "@/app/_actions/create-debt";

interface CreateDebtButtonProps {
  userId?: string | null;
  bookingId: string;
  amount: number;
  serviceName: string;
  onSuccess?: () => void;
}

const CreateDebtButton = ({
  userId,
  bookingId,
  amount,
  serviceName,
  onSuccess,
}: CreateDebtButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleCreateDebt = () => {
    startTransition(async () => {
      try {
        if (!userId) {
          toast.error(
            "Este cliente é manual. Para registrar o fiado, precisamos salvar o nome do cliente.",
          );
          return;
        }

        await createDebt({
          userId,
          bookingId,
          amount,
          description: `Fiado - ${serviceName}`,
        });

        toast.success("Fiado registrado com sucesso.");

        setOpen(false);

        onSuccess?.();
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o fiado.",
        );
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Registrando..." : "Fiado"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
            <h2 className="text-xl font-bold">Registrar fiado</h2>

            <p className="mt-2 text-sm text-zinc-400">Serviço: {serviceName}</p>

            <p className="mt-1 text-lg font-bold text-red-400">
              R$ {amount.toFixed(2)}
            </p>

            <p className="mt-4 text-sm text-zinc-400">
              Deseja registrar este atendimento como fiado?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCreateDebt}
                disabled={isPending || !userId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Registrando..." : "Confirmar fiado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateDebtButton;
