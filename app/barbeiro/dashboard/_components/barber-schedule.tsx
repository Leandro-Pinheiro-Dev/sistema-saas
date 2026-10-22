"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { toast } from "sonner";

import { getBarberSchedule } from "@/app/_actions/get-barber-schedule";

import {
  getBusinessSchedule,
  type BusinessScheduleDay,
} from "@/app/barbeiro/dashboard/_actions/business-schedule";

import {
  releaseFixedSchedule,
  restoreFixedSchedule,
} from "@/app/barbeiro/dashboard/_actions/fixed-schedule-exception";

import CreateBookingButton from "./create-booking-button";

// =====================================================
// USUÁRIO
// =====================================================

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

// =====================================================
// SERVIÇO
// =====================================================

interface Service {
  id: string;
  name: string;
  price: number;
}

// =====================================================
// SERVIÇOS DO AGENDAMENTO
// =====================================================

interface BookingService {
  id: string;
  serviceId: string;
  name: string;
  price: number;
}

// =====================================================
// AGENDAMENTO
// =====================================================

interface Booking {
  id: string;
  userId: string | null;
  serviceId: string;
  date: Date;
  clientName: string | null;
  clientPhone?: string | null;
  serviceName: string;
  services: BookingService[];
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
}

// =====================================================
// PROPS
// =====================================================

interface BarberScheduleProps {
  initialDate?: Date;
  users: User[];
  services: Service[];
}

// =====================================================
// COMPONENTE
// =====================================================

const BarberSchedule = ({
  initialDate = new Date(),
  users,
  services,
}: BarberScheduleProps) => {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [fixedSchedules, setFixedSchedules] = useState<
    {
      id: string;
      clientName: string;
      time: string;
      released: boolean;
    }[]
  >([]);

  const [businessSchedule, setBusinessSchedule] = useState<
    BusinessScheduleDay[]
  >([]);

  const [businessScheduleLoaded, setBusinessScheduleLoaded] = useState(false);

  const [isPending, startTransition] = useTransition();

  // =====================================================
  // TRANSFORMAR DATA PARA YYYY-MM-DD
  // =====================================================

  const formatDateForServer = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // CRIAR DATA LOCAL COM HORÁRIO
  // =====================================================

  const createLocalDateWithTime = (date: Date, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);

    const result = new Date(date);

    result.setHours(hours, minutes, 0, 0);

    return result;
  };

  // =====================================================
  // CARREGAR AGENDA
  // =====================================================

  const loadSchedule = useCallback((date: Date) => {
    const dateString = formatDateForServer(date);

    startTransition(async () => {
      try {
        console.log("Consultando agenda:", dateString);

        // =================================================
        // CARREGA:
        // 1. AGENDAMENTOS
        // 2. HORÁRIOS FIXOS
        // 3. CONFIGURAÇÃO DA AGENDA
        // =================================================

        const [scheduleResult, businessScheduleResult] = await Promise.all([
          getBarberSchedule(dateString),
          getBusinessSchedule(),
        ]);

        setBookings(scheduleResult.bookings);

        setFixedSchedules(scheduleResult.fixedSchedules);

        setBusinessSchedule(businessScheduleResult);

        setBusinessScheduleLoaded(true);
      } catch (error) {
        console.error("ERRO AO CARREGAR AGENDA:", error);

        toast.error("Não foi possível carregar a agenda.");

        setBookings([]);

        setFixedSchedules([]);

        setBusinessSchedule([]);

        setBusinessScheduleLoaded(false);
      }
    });
  }, []);

  // =====================================================
  // CARREGAR QUANDO A DATA MUDAR
  // =====================================================

  useEffect(() => {
    loadSchedule(selectedDate);
  }, [selectedDate, loadSchedule]);

  // =====================================================
  // ALTERAR DIA
  // =====================================================

  const changeDay = (days: number) => {
    const newDate = new Date(selectedDate);

    newDate.setDate(newDate.getDate() + days);

    setSelectedDate(newDate);
  };

  // =====================================================
  // VOLTAR PARA HOJE
  // =====================================================

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // =====================================================
  // FORMATAR DATA
  // =====================================================

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // =====================================================
  // DIA DA SEMANA DA DATA SELECIONADA
  //
  // JS:
  // 0 = Domingo
  // 1 = Segunda
  // 2 = Terça
  // 3 = Quarta
  // 4 = Quinta
  // 5 = Sexta
  // 6 = Sábado
  // =====================================================

  const selectedDayOfWeek = selectedDate.getDay();

  // =====================================================
  // CONFIGURAÇÃO DO DIA ATUAL
  // =====================================================

  const selectedBusinessDay = businessSchedule.find(
    (day) => day.dayOfWeek === selectedDayOfWeek,
  );

  // =====================================================
  // HORÁRIOS CONFIGURADOS PARA O DIA
  //
  // Não existe mais TIME_LIST fixo.
  //
  // Os horários vêm do banco de dados.
  // =====================================================

  const configuredTimes =
    selectedBusinessDay?.timeSlots.map((slot) => slot.time).sort() ?? [];

  // =====================================================
  // ENCONTRAR CONFIGURAÇÃO DE UM HORÁRIO
  // =====================================================

  const getTimeSlotConfig = (time: string) => {
    return selectedBusinessDay?.timeSlots.find((slot) => slot.time === time);
  };

  // =====================================================
  // VERIFICAR SE O HORÁRIO ESTÁ DISPONÍVEL
  // =====================================================

  const isTimeActive = (time: string) => {
    if (!selectedBusinessDay?.active) {
      return false;
    }

    const slot = getTimeSlotConfig(time);

    return slot?.active === true;
  };

  // =====================================================
  // ENCONTRAR AGENDAMENTO
  // =====================================================

  const getBookingByTime = (time: string) => {
    return bookings.find((booking) => {
      const bookingDate = new Date(booking.date);

      const bookingTime = bookingDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return bookingTime === time;
    });
  };

  // =====================================================
  // ENCONTRAR HORÁRIO FIXO
  // =====================================================

  const getFixedScheduleByTime = (time: string) => {
    return fixedSchedules.find((schedule) => schedule.time === time);
  };

  // =====================================================
  // HORÁRIOS QUE DEVEM SER EXIBIDOS
  //
  // Normalmente são os horários configurados no banco.
  //
  // Também adicionamos horários de bookings/fixos que
  // eventualmente não estejam mais ativos/configurados,
  // para não esconder compromissos existentes.
  // =====================================================

  const displayTimes = Array.from(
    new Set([
      ...configuredTimes,
      ...fixedSchedules.map((schedule) => schedule.time),
      ...bookings.map((booking) => {
        const bookingDate = new Date(booking.date);

        return bookingDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }),
    ]),
  ).sort();

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-xl">
      {/* =================================================
          CABEÇALHO
      ================================================= */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Agenda</h2>

          <p className="mt-1 text-sm capitalize text-zinc-400">
            {formatDate(selectedDate)}
          </p>
        </div>

        {/* =================================================
            NAVEGAÇÃO
        ================================================= */}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeDay(-1)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800"
          >
            ←
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800"
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => changeDay(1)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800"
          >
            →
          </button>
        </div>
      </div>

      {/* =================================================
          CARREGANDO CONFIGURAÇÃO
      ================================================= */}

      {!businessScheduleLoaded && (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center text-sm text-zinc-400">
          Carregando configuração da agenda...
        </div>
      )}

      {/* =================================================
          DIA FECHADO
      ================================================= */}

      {businessScheduleLoaded &&
        selectedBusinessDay &&
        !selectedBusinessDay.active && (
          <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-center">
            <p className="font-semibold text-red-400">
              Barbearia fechada neste dia
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Novos agendamentos não podem ser realizados.
            </p>
          </div>
        )}

      {/* =================================================
          DIA NÃO CONFIGURADO
      ================================================= */}

      {businessScheduleLoaded && !selectedBusinessDay && (
        <div className="mb-4 rounded-xl border border-yellow-900/50 bg-yellow-950/30 p-4 text-center">
          <p className="font-semibold text-yellow-400">Dia sem configuração</p>

          <p className="mt-1 text-sm text-zinc-500">
            Este dia ainda não possui horários configurados.
          </p>
        </div>
      )}

      {/* =================================================
          HORÁRIOS
      ================================================= */}

      <div className="max-h-162.5 space-y-3 overflow-y-auto pr-2">
        {displayTimes.map((time) => {
          const booking = getBookingByTime(time);

          const fixedSchedule = getFixedScheduleByTime(time);

          const timeSlotConfig = getTimeSlotConfig(time);

          const timeActive = isTimeActive(time);

          return (
            <div
              key={time}
              className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:flex-row md:items-center"
            >
              {/* =================================================
                  HORÁRIO
              ================================================= */}

              <div className="w-20 shrink-0 text-lg font-bold">{time}</div>

              {/* =================================================
                  HORÁRIO FIXO
                  
                  HORÁRIO FIXO SEMPRE CONTINUA VISÍVEL.
              ================================================= */}

              {fixedSchedule && !fixedSchedule.released ? (
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-red-400">
                      {fixedSchedule.clientName}
                    </p>

                    <p className="text-sm text-zinc-500">Horário fixo</p>

                    {!timeActive && (
                      <p className="mt-1 text-xs text-yellow-500">
                        Atenção: horário atualmente bloqueado.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Liberar o horário das ${time} para outros clientes nesta data?`,
                      );

                      if (!confirmed) {
                        return;
                      }

                      startTransition(async () => {
                        try {
                          await releaseFixedSchedule({
                            date: formatDateForServer(selectedDate),
                            time,
                          });

                          toast.success(`${time} liberado para esta data.`);

                          loadSchedule(selectedDate);
                        } catch (error) {
                          console.error(error);

                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Não foi possível liberar o horário.",
                          );
                        }
                      });
                    }}
                    className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🔓 Liberar
                  </button>
                </div>
              ) : fixedSchedule && fixedSchedule.released ? (
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-green-400">Disponível</p>

                    <p className="text-sm text-zinc-500">
                      {fixedSchedule.clientName} — horário fixo liberado
                    </p>

                    {!timeActive && (
                      <p className="mt-1 text-xs text-yellow-500">
                        Atenção: horário atualmente bloqueado pela agenda.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!booking && timeActive && (
                      <CreateBookingButton
                        users={users}
                        services={services}
                        initialDate={createLocalDateWithTime(
                          selectedDate,
                          time,
                        )}
                      />
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Bloquear novamente o horário das ${time} para ${fixedSchedule.clientName}?`,
                        );

                        if (!confirmed) {
                          return;
                        }

                        startTransition(async () => {
                          try {
                            await restoreFixedSchedule({
                              date: formatDateForServer(selectedDate),
                              time,
                            });

                            toast.success(
                              `${time} voltou a ficar reservado para ${fixedSchedule.clientName}.`,
                            );

                            loadSchedule(selectedDate);
                          } catch (error) {
                            console.error(error);

                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Não foi possível bloquear o horário.",
                            );
                          }
                        });
                      }}
                      className="rounded-lg border border-green-800 bg-green-950/40 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      🔒 Bloquear
                    </button>
                  </div>
                </div>
              ) : booking ? (
                /* =================================================
                   AGENDAMENTO EXISTENTE

                   AGENDAMENTOS EXISTENTES NÃO SÃO ESCONDIDOS
                   QUANDO UM HORÁRIO É BLOQUEADO.
                ================================================= */

                <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  {/* =================================================
                      CLIENTE
                  ================================================= */}

                  <p className="font-semibold text-white">
                    {booking.clientName}
                  </p>

                  {/* =================================================
                      SERVIÇOS
                  ================================================= */}

                  <div className="mt-2 space-y-1">
                    {booking.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-sm text-zinc-300">
                          {service.name}
                        </span>

                        <span className="text-xs text-zinc-500">
                          R$ {service.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* =================================================
                      TOTAL
                  ================================================= */}

                  <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-2">
                    <span className="text-xs text-zinc-500">Total</span>

                    <span className="font-bold text-green-400">
                      R$ {booking.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {!timeActive && (
                    <p className="mt-2 text-xs text-yellow-500">
                      Horário atualmente bloqueado para novos agendamentos.
                    </p>
                  )}
                </div>
              ) : !businessScheduleLoaded ? (
                /* =================================================
                   CONFIGURAÇÃO AINDA CARREGANDO
                ================================================= */

                <div className="flex-1">
                  <p className="text-sm text-zinc-500">Carregando...</p>
                </div>
              ) : !selectedBusinessDay?.active ? (
                /* =================================================
                   DIA FECHADO
                ================================================= */

                <div className="flex-1">
                  <p className="font-semibold text-red-400">Fechado</p>

                  <p className="text-sm text-zinc-500">
                    Novos agendamentos indisponíveis.
                  </p>
                </div>
              ) : !timeSlotConfig ? (
                /* =================================================
                   HORÁRIO FORA DA CONFIGURAÇÃO
                ================================================= */

                <div className="flex-1">
                  <p className="font-semibold text-zinc-500">Não configurado</p>

                  <p className="text-sm text-zinc-600">
                    Este horário não está configurado na agenda.
                  </p>
                </div>
              ) : !timeSlotConfig.active ? (
                /* =================================================
                   HORÁRIO BLOQUEADO
                ================================================= */

                <div className="flex-1">
                  <p className="font-semibold text-yellow-500">Bloqueado</p>

                  <p className="text-sm text-zinc-500">
                    Novos agendamentos indisponíveis.
                  </p>
                </div>
              ) : (
                /* =================================================
                   HORÁRIO DISPONÍVEL
                ================================================= */

                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-green-400">Disponível</p>

                    <p className="text-sm text-zinc-500">Horário livre</p>
                  </div>

                  <CreateBookingButton
                    users={users}
                    services={services}
                    initialDate={createLocalDateWithTime(selectedDate, time)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* =================================================
            NENHUM HORÁRIO CONFIGURADO
        ================================================= */}

        {businessScheduleLoaded && displayTimes.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="font-semibold text-zinc-400">
              Nenhum horário configurado
            </p>

            <p className="mt-1 text-sm text-zinc-600">
              Configure os horários na seção &quot;Configuração da Agenda&quot;.
            </p>
          </div>
        )}
      </div>

      {/* =================================================
          CARREGANDO
      ================================================= */}

      {isPending && (
        <p className="mt-4 text-center text-sm text-zinc-500">
          Atualizando agenda...
        </p>
      )}
    </div>
  );
};

export default BarberSchedule;
