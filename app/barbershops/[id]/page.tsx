import { db } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

import Link from "next/link";
import Image from "next/image";

import { ChevronLeftIcon, MapPinIcon, MenuIcon } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import ServiceItem from "@/app/_components/service-item";
import PhoneItem from "@/app/_components/phone-item";
import SideBarSheet from "@/app/_components/sidebar-sheet";
import ReviewForm from "@/app/_components/review-form";
import ScrollToResult from "@/app/_components/scroll-to-result";

import {
  ServiceCart,
  ServiceCartProvider,
} from "@/app/_components/service-cart";

import { Sheet, SheetContent, SheetTrigger } from "@/app/_components/ui/sheet";

// =====================================================
// PROPS
// =====================================================

interface BarbershopPageProps {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    search?: string;
    service?: string;
  }>;
}

// =====================================================
// PÁGINA
// =====================================================

const BarbershopPage = async ({
  params,
  searchParams,
}: BarbershopPageProps) => {
  const { id } = await params;

  const { search, service } = await searchParams;

  const session = await getServerSession(authOptions);

  // ===================================================
  // BUSCAR BARBEARIA
  // ===================================================

  const barbershop = await db.barbershop.findUnique({
    where: {
      id,
    },

    include: {
      services: true,

      reviews: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  // ===================================================
  // BARBEARIA NÃO ENCONTRADA
  // ===================================================

  if (!barbershop) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Barbearia não encontrada</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            A barbearia que você está procurando não existe.
          </p>

          <Link
            href="/"
            className="
              mt-4
              inline-flex
              items-center
              justify-center
              rounded-md
              bg-primary
              px-4
              py-2
              text-sm
              font-medium
              text-primary-foreground
            "
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  // ===================================================
  // AVALIAÇÕES
  // ===================================================

  let canReview = false;
  let alreadyReviewed = false;

  if (session?.user?.id && session.user.role === "CUSTOMER") {
    const completedBooking = await db.booking.findFirst({
      where: {
        userId: session.user.id,

        status: "COMPLETED",

        bookingItems: {
          some: {
            service: {
              barbershopId: barbershop.id,
            },
          },
        },
      },

      select: {
        id: true,
      },
    });

    canReview = !!completedBooking;

    const existingReview = await db.review.findFirst({
      where: {
        userId: session.user.id,
        barbershopId: barbershop.id,
      },
    });

    alreadyReviewed = !!existingReview;
  }

  // ===================================================
  // SERVIÇOS
  // ===================================================

  const services = barbershop.services.map((service) => ({
    ...service,
    price: Number(service.price),
  }));

  // ===================================================
  // PESQUISA NORMAL
  // ===================================================

  const normalizedSearch = search?.trim().toLowerCase() ?? "";
  const normalizedService = service?.trim().toLowerCase() ?? "";
  // ===================================================
  // PÁGINA
  // ===================================================

  return (
    <ServiceCartProvider>
      <div className="mx-auto min-h-screen w-full max-w-5xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          className="
            sticky
            top-0
            z-50
            flex
            h-16
            items-center
            justify-between
            border-b
            border-border
            bg-background/95
            px-4
            backdrop-blur
          "
        >
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="
                inline-flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-md
                hover:bg-muted
              "
            >
              <ChevronLeftIcon />

              <span className="sr-only">Voltar</span>
            </Link>

            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/LOGO_SpacoVip.jpeg"
                alt="SpaçoVip"
                width={40}
                height={40}
                className="rounded-full object-cover"
              />

              <span className="hidden text-sm font-bold sm:inline">
                SpaçoVip
              </span>
            </Link>
          </div>

          {/* =================================================
              MENU
          ================================================= */}

          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <MenuIcon />

              <span className="sr-only">Abrir menu</span>
            </SheetTrigger>

            <SheetContent side="right" className="w-70 sm:w-87.5">
              <SideBarSheet />
            </SheetContent>
          </Sheet>
        </header>

        {/* =================================================
            BANNER
        ================================================= */}

        <div className="relative h-72 w-full overflow-hidden sm:h-96">
          <Image
            src={barbershop.imageUrl}
            alt={barbershop.name}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <h1 className="text-2xl font-bold text-white sm:text-4xl">
              {barbershop.name}
            </h1>

            <div className="mt-2 flex items-start gap-2 text-sm text-white/90 sm:text-base">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{barbershop.address}</span>
            </div>
          </div>
        </div>

        {/* =================================================
            INFORMAÇÕES PRINCIPAIS
        ================================================= */}

        <section className="space-y-5 p-4 sm:p-6">
          {/* =================================================
              SOBRE
          ================================================= */}

          <section>
            <h2 className="mb-2 text-lg font-bold">Sobre</h2>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {barbershop.description}
            </p>
          </section>

          {/* =================================================
              SERVIÇOS
          ================================================= */}

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold">Serviços</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Selecione um ou mais serviços para realizar seu agendamento.
              </p>
            </div>

            <div className="space-y-3">
              {services.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum serviço disponível no momento.
                  </p>
                </div>
              ) : (
                services.map((serviceItem) => {
                  const searchMatch =
                    normalizedSearch.length > 0 &&
                    (serviceItem.name
                      .toLowerCase()
                      .includes(normalizedSearch) ||
                      serviceItem.description
                        .toLowerCase()
                        .includes(normalizedSearch));

                  const serviceMatch =
                    normalizedService.length > 0 &&
                    serviceItem.name.trim().toLowerCase() === normalizedService;

                  const match = searchMatch || serviceMatch;

                  return (
                    <div
                      key={serviceItem.id}
                      id={match ? "resultado" : undefined}
                      className={
                        match
                          ? "rounded-xl border-2 border-primary p-2"
                          : undefined
                      }
                    >
                      <ServiceItem
                        service={serviceItem}
                        barbershop={{
                          name: barbershop.name,
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* =================================================
              AVALIAÇÕES
          ================================================= */}

          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Avaliações</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Veja a experiência de outros clientes.
              </p>
            </div>

            {/* =================================================
                RESUMO DAS AVALIAÇÕES
            ================================================= */}

            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xl">⭐</span>

                  <span className="text-xl font-bold">
                    {barbershop.reviews.length > 0
                      ? (
                          barbershop.reviews.reduce(
                            (total, review) => total + review.rating,
                            0,
                          ) / barbershop.reviews.length
                        ).toFixed(1)
                      : "0.0"}
                  </span>
                </div>

                <span className="text-sm text-muted-foreground">
                  ({barbershop.reviews.length}{" "}
                  {barbershop.reviews.length === 1 ? "avaliação" : "avaliações"}
                  )
                </span>
              </div>

              {/* =================================================
                  ÁREA DO CLIENTE LOGADO
              ================================================= */}

              {session?.user?.role === "CUSTOMER" && (
                <div className="mt-4">
                  {alreadyReviewed ? (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                      <p className="font-medium text-green-700">
                        ✓ Você já avaliou esta barbearia
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Obrigado por compartilhar sua experiência!
                      </p>
                    </div>
                  ) : canReview ? (
                    <ReviewForm
                      barbershopId={barbershop.id}
                      hasCompletedBooking={canReview}
                      hasReviewed={alreadyReviewed}
                    />
                  ) : (
                    <div className="rounded-lg border bg-muted/40 px-4 py-3">
                      <p className="font-medium">
                        Avaliação disponível após o atendimento
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Realize um serviço na barbearia. Depois que o
                        atendimento for concluído, você poderá avaliar sua
                        experiência.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================
                  AVALIAÇÕES RECOLHIDAS
              ================================================= */}

              <details className="mt-5">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50">
                    <span className="font-medium">Ver avaliações</span>

                    <span className="text-sm text-muted-foreground">
                      {barbershop.reviews.length}
                    </span>
                  </div>
                </summary>

                <div className="mt-3 space-y-3">
                  {barbershop.reviews.length === 0 ? (
                    <div className="rounded-lg border p-4 text-center">
                      <p className="font-medium">
                        Ainda não existem avaliações.
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Seja o primeiro cliente a avaliar!
                      </p>
                    </div>
                  ) : (
                    barbershop.reviews.map((review) => (
                      <div key={review.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {review.user.name ?? "Cliente"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString(
                                "pt-BR",
                              )}
                            </p>
                          </div>

                          <div
                            className="flex"
                            aria-label={`Avaliação de ${review.rating} de 5 estrelas`}
                          >
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={
                                  star <= review.rating
                                    ? "text-yellow-500"
                                    : "text-muted-foreground"
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>

                        {review.comment && (
                          <p className="mt-3 text-sm text-muted-foreground">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </details>
            </div>
          </section>

          {/* =================================================
              TELEFONES
          ================================================= */}

          {barbershop.phones && barbershop.phones.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-bold">Telefones</h2>

              <div className="space-y-2">
                {barbershop.phones.map((phone) => (
                  <PhoneItem key={phone} phone={phone} />
                ))}
              </div>
            </section>
          )}
        </section>

        {/* =================================================
            SCROLL PARA RESULTADO DA PESQUISA
        ================================================= */}

        {(search || service) && <ScrollToResult />}
      </div>

      {/* =================================================
          CARRINHO DE SERVIÇOS
      ================================================= */}

      <ServiceCart
        barbershopId={barbershop.id}
        barbershopName={barbershop.name}
      />
    </ServiceCartProvider>
  );
};

export default BarbershopPage;
