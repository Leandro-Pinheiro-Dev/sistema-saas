"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Calendar } from "./ui/calendar";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

import {
  CalendarDays,
  Check,
  Clock,
  Minus,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { createBooking } from "@/app/_actions/create-booking";
import { getBookings } from "@/app/_actions/get-bookings";
import { getFixedSchedules } from "@/app/_actions/get-fixed-schedules";

import {
  getBusinessSchedule,
  getBusinessMonths,
  type BusinessScheduleDay,
} from "@/app/barbeiro/dashboard/_actions/business-schedule";

import { calculateBookingDiscount } from "@/app/utils/booking-discount";

import {
  getPricedBookingServices,
  isHaircutService,
} from "@/app/utils/booking-pricing";

// =====================================================
// TIPOS
// =====================================================

interface Service {
  id: string;
  name: string;
  price: number;
}

interface BusinessMonth {
  year: number;
  month: number;
  active: boolean;
}

// =====================================================
// CONTEXTO
// =====================================================

interface ServiceCartContextData {
  services: Service[];

  addService: (service: Service) => void;

  removeService: (serviceId: string) => void;

  clearCart: () => void;

  isInCart: (serviceId: string) => boolean;

  total: number;
}

const ServiceCartContext = createContext<ServiceCartContextData | null>(null);

// =====================================================
// PROVIDER
// =====================================================

interface ServiceCartProviderProps {
  children: ReactNode;

  initialService?: Service | null;
}

export function ServiceCartProvider({ children }: ServiceCartProviderProps) {
  const [services, setServices] = useState<Service[]>([]);

  const addService = useCallback((service: Service) => {
    setServices((currentServices) => {
      const alreadyExists = currentServices.some(
        (item) => item.id === service.id,
      );

      if (alreadyExists) {
        return currentServices;
      }

      return [...currentServices, service];
    });
  }, []);

  const removeService = useCallback((serviceId: string) => {
    setServices((currentServices) =>
      currentServices.filter((service) => service.id !== serviceId),
    );
  }, []);

  const clearCart = useCallback(() => {
    setServices([]);
  }, []);

  const isInCart = useCallback(
    (serviceId: string) => {
      return services.some((service) => service.id === serviceId);
    },
    [services],
  );

  const total = useMemo(() => {
    return services.reduce((sum, service) => sum + Number(service.price), 0);
  }, [services]);

  return (
    <ServiceCartContext.Provider
      value={{
        services,
        addService,
        removeService,
        clearCart,
        isInCart,
        total,
      }}
    >
      {children}
    </ServiceCartContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useServiceCart() {
  const context = useContext(ServiceCartContext);

  if (!context) {
    throw new Error(
      "useServiceCart deve ser utilizado dentro de ServiceCartProvider.",
    );
  }

  return context;
}

// =====================================================
// TIPOS DOS AGENDAMENTOS
// =====================================================

interface BookingData {
  date: Date;
}

// =====================================================
// TIPOS DOS HORÁRIOS FIXOS
// =====================================================

interface FixedScheduleData {
  clientName: string;
  time: string;
}

// =====================================================
// PROPS
// =====================================================

interface ServiceCartProps {
  barbershopId: string;

  barbershopName: string;

  initialService?: Service | null;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function ServiceCart({
  barbershopId,
  barbershopName,
}: ServiceCartProps) {
  const { services, removeService, clearCart } = useServiceCart();

  // ===================================================
  // ESTADOS
  // ===================================================

  const [open, setOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>();

  const [selectedTime, setSelectedTime] = useState<string>();

  const [bookings, setBookings] = useState<BookingData[]>([]);

  const [fixedSchedules, setFixedSchedules] = useState<FixedScheduleData[]>([]);

  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [creatingBooking, setCreatingBooking] = useState(false);

  // ===================================================
  // CORTE INFANTIL
  // ===================================================

  const [isChild, setIsChild] = useState(false);

  // ===================================================
  // CONFIGURAÇÃO DA AGENDA
  // ===================================================

  const [businessSchedule, setBusinessSchedule] = useState<
    BusinessScheduleDay[]
  >([]);

  const [businessMonths, setBusinessMonths] = useState<BusinessMonth[]>([]);

  const [loadingBusinessSchedule, setLoadingBusinessSchedule] = useState(false);

  const [businessScheduleLoaded, setBusinessScheduleLoaded] = useState(false);

  // ===================================================
  // MÊS EXIBIDO NO CALENDÁRIO
  // ===================================================

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const date = new Date();

    date.setDate(1);
    date.setHours(0, 0, 0, 0);

    return date;
  });

  // ===================================================
  // VERIFICAR CORTE DE CABELO
  // ===================================================

  const hasHaircut = useMemo(() => {
    return services.some((service) => isHaircutService(service.name));
  }, [services]);

  // ===================================================
  // REGRA EFETIVA DO CORTE INFANTIL
  // ===================================================

  const activeChildPricing = isChild && hasHaircut;

  // ===================================================
  // SERVIÇOS COM PREÇO CALCULADO
  // ===================================================

  const pricedServices = useMemo(() => {
    return getPricedBookingServices(services, activeChildPricing);
  }, [services, activeChildPricing]);

  // ===================================================
  // DATA DE HOJE
  // ===================================================

  const today = useMemo(() => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }, []);

  // ===================================================
  // DESCONTO
  // ===================================================

  const discountResult = useMemo(() => {
    return calculateBookingDiscount(
      pricedServices.map((service) => ({
        name: service.name,
        price: service.price,
      })),
    );
  }, [pricedServices]);

  // ===================================================
  // FORMATAR DATA PARA O SERVIDOR
  // ===================================================

  const formatDateForServer = useCallback((date: Date) => {
    return format(date, "yyyy-MM-dd");
  }, []);

  // ===================================================
  // VERIFICAR SE O MÊS ESTÁ CONFIGURADO
  // ===================================================

  const getBusinessMonth = useCallback(
    (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      return businessMonths.find(
        (item) => item.year === year && item.month === month,
      );
    },
    [businessMonths],
  );

  // ===================================================
  // VERIFICAR SE O MÊS ESTÁ LIBERADO
  // ===================================================

  const isBusinessMonthActive = useCallback(
    (date: Date) => {
      const configuredMonth = getBusinessMonth(date);

      return configuredMonth?.active === true;
    },
    [getBusinessMonth],
  );

  // ===================================================
  // VERIFICAR SE O MÊS É PASSADO
  // ===================================================

  const isPastMonth = useCallback(
    (date: Date) => {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      const year = date.getFullYear();
      const month = date.getMonth();

      return (
        year < currentYear || (year === currentYear && month < currentMonth)
      );
    },
    [today],
  );

  // ===================================================
  // VERIFICAR SE O MÊS ESTÁ DENTRO DOS MESES CONFIGURADOS
  // ===================================================

  const isConfiguredMonth = useCallback(
    (date: Date) => {
      return Boolean(getBusinessMonth(date));
    },
    [getBusinessMonth],
  );

  // ===================================================
  // BUSCAR CONFIGURAÇÃO DA AGENDA
  // ===================================================

  const loadBusinessSchedule = useCallback(async () => {
    try {
      setLoadingBusinessSchedule(true);
      setBusinessScheduleLoaded(false);

      const [scheduleResult, monthsResult] = await Promise.all([
        getBusinessSchedule(),
        getBusinessMonths(),
      ]);

      const schedule = scheduleResult ?? [];
      const months = monthsResult ?? [];

      setBusinessSchedule(schedule);
      setBusinessMonths(months);

      setBusinessScheduleLoaded(true);

      // -------------------------------------------------
      // DEFINIR O PRIMEIRO MÊS DISPONÍVEL
      // -------------------------------------------------

      const currentMonth = months.find(
        (item) =>
          item.year === today.getFullYear() &&
          item.month === today.getMonth() + 1 &&
          item.active,
      );

      if (currentMonth) {
        setCalendarMonth(
          new Date(currentMonth.year, currentMonth.month - 1, 1),
        );

        return;
      }

      // -------------------------------------------------
      // SE O MÊS ATUAL ESTIVER BLOQUEADO,
      // PROCURAR O PRIMEIRO MÊS FUTURO LIBERADO.
      // -------------------------------------------------

      const firstActiveMonth = [...months]
        .filter((item) => {
          const monthDate = new Date(item.year, item.month - 1, 1);

          return item.active && !isPastMonth(monthDate);
        })
        .sort((a, b) => a.year - b.year || a.month - b.month)[0];

      if (firstActiveMonth) {
        setCalendarMonth(
          new Date(firstActiveMonth.year, firstActiveMonth.month - 1, 1),
        );

        return;
      }

      // -------------------------------------------------
      // CASO NENHUM MÊS ESTEJA LIBERADO,
      // MANTER NO MÊS ATUAL.
      // -------------------------------------------------

      const current = new Date();

      current.setDate(1);
      current.setHours(0, 0, 0, 0);

      setCalendarMonth(current);
    } catch (error) {
      console.error("Erro ao carregar configuração da agenda:", error);

      setBusinessSchedule([]);
      setBusinessMonths([]);
      setBusinessScheduleLoaded(false);

      toast.error("Não foi possível carregar a configuração da agenda.");
    } finally {
      setLoadingBusinessSchedule(false);
    }
  }, [today, isPastMonth]);

  // ===================================================
  // ABRIR / FECHAR CARRINHO
  // ===================================================

  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      await loadBusinessSchedule();
    }
  };

  // ===================================================
  // BUSCAR CONFIGURAÇÃO DO DIA
  // ===================================================

  const getBusinessDay = useCallback(
    (dayOfWeek: number) => {
      return businessSchedule.find((day) => day.dayOfWeek === dayOfWeek);
    },
    [businessSchedule],
  );

  // ===================================================
  // VERIFICAR DIA DA SEMANA
  // ===================================================

  const isBusinessDayActive = useCallback(
    (date: Date) => {
      if (!businessScheduleLoaded) {
        return false;
      }

      const dayOfWeek = date.getDay();

      const businessDay = getBusinessDay(dayOfWeek);

      if (!businessDay) {
        return false;
      }

      return businessDay.active;
    },
    [businessScheduleLoaded, getBusinessDay],
  );

  // ===================================================
  // VERIFICAR SE DATA ESTÁ DISPONÍVEL
  // ===================================================

  const isDateDisabled = useCallback(
    (date: Date) => {
      // -------------------------------------------------
      // CONFIGURAÇÃO AINDA NÃO CARREGADA
      // -------------------------------------------------

      if (!businessScheduleLoaded) {
        return true;
      }

      // -------------------------------------------------
      // DATAS ANTERIORES A HOJE
      // -------------------------------------------------

      if (date < today) {
        return true;
      }

      // -------------------------------------------------
      // MÊS PASSADO
      // -------------------------------------------------

      if (isPastMonth(date)) {
        return true;
      }

      // -------------------------------------------------
      // MÊS FORA DOS MESES CONFIGURADOS
      // -------------------------------------------------

      if (!isConfiguredMonth(date)) {
        return true;
      }

      // -------------------------------------------------
      // MÊS BLOQUEADO PELO BARBEIRO
      // -------------------------------------------------

      if (!isBusinessMonthActive(date)) {
        return true;
      }

      // -------------------------------------------------
      // DIA DA SEMANA FECHADO
      // -------------------------------------------------

      if (!isBusinessDayActive(date)) {
        return true;
      }

      return false;
    },
    [
      businessScheduleLoaded,
      today,
      isPastMonth,
      isConfiguredMonth,
      isBusinessMonthActive,
      isBusinessDayActive,
    ],
  );

  // ===================================================
  // HORÁRIOS ATIVOS DO DIA
  // ===================================================

  const availableTimes = useMemo(() => {
    if (!selectedDate || !businessScheduleLoaded) {
      return [];
    }

    // -------------------------------------------------
    // MÊS BLOQUEADO
    // -------------------------------------------------

    if (!isBusinessMonthActive(selectedDate)) {
      return [];
    }

    // -------------------------------------------------
    // DIA DA SEMANA
    // -------------------------------------------------

    const dayOfWeek = selectedDate.getDay();

    const businessDay = getBusinessDay(dayOfWeek);

    if (!businessDay || !businessDay.active) {
      return [];
    }

    // -------------------------------------------------
    // HORÁRIOS ATIVOS
    // -------------------------------------------------

    return businessDay.timeSlots
      .filter((slot) => slot.active)
      .map((slot) => slot.time)
      .sort();
  }, [
    selectedDate,
    businessScheduleLoaded,
    isBusinessMonthActive,
    getBusinessDay,
  ]);

  // ===================================================
  // MUDAR MÊS DO CALENDÁRIO
  // ===================================================

  const handleMonthChange = (month: Date) => {
    const normalizedMonth = new Date(month.getFullYear(), month.getMonth(), 1);

    normalizedMonth.setHours(0, 0, 0, 0);

    setCalendarMonth(normalizedMonth);

    // Limpar seleção ao trocar de mês.

    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setBookings([]);
    setFixedSchedules([]);

    if (!businessScheduleLoaded) {
      return;
    }

    // -------------------------------------------------
    // MÊS PASSADO
    // -------------------------------------------------

    if (isPastMonth(normalizedMonth)) {
      return;
    }

    // -------------------------------------------------
    // MÊS NÃO CONFIGURADO
    // -------------------------------------------------

    if (!isConfiguredMonth(normalizedMonth)) {
      toast.info("Este mês ainda não está disponível para agendamentos.");

      return;
    }

    // -------------------------------------------------
    // MÊS BLOQUEADO
    // -------------------------------------------------

    if (!isBusinessMonthActive(normalizedMonth)) {
      toast.info("Este mês está bloqueado para novos agendamentos.");
    }
  };

  // ===================================================
  // SELECIONAR DATA
  // ===================================================

  const handleSelectDate = async (date: Date | undefined) => {
    setSelectedDate(date);

    setSelectedTime(undefined);

    setBookings([]);

    setFixedSchedules([]);

    if (!date) {
      return;
    }

    // -------------------------------------------------
    // CONFIGURAÇÃO DA AGENDA
    // -------------------------------------------------

    if (!businessScheduleLoaded) {
      toast.error("A configuração da agenda ainda está carregando.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // DATA PASSADA
    // -------------------------------------------------

    if (date < today) {
      toast.error("Não é possível selecionar uma data passada.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // MÊS PASSADO
    // -------------------------------------------------

    if (isPastMonth(date)) {
      toast.error("Não é possível realizar agendamentos em meses passados.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // MÊS CONFIGURADO
    // -------------------------------------------------

    if (!isConfiguredMonth(date)) {
      toast.error("Este mês ainda não está disponível para agendamentos.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // MÊS LIBERADO
    // -------------------------------------------------

    if (!isBusinessMonthActive(date)) {
      toast.error("Este mês não está liberado para agendamentos.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // DIA DA SEMANA
    // -------------------------------------------------

    const dayOfWeek = date.getDay();

    const businessDay = getBusinessDay(dayOfWeek);

    if (!businessDay) {
      toast.error("Este dia não está configurado para atendimento.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // BARBEARIA ABERTA
    // -------------------------------------------------

    if (!businessDay.active) {
      toast.error("A barbearia está fechada neste dia.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // HORÁRIOS ATIVOS
    // -------------------------------------------------

    const activeTimes = businessDay.timeSlots.filter((slot) => slot.active);

    if (activeTimes.length === 0) {
      toast.error("Não existem horários disponíveis neste dia.");

      setSelectedDate(undefined);

      return;
    }

    // -------------------------------------------------
    // BUSCAR DISPONIBILIDADE
    // -------------------------------------------------

    try {
      setLoadingAvailability(true);

      const dateString = formatDateForServer(date);

      const [bookingsResult, fixedSchedulesResult] = await Promise.all([
        getBookings({
          date,
        }),

        getFixedSchedules({
          barbershopId,
          date: dateString,
        }),
      ]);

      setBookings(bookingsResult ?? []);

      setFixedSchedules(fixedSchedulesResult ?? []);
    } catch (error) {
      console.error("Erro ao carregar disponibilidade:", error);

      toast.error("Não foi possível carregar os horários.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  // ===================================================
  // VERIFICAR HORÁRIO INDISPONÍVEL
  // ===================================================

  const isTimeUnavailable = (time: string) => {
    if (!selectedDate) {
      return true;
    }

    // -------------------------------------------------
    // MÊS
    // -------------------------------------------------

    if (!isBusinessMonthActive(selectedDate)) {
      return true;
    }

    // -------------------------------------------------
    // DIA
    // -------------------------------------------------

    const dayOfWeek = selectedDate.getDay();

    const businessDay = getBusinessDay(dayOfWeek);

    if (!businessDay || !businessDay.active) {
      return true;
    }

    // -------------------------------------------------
    // HORÁRIO CONFIGURADO
    // -------------------------------------------------

    const businessTimeSlot = businessDay.timeSlots.find(
      (slot) => slot.time === time,
    );

    if (!businessTimeSlot || !businessTimeSlot.active) {
      return true;
    }

    // -------------------------------------------------
    // HORÁRIO FIXO
    // -------------------------------------------------

    const fixedScheduleExists = fixedSchedules.some(
      (schedule) => schedule.time === time,
    );

    if (fixedScheduleExists) {
      return true;
    }

    // -------------------------------------------------
    // AGENDAMENTO NORMAL
    // -------------------------------------------------

    const selectedDateString = format(selectedDate, "yyyy-MM-dd");

    const bookingExists = bookings.some((booking) => {
      const bookingDate = new Date(booking.date);

      const bookingDateString = format(bookingDate, "yyyy-MM-dd");

      const bookingTime = format(bookingDate, "HH:mm");

      return bookingDateString === selectedDateString && bookingTime === time;
    });

    return bookingExists;
  };

  // ===================================================
  // CRIAR AGENDAMENTO
  // ===================================================

  const handleCreateBooking = async () => {
    // -------------------------------------------------
    // SERVIÇOS
    // -------------------------------------------------

    if (services.length === 0) {
      toast.error("Selecione pelo menos um serviço.");

      return;
    }

    // -------------------------------------------------
    // DATA
    // -------------------------------------------------

    if (!selectedDate) {
      toast.error("Selecione uma data para o agendamento.");

      return;
    }

    // -------------------------------------------------
    // HORÁRIO
    // -------------------------------------------------

    if (!selectedTime) {
      toast.error("Selecione um horário.");

      return;
    }

    // -------------------------------------------------
    // MÊS
    // -------------------------------------------------

    if (!isBusinessMonthActive(selectedDate)) {
      toast.error("Este mês não está liberado para agendamentos.");

      return;
    }

    // -------------------------------------------------
    // DIA
    // -------------------------------------------------

    if (!isBusinessDayActive(selectedDate)) {
      toast.error("A barbearia está fechada neste dia.");

      return;
    }

    // -------------------------------------------------
    // HORÁRIO
    // -------------------------------------------------

    if (isTimeUnavailable(selectedTime)) {
      toast.error("Este horário não está mais disponível.");

      return;
    }

    try {
      setCreatingBooking(true);

      const date = formatDateForServer(selectedDate);

      const result = await createBooking({
        serviceIds: services.map((service) => service.id),

        date,

        time: selectedTime,

        isChild: activeChildPricing,
      });

      // ------------------------------------------------
      // SUCESSO
      // ------------------------------------------------

      toast.success("Agendamento realizado com sucesso!");

      // ------------------------------------------------
      // MOSTRAR DESCONTO
      // ------------------------------------------------

      if (result.discount > 0 && result.discountDescription) {
        toast.success(
          `${result.discountDescription}: desconto de R$ ${result.discount.toFixed(
            2,
          )}`,
        );
      }

      // ------------------------------------------------
      // LIMPAR CARRINHO
      // ------------------------------------------------

      clearCart();

      setIsChild(false);

      setSelectedDate(undefined);

      setSelectedTime(undefined);

      setBookings([]);

      setFixedSchedules([]);

      setOpen(false);
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o agendamento.";

      toast.error(message);
    } finally {
      setCreatingBooking(false);
    }
  };

  // ===================================================
  // CARRINHO VAZIO
  // ===================================================

  if (services.length === 0) {
    return null;
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* =================================================
          BOTÃO DO CARRINHO
      ================================================= */}

      <SheetTrigger
        className="
          fixed
          bottom-5
          right-5
          z-50
          flex
          h-14
          items-center
          justify-center
          rounded-full
          bg-primary
          px-5
          text-primary-foreground
          shadow-lg
          transition-colors
          hover:bg-primary/90
        "
      >
        <ShoppingCart className="mr-2 h-5 w-5" />

        <span className="hidden sm:inline">Agendar</span>

        <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-sm">
          {services.length}
        </span>
      </SheetTrigger>

      {/* =================================================
          CONTEÚDO
      ================================================= */}

      <SheetContent
        side="bottom"
        className="
          mx-auto
          max-h-[95vh]
          w-full
          overflow-y-auto
          rounded-t-3xl
          sm:max-w-2xl
        "
      >
        <SheetHeader className="text-left">
          <SheetTitle>Agendar em {barbershopName}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8 pt-6">
          {/* =================================================
              SERVIÇOS
          ================================================= */}

          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />

                <h3 className="font-semibold">Serviços selecionados</h3>
              </div>

              <div className="space-y-3">
                {pricedServices.map((service) => (
                  <div
                    key={service.id}
                    className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        rounded-lg
                        border
                        p-3
                      "
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{service.name}</p>

                      <p className="text-sm text-muted-foreground">
                        R$ {Number(service.price).toFixed(2)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeService(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* =================================================
                  CORTE INFANTIL
              ================================================= */}

              {hasHaircut && (
                <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                  <label
                    htmlFor="child-cut"
                    className="
                      flex
                      cursor-pointer
                      items-center
                      gap-3
                    "
                  >
                    <input
                      id="child-cut"
                      type="checkbox"
                      checked={isChild}
                      onChange={(event) => setIsChild(event.target.checked)}
                      disabled={creatingBooking}
                      className="
                        h-4
                        w-4
                        cursor-pointer
                        rounded
                        border-gray-300
                      "
                    />

                    <div>
                      <p className="font-medium">
                        Corte infantil (até 10 anos)
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Corte de Cabelo por R$30,00
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* =================================================
                  RESUMO
              ================================================= */}

              <div className="mt-5 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>

                  <span>R$ {discountResult.subtotal.toFixed(2)}</span>
                </div>

                {activeChildPricing && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Corte infantil
                    </span>

                    <span>R$ 30,00</span>
                  </div>
                )}

                {discountResult.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{discountResult.description}</span>

                    <span>- R$ {discountResult.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Total</span>

                  <span className="text-xl font-bold">
                    R$ {discountResult.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* =================================================
              DATA
          ================================================= */}

          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />

                <h3 className="font-semibold">Escolha a data</h3>
              </div>

              <div className="flex justify-center">
                {loadingBusinessSchedule ? (
                  <div className="flex h-82.5 items-center justify-center">
                    <div
                      className="
                        h-6
                        w-6
                        animate-spin
                        rounded-full
                        border-2
                        border-current
                        border-t-transparent
                      "
                    />
                  </div>
                ) : (
                  <Calendar
                    mode="single"
                    month={calendarMonth}
                    onMonthChange={handleMonthChange}
                    selected={selectedDate}
                    onSelect={handleSelectDate}
                    disabled={isDateDisabled}
                    locale={ptBR}
                    className="rounded-md border"
                  />
                )}
              </div>

              {businessScheduleLoaded && (
                <div className="mt-3 space-y-1 text-center text-xs text-muted-foreground">
                  <p>
                    Os meses disponíveis seguem a configuração da barbearia.
                  </p>

                  <p>
                    Os dias e horários também seguem a agenda configurada pelo
                    barbeiro.
                  </p>
                </div>
              )}

              {businessScheduleLoaded && !isConfiguredMonth(calendarMonth) && (
                <div className="mt-3 rounded-lg border bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Este mês ainda não está configurado para agendamentos.
                  </p>
                </div>
              )}

              {businessScheduleLoaded &&
                isConfiguredMonth(calendarMonth) &&
                !isBusinessMonthActive(calendarMonth) && (
                  <div className="mt-3 rounded-lg border bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Este mês está bloqueado para novos agendamentos.
                    </p>
                  </div>
                )}

              {selectedDate && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Data selecionada:{" "}
                  <span className="font-medium text-foreground">
                    {format(selectedDate, "dd/MM/yyyy")}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* =================================================
              HORÁRIOS
          ================================================= */}

          {selectedDate && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />

                  <h3 className="font-semibold">Escolha o horário</h3>
                </div>

                {loadingAvailability ? (
                  <div className="flex items-center justify-center py-8">
                    <div
                      className="
                        h-6
                        w-6
                        animate-spin
                        rounded-full
                        border-2
                        border-current
                        border-t-transparent
                      "
                    />
                  </div>
                ) : availableTimes.length === 0 ? (
                  <div className="rounded-lg border bg-muted/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Não existem horários disponíveis para este dia.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableTimes.map((time) => {
                      const unavailable = isTimeUnavailable(time);

                      const selected = selectedTime === time;

                      return (
                        <Button
                          key={time}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          disabled={unavailable}
                          onClick={() => setSelectedTime(time)}
                          className="h-11"
                        >
                          {selected && <Check className="mr-1 h-4 w-4" />}

                          {time}
                        </Button>
                      );
                    })}
                  </div>
                )}

                {/* =================================================
                    AVISO HORÁRIOS FIXOS
                ================================================= */}

                {!loadingAvailability && fixedSchedules.length > 0 && (
                  <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      Alguns horários estão indisponíveis porque já possuem
                      horários fixos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* =================================================
              RESUMO FINAL
          ================================================= */}

          {selectedDate && selectedTime && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Barbearia</p>

                    <p className="font-medium">{barbershopName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>

                      <p className="font-medium">
                        {format(selectedDate, "dd/MM/yyyy")}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Horário</p>

                      <p className="font-medium">{selectedTime}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Serviços</p>

                    <p className="font-medium">
                      {pricedServices.map((service) => service.name).join(", ")}
                    </p>
                  </div>

                  {activeChildPricing && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Tipo de corte
                      </p>

                      <p className="font-medium">Infantil — R$30,00</p>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>

                      <span className="text-xl font-bold">
                        R$ {discountResult.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* =================================================
              CONFIRMAR
          ================================================= */}

          <Button
            type="button"
            className="h-12 w-full"
            disabled={
              creatingBooking ||
              !selectedDate ||
              !selectedTime ||
              services.length === 0 ||
              !businessScheduleLoaded ||
              !isBusinessMonthActive(selectedDate ?? calendarMonth) ||
              (selectedDate ? !isBusinessDayActive(selectedDate) : true)
            }
            onClick={handleCreateBooking}
          >
            {creatingBooking ? (
              <>
                <div
                  className="
                    mr-2
                    h-4
                    w-4
                    animate-spin
                    rounded-full
                    border-2
                    border-current
                    border-t-transparent
                  "
                />
                Agendando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Confirmar agendamento
              </>
            )}
          </Button>

          {/* =================================================
              LIMPAR
          ================================================= */}

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={creatingBooking}
            onClick={() => {
              clearCart();

              setIsChild(false);

              setSelectedDate(undefined);

              setSelectedTime(undefined);

              setBookings([]);

              setFixedSchedules([]);
            }}
          >
            <Minus className="mr-2 h-4 w-4" />
            Limpar serviços
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
