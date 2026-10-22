"use client";

import Link from "next/link";

interface BookingItemProps {
  booking: {
    id: string;
    date: Date;

    status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

    subtotal: number;
    discount: number;
    total: number;

    service: {
      name: string;
      price: number;
    };

    bookingItems?: {
      id: string;
      name: string;
      price: number;
      service?: {
        name: string;
        price: number;
      };
      barbershopName?: string;
      barbershopImage?: string;
    }[];
  };
}

// =====================================================
// FORMATAR DATA/HORA NO FUSO DO BRASIL
// =====================================================

const formatBrazilDate = (date: Date, options: Intl.DateTimeFormatOptions) => {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    ...options,
  }).format(new Date(date));
};

// =====================================================
// FORMATAR MOEDA
// =====================================================

const formatCurrency = (value: number) => {
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
};

// =====================================================
// COMPONENTE
// =====================================================

const BookingItem = ({ booking }: BookingItemProps) => {
  // ===================================================
  // DATA
  // ===================================================

  const formattedFullDate = formatBrazilDate(booking.date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const formattedMonth = formatBrazilDate(booking.date, {
    month: "short",
  });

  const formattedDay = formatBrazilDate(booking.date, {
    day: "2-digit",
  });

  const formattedTime = formatBrazilDate(booking.date, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  // ===================================================
  // SERVIÇOS
  // ===================================================

  const services =
    booking.bookingItems && booking.bookingItems.length > 0
      ? booking.bookingItems.map((item) => item.name).join(" + ")
      : booking.service.name;

  // ===================================================
  // STATUS REAL DO BANCO
  // ===================================================

  const statusConfig = {
    PENDING: {
      label: "Pendente",
      className: "bg-yellow-100 text-yellow-700",
    },

    CONFIRMED: {
      label: "Agendado",
      className: "bg-green-100 text-green-700",
    },

    COMPLETED: {
      label: "Concluído",
      className: "bg-blue-100 text-blue-700",
    },

    CANCELLED: {
      label: "Cancelado",
      className: "bg-red-100 text-red-700",
    },
  } as const;

  const currentStatus = statusConfig[booking.status];

  return (
    <div className="flex w-full min-w-[290px] max-w-sm flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
      {/* =================================================
          CABEÇALHO
      ================================================= */}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{services}</h3>

          {/* =============================================
              VALORES
          ============================================= */}

          <div className="mt-2 space-y-0.5 text-sm">
            <p className="text-muted-foreground">
              Subtotal: {formatCurrency(booking.subtotal)}
            </p>

            {booking.discount > 0 && (
              <p className="text-green-600">
                Desconto: - {formatCurrency(booking.discount)}
              </p>
            )}

            <p className="font-semibold">
              Total: {formatCurrency(booking.total)}
            </p>
          </div>
        </div>

        {/* =================================================
            STATUS
        ================================================= */}

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${currentStatus.className}`}
        >
          {currentStatus.label}
        </span>
      </div>

      {/* =================================================
          DATA E HORÁRIO
      ================================================= */}

      <div className="flex items-center gap-3">
        {/* CALENDÁRIO */}

        <div className="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-lg border bg-background">
          <div className="w-full bg-muted px-2 py-1 text-center">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {formattedMonth}
            </p>
          </div>

          <div className="px-2 py-2">
            <p className="text-2xl font-bold leading-none">{formattedDay}</p>
          </div>
        </div>

        {/* INFORMAÇÕES */}

        <div className="min-w-0">
          <p className="text-sm font-medium capitalize">{formattedFullDate}</p>

          <p className="mt-1 text-sm font-semibold">{formattedTime}</p>
        </div>
      </div>

      {/* =================================================
          DETALHES
      ================================================= */}

      <Link
        href={`/bookings/${booking.id}`}
        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Ver detalhes
      </Link>
    </div>
  );
};

export default BookingItem;
