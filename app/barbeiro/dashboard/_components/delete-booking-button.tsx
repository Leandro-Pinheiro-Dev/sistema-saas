"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { deleteBooking } from "@/app/_actions/delete-booking";

interface DeleteBookingButtonProps {
  bookingId: string;
}

const DeleteBookingButton = ({ bookingId }: DeleteBookingButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteBooking(bookingId);

        toast.success("Agendamento excluído com sucesso.");

        setConfirming(false);

        window.location.reload();
      } catch (error) {
        console.error(error);

        toast.error("Não foi possível excluir o agendamento.");
      }
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={isPending}
        className="rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-900 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Excluir
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
      >
        Cancelar
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Excluindo..." : "Confirmar"}
      </button>
    </div>
  );
};

export default DeleteBookingButton;
