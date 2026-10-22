"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateBooking } from "@/app/_actions/update-booking";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Service {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  userId: string | null;
  clientName: string | null;
  clientPhone: string | null;
  serviceId: string;
  date: Date;
}

interface EditBookingButtonProps {
  booking: Booking;
  users: User[];
  services: Service[];
}

type ClientType = "registered" | "manual";

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

const EditBookingButton = ({
  booking,
  users,
  services,
}: EditBookingButtonProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // =====================================================
  // TIPO DE CLIENTE
  // =====================================================

  const [clientType, setClientType] = useState<ClientType>(
    booking.userId ? "registered" : "manual",
  );

  // =====================================================
  // CLIENTE CADASTRADO
  // =====================================================

  const [userId, setUserId] = useState(booking.userId ?? "");

  // =====================================================
  // CLIENTE MANUAL
  // =====================================================

  const [clientName, setClientName] = useState(booking.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(booking.clientPhone ?? "");

  // =====================================================
  // SERVIÇO
  // =====================================================

  const [serviceId, setServiceId] = useState(booking.serviceId);

  // =====================================================
  // DATA / HORÁRIO
  // =====================================================

  const initialDate = new Date(booking.date);

  const [date, setDate] = useState(formatDateForInput(initialDate));
  const [time, setTime] = useState(formatTimeForInput(initialDate));

  // =====================================================
  // FORMATAR DATA PARA INPUT
  //
  // Sempre usando horário de Brasília.
  // =====================================================

  function formatDateForInput(date: Date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: BRAZIL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return `${year}-${month}-${day}`;
  }

  // =====================================================
  // FORMATAR HORÁRIO PARA INPUT
  //
  // Sempre usando horário de Brasília.
  // =====================================================

  function formatTimeForInput(date: Date) {
    return date.toLocaleTimeString("pt-BR", {
      timeZone: BRAZIL_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // =====================================================
  // ATUALIZAR AGENDAMENTO
  // =====================================================

  const handleUpdate = () => {
    // -----------------------------------------------------
    // CAMPOS GERAIS
    // -----------------------------------------------------

    if (!serviceId || !date || !time) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    // -----------------------------------------------------
    // CLIENTE CADASTRADO
    // -----------------------------------------------------

    if (clientType === "registered" && !userId) {
      toast.error("Selecione um cliente cadastrado.");
      return;
    }

    // -----------------------------------------------------
    // CLIENTE MANUAL
    // -----------------------------------------------------

    if (clientType === "manual" && !clientName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    // -----------------------------------------------------
    // CRIAR DATA
    //
    // O horário informado pelo barbeiro é horário de Brasília.
    //
    // Exemplo:
    // 16:00 BR
    // vira:
    // 16:00-03:00
    //
    // Isso garante o mesmo horário na Vercel e no banco.
    // -----------------------------------------------------

    const selectedDate = new Date(`${date}T${time}:00-03:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      toast.error("Data ou horário inválido.");
      return;
    }

    // =====================================================
    // ATUALIZAÇÃO
    // =====================================================

    startTransition(async () => {
      try {
        await updateBooking({
          bookingId: booking.id,
          serviceId,
          date: selectedDate,

          // Cliente cadastrado
          userId: clientType === "registered" ? userId : undefined,

          // Cliente manual
          clientName: clientType === "manual" ? clientName.trim() : undefined,

          clientPhone:
            clientType === "manual"
              ? clientPhone.trim() || undefined
              : undefined,
        });

        toast.success("Agendamento atualizado com sucesso.");

        setOpen(false);

        window.location.reload();
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Não foi possível atualizar o agendamento.");
        }
      }
    });
  };

  // =====================================================
  // BOTÃO EDITAR
  // =====================================================

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          const bookingDate = new Date(booking.date);

          setClientType(booking.userId ? "registered" : "manual");
          setUserId(booking.userId ?? "");
          setClientName(booking.clientName ?? "");
          setClientPhone(booking.clientPhone ?? "");
          setServiceId(booking.serviceId);
          setDate(formatDateForInput(bookingDate));
          setTime(formatTimeForInput(bookingDate));

          setOpen(true);
        }}

        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
      >
        Editar
      </button>
    );
  }

  // =====================================================
  // MODAL
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white shadow-2xl">
        {/* =====================================================
            CABEÇALHO
        ===================================================== */}

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Editar agendamento</h2>

          <p className="mt-1 text-sm text-zinc-400">
            Altere os dados do agendamento abaixo.
          </p>
        </div>

        <div className="space-y-5">
          {/* =====================================================
              TIPO DE CLIENTE
          ===================================================== */}

          <div>
            <label className="mb-3 block text-sm font-medium text-zinc-300">
              Tipo de cliente
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* CLIENTE CADASTRADO */}

              <button
                type="button"
                onClick={() => {
                  setClientType("registered");

                  setClientName("");
                  setClientPhone("");
                }}
                className={`rounded-lg border p-3 text-sm font-medium transition ${
                  clientType === "registered"
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Cliente cadastrado
              </button>

              {/* CLIENTE MANUAL */}

              <button
                type="button"
                onClick={() => {
                  setClientType("manual");

                  setUserId("");
                }}
                className={`rounded-lg border p-3 text-sm font-medium transition ${
                  clientType === "manual"
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                Cliente manual
              </button>
            </div>
          </div>

          {/* =====================================================
              CLIENTE CADASTRADO
          ===================================================== */}

          {clientType === "registered" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Cliente
              </label>

              <select
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white"
              >
                <option value="" className="bg-zinc-950 text-white">
                  Selecione um cliente
                </option>

                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                    className="bg-zinc-950 text-white"
                  >
                    {user.name ?? user.email ?? "Cliente"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* =====================================================
              CLIENTE MANUAL
          ===================================================== */}

          {clientType === "manual" && (
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Nome do cliente
                </label>

                <input
                  type="text"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Ex.: João da Silva"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white placeholder:text-zinc-600 outline-none transition focus:border-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Telefone
                  <span className="ml-1 text-xs text-zinc-500">(opcional)</span>
                </label>

                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white placeholder:text-zinc-600 outline-none transition focus:border-white"
                />
              </div>
            </div>
          )}

          {/* =====================================================
              SERVIÇO
          ===================================================== */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Serviço
            </label>

            <select
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white"
            >
              <option value="" className="bg-zinc-950 text-white">
                Selecione um serviço
              </option>

              {services.map((service) => (
                <option
                  key={service.id}
                  value={service.id}
                  className="bg-zinc-950 text-white"
                >
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          {/* =====================================================
              DATA
          ===================================================== */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Data
            </label>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white"
            />
          </div>

          {/* =====================================================
              HORÁRIO
          ===================================================== */}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Horário
            </label>

            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-white outline-none transition focus:border-white"
            />
          </div>
        </div>

        {/* =====================================================
            BOTÕES
        ===================================================== */}

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleUpdate}
            disabled={isPending}
            className="rounded-lg bg-white px-5 py-2 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBookingButton;
