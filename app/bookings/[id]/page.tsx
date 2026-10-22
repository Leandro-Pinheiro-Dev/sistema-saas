import { db } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Header from "@/app/_components/header";
import Link from "next/link";

interface BookingDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

const BookingDetailsPage = async ({ params }: BookingDetailsPageProps) => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // =====================================================
  // ID DA URL
  // =====================================================

  const { id } = await params;

  // =====================================================
  // BUSCAR AGENDAMENTO
  // =====================================================

  const booking = await db.booking.findFirst({
    where: {
      id,
      userId: session.user.id,
    },

    include: {
      service: {
        include: {
          barbershop: true,
        },
      },

      bookingItems: {
        include: {
          service: {
            include: {
              barbershop: true,
            },
          },
        },
      },
    },
  });

  // =====================================================
  // NÃO ENCONTRADO
  // =====================================================

  if (!booking) {
    notFound();
  }

  // =====================================================
  // CONVERTER VALORES DECIMAL DO PRISMA
  //
  // IMPORTANTE:
  // Não vamos enviar Decimal para componentes React.
  // Tudo será convertido para number/string antes.
  // =====================================================

  const subtotal = Number(booking.subtotal);
  const discount = Number(booking.discount);
  const total = Number(booking.total);

  // =====================================================
  // SERVIÇOS
  //
  // Criamos um novo array contendo apenas valores simples.
  // =====================================================

  const services =
    booking.bookingItems.length > 0
      ? booking.bookingItems.map((item) => ({
          id: item.id,
          name: item.service.name,
          price: Number(item.price),
        }))
      : [
          {
            id: booking.service.id,
            name: booking.service.name,
            price: Number(booking.service.price),
          },
        ];

  // =====================================================
  // DATA
  // =====================================================

  const bookingDate = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(booking.date));

  // =====================================================
  // HORÁRIO
  // =====================================================

  const bookingTime = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(booking.date));

  // =====================================================
  // STATUS
  // =====================================================

  const statusConfig = {
    PENDING: {
      label: "Pendente",
      className: "bg-yellow-100 text-yellow-700",
    },

    CONFIRMED: {
      label: "Confirmado",
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
  };

  const status = statusConfig[booking.status];

  // =====================================================
  // DADOS SIMPLES DA BARBEARIA
  // =====================================================

  const barbershopName = booking.service.barbershop.name;
  const barbershopAddress = booking.service.barbershop.address;

  // =====================================================
  // TELA
  // =====================================================

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-2xl p-5">
        {/* =================================================
            VOLTAR
        ================================================= */}

        <Link
          href="/bookings"
          className="mb-5 inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Voltar para meus agendamentos
        </Link>

        {/* =================================================
            CARD PRINCIPAL
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* =================================================
              CABEÇALHO
          ================================================= */}

          <div className="border-b p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Agendamento</p>

                <h1 className="mt-1 text-xl font-bold">{barbershopName}</h1>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
              >
                {status.label}
              </span>
            </div>
          </div>

          {/* =================================================
              DATA E HORÁRIO
          ================================================= */}

          <div className="border-b p-5">
            <h2 className="mb-3 text-sm font-bold">Data e horário</h2>

            <p className="text-sm capitalize">{bookingDate}</p>

            <p className="mt-1 text-lg font-bold">{bookingTime}</p>
          </div>

          {/* =================================================
              SERVIÇOS
          ================================================= */}

          <div className="border-b p-5">
            <h2 className="mb-4 text-sm font-bold">Serviços</h2>

            <div className="space-y-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm">{service.name}</span>

                  <span className="shrink-0 text-sm font-medium">
                    R$ {service.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* =================================================
              RESUMO FINANCEIRO
          ================================================= */}

          <div className="border-b p-5">
            <h2 className="mb-4 text-sm font-bold">Resumo</h2>

            <div className="space-y-3">
              {/* SUBTOTAL */}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>

                <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
              </div>

              {/* DESCONTO */}

              {discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>

                  <span className="font-medium text-green-600">
                    - R$ {discount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}

              {/* TOTAL */}

              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-bold">Total</span>

                <span className="text-xl font-bold">
                  R$ {total.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>

          {/* =================================================
              BARBEARIA
          ================================================= */}

          <div className="p-5">
            <h2 className="mb-3 text-sm font-bold">Barbearia</h2>

            <p className="font-medium">{barbershopName}</p>

            {barbershopAddress && (
              <p className="mt-1 text-sm text-muted-foreground">
                {barbershopAddress}
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default BookingDetailsPage;
