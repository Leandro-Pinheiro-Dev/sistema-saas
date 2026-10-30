import { getCurrentUserMemberships } from "@/lib/permissions/membership";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

import MonthlyHistory from "./_components/monthly-history";
import EditServiceButton from "./_components/edit-service-button";
import EditBookingButton from "./_components/edit-booking-button";
import DeleteBookingButton from "./_components/delete-booking-button";
import CreateBookingButton from "./_components/create-booking-button";
import BarberSchedule from "./_components/barber-schedule";
import BookingStatusButton from "./_components/booking-status-button";
import BusinessScheduleSettings from "./_components/business-schedule-settings";
import CustomerDebts from "./_components/customer-debts";
import LogoutButton from "./_components/logout-button";
import CreateServiceForm from "./_components/create-service-form";
import CreateEmployeeForm from "./_components/create-employee-form";

import EnablePushNotifications from "@/app/_components/enable-push-notifications";
import { getDashboardSummary } from "@/app/_actions/get-dashboard-summary";

// =====================================================
// ITEM DE SERVIÇO DO AGENDAMENTO
// =====================================================

type DashboardBookingItem = {
  id: string;
  serviceId: string;
  name: string;
  price: number;
};

// =====================================================
// AGENDAMENTO DO DASHBOARD
// =====================================================

type DashboardBooking = {
  id: string;
  userId: string | null;
  serviceId: string;
  date: Date;
  clientName: string | null;
  clientPhone: string | null;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  serviceName: string;
  servicePrice: number;
  subtotal: number;
  discount: number;
  total: number;
  bookingItems: DashboardBookingItem[];
};

// =====================================================
// SERVIÇO
// =====================================================

type DashboardService = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
};

// =====================================================
// COMPONENTE
// =====================================================

const BarberDashboardPage = async () => {
  // 1. Autenticação
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // 2. Identificar o estabelecimento do proprietário
  const memberships = await getCurrentUserMemberships();

  const ownerMembership = memberships.find(
    (membership) => membership.role === "OWNER",
  );

  if (!ownerMembership) {
    redirect("/");
  }

  const barbershopId = ownerMembership.barbershopId;
  const businessName = ownerMembership.barbershop.name;

  // 3. Resumo financeiro do estabelecimento
  const dashboardSummary = await getDashboardSummary(barbershopId);

  // 4. Buscar agendamentos do estabelecimento
  const bookingsData = await db.booking.findMany({
    where: {
      barbershopId,
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },
    include: {
      user: true,
      service: true,
      bookingItems: {
        include: {
          service: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  // 5. Preparar os dados dos agendamentos
  const bookings: DashboardBooking[] = bookingsData.map((booking) => {
    const bookingItems: DashboardBookingItem[] =
      booking.bookingItems.length > 0
        ? booking.bookingItems.map((item) => ({
            id: item.id,
            serviceId: item.serviceId,
            name: item.service.name,
            price: Number(item.price),
          }))
        : [
            {
              id: booking.service.id,
              serviceId: booking.service.id,
              name: booking.service.name,
              price: Number(booking.service.price),
            },
          ];

    const calculatedSubtotal = bookingItems.reduce(
      (sum, item) => sum + item.price,
      0,
    );

    const savedSubtotal = Number(booking.subtotal);
    const savedDiscount = Number(booking.discount);
    const savedTotal = Number(booking.total);

    const subtotal = savedSubtotal > 0 ? savedSubtotal : calculatedSubtotal;

    const discount = savedDiscount > 0 ? savedDiscount : 0;

    const total =
      savedTotal > 0 ? savedTotal : Math.max(0, subtotal - discount);

    const serviceName = bookingItems.map((item) => item.name).join(" + ");

    return {
      id: booking.id,
      userId: booking.userId,
      serviceId: booking.serviceId,
      date: booking.date,
      clientName: booking.clientName ?? booking.user?.name ?? null,
      clientPhone: booking.clientPhone,
      status: booking.status,
      serviceName,
      servicePrice: Number(booking.service.price),
      subtotal,
      discount,
      total,
      bookingItems,
    };
  });

  // 6. Agrupar agendamentos por dia no horário de São Paulo
  const bookingsByDay = bookings.reduce<Record<string, DashboardBooking[]>>(
    (groups, booking) => {
      const dateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      }).format(booking.date);

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(booking);

      return groups;
    },
    {},
  );

  const groupedBookingDays = Object.entries(bookingsByDay)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, dayBookings]) => ({
      date,
      bookings: [...dayBookings].sort(
        (bookingA, bookingB) =>
          bookingA.date.getTime() - bookingB.date.getTime(),
      ),
    }));

  // 7. Buscar clientes com agendamentos neste estabelecimento
  // Observação: clientes sem agendamentos não aparecem nesta lista.
  const users = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      bookings: {
        some: {
          barbershopId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // 8. Buscar somente os serviços deste estabelecimento
  const servicesData = await db.barbershopService.findMany({
    where: {
      barbershopId,
    },
    select: {
      id: true,
      name: true,
      price: true,
      durationMinutes: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const services: DashboardService[] = servicesData.map((service) => ({
    id: service.id,
    name: service.name,
    price: Number(service.price),
    durationMinutes: service.durationMinutes,
  }));

  // 9. Renderizar o dashboard
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-zinc-500">
              Painel administrativo
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Olá, {session.user.name ?? "Proprietário"} 👋
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Aqui está o resumo de {businessName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <EnablePushNotifications />
            <LogoutButton />
          </div>
        </header>

        {/* RESUMO FINANCEIRO */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Resumo financeiro</h2>

            <p className="text-sm text-zinc-500">
              Entradas registradas no sistema.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-green-900/50 bg-linear-to-br from-green-950/40 to-zinc-900 p-6 shadow-lg">
              <p className="text-sm font-medium text-zinc-400">Recebido hoje</p>

              <p className="mt-3 text-3xl font-bold text-green-400">
                R$ {dashboardSummary.dailyRevenue.toFixed(2)}
              </p>

              <p className="mt-4 text-xs text-zinc-500">
                Serviços + pagamentos de fiado
              </p>
            </div>

            <div className="rounded-2xl border border-red-900/50 bg-linear-to-br from-red-950/40 to-zinc-900 p-6 shadow-lg">
              <p className="text-sm font-medium text-zinc-400">
                Fiado em aberto
              </p>

              <p className="mt-3 text-3xl font-bold text-red-400">
                R$ {dashboardSummary.totalDebt.toFixed(2)}
              </p>

              <p className="mt-4 text-xs text-zinc-500">
                {dashboardSummary.customersWithDebt}{" "}
                {dashboardSummary.customersWithDebt === 1
                  ? "cliente com dívida"
                  : "clientes com dívida"}
              </p>
            </div>
          </div>
        </section>

        {/* CARDS */}
        <section className="mb-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Agendamentos</p>
              <p className="mt-2 text-3xl font-bold">{bookings.length}</p>
              <p className="mt-1 text-xs text-zinc-600">
                Agendamentos pendentes e confirmados
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Clientes</p>
              <p className="mt-2 text-3xl font-bold">{users.length}</p>
              <p className="mt-1 text-xs text-zinc-600">
                Clientes com agendamentos
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
              <p className="text-sm text-zinc-500">Serviços</p>
              <p className="mt-2 text-3xl font-bold">{services.length}</p>
              <p className="mt-1 text-xs text-zinc-600">
                Serviços deste estabelecimento
              </p>
            </div>
          </div>
        </section>

        <MonthlyHistory barbershopId={barbershopId} />

        {/* SERVIÇOS */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Serviços e preços</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Atualize os valores cobrados pelos serviços de {businessName}.
            </p>
          </div>

          <div className="mb-6">
            <CreateServiceForm barbershopId={barbershopId} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {service.name}
                  </p>

                  <p className="mt-1 text-lg font-bold text-green-400">
                    R$ {service.price.toFixed(2)}
                  </p>
                </div>

                <EditServiceButton service={service} />
              </div>
            ))}
          </div>
        </section>

        {/* FUNCIONÁRIOS */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Funcionários</h2>

            <p className="mt-1 text-sm text-zinc-500">
              Adicione profissionais ao estabelecimento {businessName}.
            </p>
          </div>

          <CreateEmployeeForm barbershopId={barbershopId} />
        </section>

        {/* CONFIGURAÇÃO DA AGENDA */}
        <BusinessScheduleSettings barbershopId={barbershopId} />

        {/* AGENDAMENTOS */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl sm:p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Agendamentos</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Gerencie os horários dos clientes de {businessName}.
              </p>
            </div>

            <CreateBookingButton users={users} services={services} />
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center">
              <div className="mb-3 text-3xl">📅</div>

              <p className="font-medium text-zinc-300">
                Nenhum agendamento encontrado.
              </p>

              <p className="mt-1 text-sm text-zinc-600">
                Os novos agendamentos aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedBookingDays.map(({ date, bookings: dayBookings }) => {
                const [year, month, day] = date.split("-").map(Number);
                const displayDate = new Date(year, month - 1, day);

                const formattedDay = displayDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                });

                const formattedDate = displayDate.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });

                return (
                  <div key={date}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-lg">
                        📅
                      </div>

                      <div>
                        <h3 className="text-lg font-bold capitalize text-white">
                          {formattedDay}
                        </h3>

                        <p className="text-sm text-zinc-500">{formattedDate}</p>
                      </div>

                      <div className="ml-auto rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-500">
                        {dayBookings.length}{" "}
                        {dayBookings.length === 1
                          ? "agendamento"
                          : "agendamentos"}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {dayBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            {/* CLIENTE */}
                            <div className="min-w-0 lg:w-44">
                              <p className="truncate font-semibold text-white">
                                {booking.clientName ??
                                  "Cliente não identificado"}
                              </p>

                              <p className="mt-1 truncate text-xs text-zinc-500">
                                {booking.clientPhone ??
                                  "Telefone não informado"}
                              </p>
                            </div>

                            {/* SERVIÇOS E VALORES */}
                            <div className="min-w-0 lg:w-64">
                              <p className="mb-1 text-xs font-medium uppercase text-zinc-600">
                                Serviços
                              </p>

                              <div className="space-y-1">
                                {booking.bookingItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <p className="truncate font-medium text-white">
                                      {item.name}
                                    </p>

                                    <span className="shrink-0 text-sm text-zinc-500">
                                      R$ {item.price.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {booking.bookingItems.length > 1 && (
                                <div className="mt-3 border-t border-zinc-800 pt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">
                                      Subtotal
                                    </span>

                                    <span className="text-sm text-zinc-400">
                                      R$ {booking.subtotal.toFixed(2)}
                                    </span>
                                  </div>

                                  {booking.discount > 0 && (
                                    <div className="mt-1 flex items-center justify-between">
                                      <span className="text-xs font-medium text-emerald-400">
                                        Desconto
                                      </span>

                                      <span className="text-sm font-medium text-emerald-400">
                                        - R$ {booking.discount.toFixed(2)}
                                      </span>
                                    </div>
                                  )}

                                  <div className="mt-1 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-300">
                                      Total
                                    </span>

                                    <span className="font-bold text-green-400">
                                      R$ {booking.total.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* HORÁRIO */}
                            <div className="lg:w-24">
                              <p className="text-xs font-medium uppercase text-zinc-600">
                                Horário
                              </p>

                              <p className="mt-1 text-xl font-bold text-green-400">
                                {booking.date.toLocaleTimeString("pt-BR", {
                                  timeZone: "America/Sao_Paulo",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                              </p>
                            </div>

                            {/* STATUS */}
                            <div>
                              <BookingStatusButton
                                bookingId={booking.id}
                                status={booking.status}
                              />
                            </div>

                            {/* AÇÕES */}
                            <div className="flex flex-wrap gap-2">
                              <EditBookingButton
                                booking={{
                                  id: booking.id,
                                  userId: booking.userId,
                                  clientName: booking.clientName,
                                  clientPhone: booking.clientPhone,
                                  serviceId: booking.serviceId,
                                  date: booking.date,
                                }}
                                users={users}
                                services={services}
                              />

                              <DeleteBookingButton bookingId={booking.id} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* AGENDA FIXA */}
        <section className="mb-8">
          <BarberSchedule
            barbershopId={barbershopId}
            users={users}
            services={services}
          />
        </section>

        {/* FIADOS */}
        <section className="mb-8">
          <CustomerDebts barbershopId={barbershopId} users={users} />
        </section>
      </div>
    </main>
  );
};

export default BarberDashboardPage;
