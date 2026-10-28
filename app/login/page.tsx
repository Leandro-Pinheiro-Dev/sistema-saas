import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getCurrentUserMemberships } from "@/lib/permissions/membership";
import LoginButton from "@/app/login/_components/login-button";

const LoginPage = async () => {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    if (session.user.role === "BARBER") {
      const memberships = await getCurrentUserMemberships();

      const ownerMembership = memberships.find(
        (membership) => membership.role === "OWNER",
      );

      if (ownerMembership) {
        redirect("/barbeiro/dashboard");
      }

      // BARBER sem associação de proprietário:
      // permite que a pessoa escolha outro caminho.
      redirect("/");
    }

    if (session.user.role === "CUSTOMER") {
      redirect("/");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-5">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-white shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Barbearia SpaçoVip</h1>

          <p className="mt-2 text-sm text-zinc-400">
            Entre para acessar sua conta
          </p>
        </div>

        <LoginButton />

        <p className="mt-6 text-center text-xs text-zinc-500">
          Novos usuários serão cadastrados automaticamente como clientes.
        </p>
      </div>
    </main>
  );
};

export default LoginPage;
