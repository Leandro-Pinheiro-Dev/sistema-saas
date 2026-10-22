import { db } from "@/lib/prisma";
import Header from "../_components/header";
import Search from "../_components/search";
import { redirect } from "next/navigation";

interface BarbershopsPageProps {
  searchParams: Promise<{
    title?: string;
    service?: string;
  }>;
}

const BarbershopsPage = async ({ searchParams }: BarbershopsPageProps) => {
  const { title = "", service = "" } = await searchParams;

  const searchTerm = service.trim() || title.trim();

  const barbershop = await db.barbershop.findFirst({
    where: {
      OR: [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          address: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          services: {
            some: {
              name: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    },
  });

  if (barbershop) {
    if (service.trim()) {
      redirect(
        `/barbershops/${barbershop.id}?service=${encodeURIComponent(service.trim())}`,
      );
    }

    redirect(
      `/barbershops/${barbershop.id}?search=${encodeURIComponent(title.trim())}`,
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Search />

        <div className="mt-8 rounded-lg border p-6 text-center">
          <h1 className="text-lg font-bold">Nenhuma barbearia encontrada</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Não encontramos resultados para{" "}
            <strong>{searchTerm || "sua busca"}</strong>.
          </p>
        </div>
      </main>
    </div>
  );
};

export default BarbershopsPage;
