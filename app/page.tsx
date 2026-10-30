import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Search, Store } from "lucide-react";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import Header from "./_components/header";
import BarbershopItem from "./_components/barbershop-item";
import EnablePushNotifications from "@/app/_components/enable-push-notifications";

const businessTypes = [
  { value: "ALL", label: "Todos os segmentos" },
  { value: "BARBERSHOP", label: "Barbearias" },
  { value: "NAIL_SALON", label: "Manicure e unhas" },
  { value: "EYEBROW_DESIGN", label: "Sobrancelhas" },
  { value: "BEAUTY_SALON", label: "Salões de beleza" },
  { value: "OTHER", label: "Outros serviços" },
] as const;

type HomePageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // A associação ativa define se a pessoa é proprietária
  // ou funcionária. User.role sozinho não é suficiente.
  const memberships = await db.membership.findMany({
    where: {
      userId: session.user.id,
      active: true,
    },
    select: {
      role: true,
    },
  });

  if (memberships.some((membership) => membership.role === "OWNER")) {
    redirect("/barbeiro/dashboard");
  }

  if (memberships.some((membership) => membership.role === "BARBER")) {
    redirect("/funcionario/dashboard");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { needsRoleSelection: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.needsRoleSelection) {
    redirect("/acesso");
  }

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const selectedType = params.type ?? "ALL";

  const validTypes = businessTypes.map((type) => type.value);
  const typeIsValid = validTypes.includes(
    selectedType as (typeof businessTypes)[number]["value"],
  );

  const where: Prisma.BarbershopWhereInput = {
    AND: [
      query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { address: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
      typeIsValid && selectedType !== "ALL"
        ? {
            businessType: selectedType as Exclude<
              (typeof businessTypes)[number]["value"],
              "ALL"
            >,
          }
        : {},
    ],
  };

  const barbershops = await db.barbershop.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const selectedLabel =
    businessTypes.find((type) => type.value === selectedType)?.label ??
    "Todos os segmentos";

  return (
    <div className="flex min-h-screen justify-center bg-background">
      <div className="w-full max-w-5xl">
        <Header />
        <EnablePushNotifications />

        <main className="space-y-6 px-4 py-5 sm:px-5 md:py-6">
          <section>
            <h1 className="text-xl font-bold sm:text-2xl">
              Olá, {session.user.name?.split(" ")[0] || "Cliente"}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Encontre um estabelecimento e escolha o serviço que deseja
              agendar.
            </p>
          </section>

          <section className="rounded-2xl border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Search size={20} aria-hidden="true" />
              <h2 className="font-semibold">Buscar estabelecimentos</h2>
            </div>

            <form
              action="/"
              method="GET"
              className="grid gap-3 sm:grid-cols-[1fr_220px_auto]"
            >
              <label className="sr-only" htmlFor="business-query">
                Nome, endereço ou descrição
              </label>
              <input
                id="business-query"
                name="q"
                defaultValue={query}
                placeholder="Nome, endereço ou serviço..."
                className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />

              <label className="sr-only" htmlFor="business-type">
                Segmento
              </label>
              <select
                id="business-type"
                name="type"
                defaultValue={typeIsValid ? selectedType : "ALL"}
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {businessTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Buscar
              </button>
            </form>

            {(query || selectedType !== "ALL") && (
              <Link
                href="/"
                className="mt-3 inline-block text-sm text-muted-foreground underline underline-offset-4"
              >
                Limpar filtros
              </Link>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Store size={20} aria-hidden="true" />
              <div>
                <h2 className="font-bold">Estabelecimentos disponíveis</h2>
                <p className="text-sm text-muted-foreground">
                  {barbershops.length} resultado(s) — {selectedLabel}
                </p>
              </div>
            </div>

            {barbershops.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <Store
                  className="mx-auto mb-3 text-muted-foreground"
                  size={32}
                />
                <h3 className="font-semibold">
                  Nenhum estabelecimento encontrado
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tente outro nome, endereço ou segmento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {barbershops.map((barbershop) => (
                  <BarbershopItem key={barbershop.id} barbershop={barbershop} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
