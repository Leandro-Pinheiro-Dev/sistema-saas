"use client";

import { useState, useTransition } from "react";

import { toast } from "sonner";

import { updateBookingStatus } from "@/app/_actions/update-booking-status";
import { completeBooking } from "@/app/_actions/complete-booking";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface BookingStatusButtonProps {
  bookingId: string;
  status: BookingStatus;
}

const statusOptions: {
  value: BookingStatus;
  label: string;
}[] = [
  {
    value: "PENDING",
    label: "Pendente",
  },
  {
    value: "CONFIRMED",
    label: "Confirmado",
  },
  {
    value: "COMPLETED",
    label: "Concluído",
  },
  {
    value: "CANCELLED",
    label: "Cancelado",
  },
];

const BookingStatusButton = ({
  bookingId,
  status,
}: BookingStatusButtonProps) => {
  const [isPending, startTransition] = useTransition();

  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const handleChange = (newStatus: BookingStatus) => {
    // =====================================================
    // CONCLUÍDO
    // =====================================================

    if (newStatus === "COMPLETED") {
      setShowPaymentOptions(true);
      return;
    }

    // =====================================================
    // OUTROS STATUS
    // =====================================================

    startTransition(async () => {
      try {
        await updateBookingStatus({
          bookingId,
          status: newStatus,
        });

        toast.success("Status atualizado com sucesso.");
      } catch (error) {
        console.error(error);
        toast.error("Não foi possível atualizar o status.");
      }
    });
  };

  const handleComplete = (paymentType: "PAID" | "DEBT") => {
    startTransition(async () => {
      try {
        await completeBooking({
          bookingId,
          paymentType,
        });

        setShowPaymentOptions(false);

        if (paymentType === "DEBT") {
          toast.success("Serviço concluído e fiado registrado.");
        } else {
          toast.success("Serviço concluído como pago.");
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível concluir o agendamento.",
        );
      }
    });
  };

  return (
    <>
      <select
        value={status}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value as BookingStatus)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* =====================================================
          ESCOLHA DO PAGAMENTO
      ===================================================== */}

      {showPaymentOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white">
              Finalizar atendimento
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Como o cliente realizou o pagamento?
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleComplete("PAID")}
                className="rounded-xl border border-green-700/50 bg-green-600/10 px-4 py-3 font-semibold text-green-400 transition hover:bg-green-600/20 disabled:opacity-50"
              >
                Pago
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => handleComplete("DEBT")}
                className="rounded-xl border border-red-700/50 bg-red-600/10 px-4 py-3 font-semibold text-red-400 transition hover:bg-red-600/20 disabled:opacity-50"
              >
                Fiado
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowPaymentOptions(false)}
                className="rounded-xl border border-zinc-700 px-4 py-3 font-semibold text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>

            {isPending && (
              <p className="mt-4 text-center text-sm text-zinc-500">
                Processando...
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BookingStatusButton;
