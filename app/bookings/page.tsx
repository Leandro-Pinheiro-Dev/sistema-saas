import { db } from "@/lib/prisma";
import Header from "../_components/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import BookingItem from "../_components/booking-item";
import LoginRequiredDialog from "../_components/login-required-dialog";

const Bookings = async () => {
  const session = await getServerSession(authOptions);

  // =====================================================
  // USUÁRIO NÃO AUTENTICADO
  // =====================================================

  if (!session?.user) {
    return (
      <>
        <Header />
        <LoginRequiredDialog />
      </>
    );
  }

  // =====================================================
  // MEUS AGENDAMENTOS
  //
  // Na tela do cliente mostramos somente:
  //
  // PENDING   → aguardando confirmação
  // CONFIRMED → confirmado pelo barbeiro
  //
  // COMPLETED → NÃO aparece nesta tela
  //
  // O agendamento continua salvo no banco de dados.
  // Isso permite manter histórico, financeiro e estatísticas.
  // =====================================================

  const bookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },

    include: {
      bookingItems: {
        include: {
          service: {
            include: {
              barbershop: true,
            },
          },
        },
      },

      service: {
        include: {
          barbershop: true,
        },
      },
    },

    orderBy: {
      date: "asc",
    },
  });

  // =====================================================
  // FORMATAR AGENDAMENTOS
  // =====================================================

  const bookingsFormatted = bookings.map((booking) => ({
    id: booking.id,

    date: booking.date,

    // Status real salvo no banco.
    // Nesta tela será PENDING ou CONFIRMED.
    status: booking.status,

    // Valores financeiros oficiais salvos no Booking.
    subtotal: Number(booking.subtotal),
    discount: Number(booking.discount),
    total: Number(booking.total),

    service: {
      id: booking.service.id,
      name: booking.service.name,
      price: Number(booking.service.price),

      barbershop: {
        name: booking.service.barbershop.name,
        image: booking.service.barbershop.imageUrl,
      },
    },

    // Serviços que fazem parte do agendamento.
    bookingItems: booking.bookingItems.map((item) => ({
      id: item.id,

      name: item.service.name,

      price: Number(item.price),

      barbershopName: item.service.barbershop.name,

      barbershopImage: item.service.barbershop.imageUrl,
    })),
  }));

  // =====================================================
  // TELA
  // =====================================================

  return (
    <>
      <Header />

      <div className="mx-auto w-full max-w-5xl p-5">
        <h1 className="mb-6 text-xl font-bold">MEUS AGENDAMENTOS</h1>

        {/* =================================================
            AGENDAMENTOS PENDENTES / CONFIRMADOS
        ================================================= */}

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
            Meus agendamentos
          </h2>

          {bookingsFormatted.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
              {bookingsFormatted.map((booking) => (
                <BookingItem key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você não possui agendamentos.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default Bookings;
