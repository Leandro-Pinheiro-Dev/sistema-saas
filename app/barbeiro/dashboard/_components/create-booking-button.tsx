"use client";

import { useMemo, useState, useTransition } from "react";

import { toast } from "sonner";

import { createBookingByBarber } from "@/app/_actions/create-booking-by-barber";
import { calculateBookingDiscount } from "@/app/utils/booking-discount";
import {
  getPricedBookingServices,
  isHaircutService,
} from "@/app/utils/booking-pricing";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface CreateBookingButtonProps {
  users: User[];
  services: Service[];
  initialDate?: Date;
}

type ClientType = "registered" | "manual";

const CreateBookingButton = ({
  users,
  services,
  initialDate,
}: CreateBookingButtonProps) => {
  const [open, setOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const [clientType, setClientType] = useState<ClientType>("registered");

  const [userId, setUserId] = useState("");

  const [clientName, setClientName] = useState("");

  const [clientPhone, setClientPhone] = useState("");

  // =====================================================
  // SERVIÇOS SELECIONADOS
  // =====================================================

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // =====================================================
  // CORTE INFANTIL
  // =====================================================

  // Quando true, somente o serviço
  // "Corte de Cabelo" passa de R$35 para R$30.
  const [isChild, setIsChild] = useState(false);

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  // =====================================================
  // FORMATAR DATA PARA INPUT
  // =====================================================

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // ABRIR MODAL
  // =====================================================

  const handleOpen = () => {
    setUserId(users[0]?.id ?? "");

    // Seleciona o primeiro serviço inicialmente.
    setSelectedServiceIds(services[0]?.id ? [services[0].id] : []);

    // Sempre começa como corte normal.
    setIsChild(false);

    if (initialDate) {
      setDate(formatDateForInput(initialDate));

      setTime(
        initialDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    } else {
      const now = new Date();

      setDate(formatDateForInput(now));

      setTime(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    }

    setOpen(true);
  };

  // =====================================================
  // SERVIÇOS SELECIONADOS
  // =====================================================

  const selectedServices = useMemo(() => {
    return services.filter((service) =>
      selectedServiceIds.includes(service.id),
    );
  }, [services, selectedServiceIds]);

  // =====================================================
  // VERIFICAR SE TEM CORTE DE CABELO
  // =====================================================

  const hasHaircut = useMemo(() => {
    return selectedServices.some((service) => isHaircutService(service.name));
  }, [selectedServices]);

  // =====================================================
  // REGRA ATIVA DO CORTE INFANTIL
  // =====================================================

  // Mesmo que isChild esteja true, a regra só é aplicada
  // se o Corte de Cabelo estiver selecionado.
  const activeChildPricing = isChild && hasHaircut;

  // =====================================================
  // CALCULAR PREÇOS DOS SERVIÇOS
  // =====================================================

  const pricedSelectedServices = useMemo(() => {
    return getPricedBookingServices(selectedServices, activeChildPricing);
  }, [selectedServices, activeChildPricing]);

  // =====================================================
  // CALCULAR DESCONTO
  // =====================================================

  // O desconto do combo é calculado DEPOIS do preço infantil.

  // Exemplo:
  //
  // Corte infantil = R$30
  // Barba = R$35
  //
  // Subtotal = R$65
  //
  // Combo Corte + Barba = -R$10
  //
  // Total = R$55

  const discountResult = useMemo(() => {
    return calculateBookingDiscount(
      pricedSelectedServices.map((service) => ({
        name: service.name,
        price: service.price,
      })),
    );
  }, [pricedSelectedServices]);

  // =====================================================
  // SELECIONAR / DESMARCAR SERVIÇO
  // =====================================================

  const handleToggleService = (serviceId: string) => {
    const selectedService = services.find(
      (service) => service.id === serviceId,
    );

    const isCurrentlySelected = selectedServiceIds.includes(serviceId);

    // Se estamos removendo o Corte de Cabelo,
    // desativamos também o preço infantil.
    if (
      selectedService &&
      isCurrentlySelected &&
      isHaircutService(selectedService.name)
    ) {
      setIsChild(false);
    }

    setSelectedServiceIds((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }

      return [...current, serviceId];
    });
  };

  // =====================================================
  // CRIAR AGENDAMENTO
  // =====================================================

  const handleCreate = () => {
    // ===================================================
    // SERVIÇOS
    // ===================================================

    if (selectedServiceIds.length === 0 || !date || !time) {
      toast.error("Selecione pelo menos um serviço, a data e o horário.");

      return;
    }

    // ===================================================
    // CLIENTE CADASTRADO
    // ===================================================

    if (clientType === "registered" && !userId) {
      toast.error("Selecione um cliente cadastrado.");

      return;
    }

    // ===================================================
    // CLIENTE MANUAL
    // ===================================================

    if (clientType === "manual" && !clientName.trim()) {
      toast.error("Informe o nome do cliente.");

      return;
    }

    // ===================================================
    // ENVIAR PARA O SERVIDOR
    // ===================================================

    startTransition(async () => {
      try {
        const result = await createBookingByBarber({
          serviceIds: selectedServiceIds,

          date,

          time,

          userId: clientType === "registered" ? userId : undefined,

          clientName: clientType === "manual" ? clientName.trim() : undefined,

          clientPhone:
            clientType === "manual"
              ? clientPhone.trim() || undefined
              : undefined,

          // Envia somente se o Corte de Cabelo estiver
          // realmente selecionado.
          //
          // O servidor também recalcula e valida o preço.
          isChild: activeChildPricing,
        });

        // =================================================
        // MENSAGEM DE SUCESSO
        // =================================================

        if (result.discount > 0) {
          toast.success(
            `Agendamento criado! Desconto de R$ ${result.discount.toFixed(
              2,
            )} aplicado.`,
          );
        } else {
          toast.success("Agendamento criado com sucesso.");
        }

        // Limpa a opção infantil para o próximo agendamento.
        setIsChild(false);

        setOpen(false);

        window.location.reload();
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Não foi possível criar o agendamento.");
        }
      }
    });
  };

  // =====================================================
  // BOTÃO NOVO AGENDAMENTO
  // =====================================================

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
      >
        + Novo agendamento
      </button>
    );
  }

  // =====================================================
  // MODAL
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-2xl">
        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <div className="border-b border-zinc-800 p-6">
          <h2 className="text-xl font-bold text-white">Novo agendamento</h2>

          <p className="mt-1 text-sm text-zinc-400">
            Preencha os dados do cliente e do atendimento.
          </p>
        </div>

        <div className="space-y-5 p-6">
          {/* =================================================
              TIPO DE CLIENTE
          ================================================= */}

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

          {/* =================================================
              CLIENTE CADASTRADO
          ================================================= */}

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
                <option value="" className="bg-zinc-950">
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

          {/* =================================================
              CLIENTE MANUAL
          ================================================= */}

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

          {/* =================================================
              SERVIÇOS
          ================================================= */}

          <div>
            <label className="mb-3 block text-sm font-medium text-zinc-300">
              Serviços
            </label>

            <div className="space-y-2">
              {services.map((service) => {
                const selected = selectedServiceIds.includes(service.id);

                const pricedService = pricedSelectedServices.find(
                  (item) => item.id === service.id,
                );

                const displayPrice = pricedService
                  ? pricedService.price
                  : Number(service.price);

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleToggleService(service.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-500"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                          selected
                            ? "border-black bg-black text-white"
                            : "border-zinc-600"
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </span>

                      <span className="font-medium">{service.name}</span>
                    </div>

                    <span
                      className={`font-semibold ${
                        selected ? "text-black" : "text-green-400"
                      }`}
                    >
                      R$ {displayPrice.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* =================================================
                CORTE INFANTIL
            ================================================= */}

            {hasHaircut && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-950 p-4 transition hover:border-zinc-500">
                <input
                  type="checkbox"
                  checked={isChild}
                  onChange={(event) => setIsChild(event.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer accent-white"
                />

                <div>
                  <p className="font-medium text-white">
                    Corte infantil (até 10 anos)
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    O Corte de Cabelo ficará por R$ 30,00.
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* =================================================
              RESUMO DOS SERVIÇOS
          ================================================= */}

          {selectedServices.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Subtotal</span>

                  <span>R$ {discountResult.subtotal.toFixed(2)}</span>
                </div>

                {activeChildPricing && (
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>Corte infantil (até 10 anos)</span>

                    <span>R$ 30,00</span>
                  </div>
                )}

                {discountResult.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>{discountResult.description ?? "Desconto"}</span>

                    <span>- R$ {discountResult.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                  <span className="font-semibold text-white">Total</span>

                  <span className="text-xl font-bold text-green-400">
                    R$ {discountResult.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              DATA
          ================================================= */}

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

          {/* =================================================
              HORÁRIO
          ================================================= */}

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

        {/* =================================================
            BOTÕES
        ================================================= */}

        <div className="border-t border-zinc-800 p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsChild(false);
                setOpen(false);
              }}
              disabled={isPending}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              className="rounded-lg bg-white px-5 py-2 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Agendando..." : "Agendar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBookingButton;
