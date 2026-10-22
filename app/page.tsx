import Header from "./_components/header";

import { Button } from "./_components/ui/button";

import { quickSearchOptions } from "./_constants/search";

import Image from "next/image";

import BarbershopItem from "./_components/barbershop-item";

import { db } from "@/lib/prisma";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { redirect } from "next/navigation";

import { format } from "date-fns";

import { ptBR } from "date-fns/locale";

import { MessageCircle } from "lucide-react";

import Link from "next/link";

import EnablePushNotifications from "@/app/_components/enable-push-notifications";

const Home = async () => {
  // =====================================================
  // VERIFICA AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  // -----------------------------------------------------
  // USUÁRIO NÃO LOGADO
  // -----------------------------------------------------

  if (!session?.user) {
    redirect("/login");
  }

  // -----------------------------------------------------
  // BARBEIRO
  // -----------------------------------------------------

  if (session.user.role === "BARBER") {
    redirect("/barbeiro/dashboard");
  }

  // =====================================================
  // A PARTIR DAQUI É CUSTOMER
  // =====================================================

  const today = new Date();

  const barbershops = await db.barbershop.findMany();

  return (
    <div className="flex min-h-screen justify-center bg-background">
      <div className="w-full max-w-5xl">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <Header />
        <EnablePushNotifications />
        {/* =====================================================
            CONTEÚDO
        ===================================================== */}

        <main className="space-y-6 px-4 py-5 sm:px-5 md:py-6">
          {/* =====================================================
              BOAS-VINDAS
          ===================================================== */}

          <section>
            <h2 className="text-xl font-bold sm:text-2xl">
              Olá, {session.user.name?.split(" ")[0] || "Cliente"}!
            </h2>

            <p className="text-sm capitalize text-muted-foreground">
              {format(today, "EEEE, dd 'de' MMMM", {
                locale: ptBR,
              })}
              .
            </p>
          </section>

          {/* =====================================================
              BUSCA RÁPIDA
          ===================================================== */}

          <section>
            <div className="flex w-full gap-3 overflow-x-auto pb-2">
              {quickSearchOptions.map((option) => (
                <Link
                  key={option.title}
                  href={
                    barbershops.length > 0
                      ? `/barbershops/${barbershops[0].id}?service=${encodeURIComponent(
                          option.serviceName,
                        )}`
                      : "/barbershops"
                  }
                  className="
                    inline-flex
                    h-12
                    shrink-0
                    items-center
                    justify-center
                    gap-2
                    rounded-md
                    border
                    border-input
                    bg-white
                    px-3
                    text-sm
                    font-medium
                    text-gray-600
                    shadow-sm
                    transition-colors
                    hover:bg-accent
                    hover:text-accent-foreground
                    sm:px-4
                  "
                >
                  <Image
                    src={option.imageUrl}
                    alt={option.title}
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />

                  <span className="whitespace-nowrap">{option.title}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* =====================================================
              BANNER
          ===================================================== */}

          <section>
            <div className="relative h-48 w-full overflow-hidden rounded-2xl sm:h-64 md:h-80">
              <Image
                src="/pag.jpeg"
                alt="Banner da barbearia"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1024px"
                className="object-cover"
                priority
              />
            </div>
          </section>

          {/* =====================================================
              BARBEARIAS
          ===================================================== */}

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-muted-foreground">
              <Image
                alt="Ícone de barbeiro"
                src="/poste-de-barbeiro.png"
                width={22}
                height={22}
                className="h-5.5 w-5.5 object-contain"
              />

              <span>Barbearia</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {barbershops.map((barbershop) => (
                <BarbershopItem key={barbershop.id} barbershop={barbershop} />
              ))}
            </div>
          </section>

          {/* =====================================================
              LOCALIZAÇÃO
          ===================================================== */}

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-muted-foreground">
              <Image
                alt="Localização"
                src="/localizacao.png"
                width={22}
                height={22}
                className="h-5.5 w-5.5 object-contain"
              />

              <span>Localização</span>
            </div>

            {/* =================================================
                MAPA RESPONSIVO
            ================================================= */}

            <div className="aspect-video w-full overflow-hidden rounded-2xl border">
              <iframe
                src="https://www.google.com/maps/embed?pb=!3m2!1spt-BR!2sbr!4v1783143520245!5m2!1spt-BR!2sbr!6m8!1m7!1sTwe24M4lI-PSKZXPUayA4w!2m2!1d-23.21381344881015!2d-46.76093419562097!3f53.264221881845536!4f-7.647442068245411!5f0.7820865974627469"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            {/* =================================================
                DADOS DA BARBEARIA
            ================================================= */}

            <div className="mt-4">
              <h3 className="font-semibold">Barbearia SpaçoVip</h3>

              <p className="text-sm text-muted-foreground">
                Sebastião Batista de Oliveira - Conj. Hab. Sao Jose, 157
              </p>

              <p className="text-sm text-muted-foreground">
                Campo Limpo Paulista - SP
              </p>

              {/* =================================================
                  WHATSAPP
              ================================================= */}

              <a
                href="https://wa.me/5511998821533?text=Olá!%20Gostaria%20de%20agendar%20um%20horário%20na%20Barbearia%20SpaçoVip"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="mt-4 h-11 w-full gap-2">
                  <MessageCircle size={18} />
                  Falar pelo WhatsApp
                </Button>
              </a>

              {/* =================================================
                  INSTAGRAM
              ================================================= */}

              <a
                href="https://www.instagram.com/spaco_vip_rafael/"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="outline" className="mt-3 h-11 w-full gap-2">
                  <Image
                    src="/logotipo-do-instagram.png"
                    alt="Instagram"
                    width={18}
                    height={18}
                    className="h-4.5 w-4.5 object-contain"
                  />
                  Instagram
                </Button>
              </a>
            </div>

            {/* =================================================
                VER ROTA
            ================================================= */}

            <a
              href="https://maps.app.goo.gl/GP4oFqw8t9vRyjAe6"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="mt-4 h-11 w-full">Ver rota</Button>
            </a>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Home;
