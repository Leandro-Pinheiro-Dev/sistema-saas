import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import LoginButton from "@/app/login/_components/login-button";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    // A página de redirecionamento verifica as associações
    // e o estado real do usuário no banco.
    redirect("/login/redirect");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-5">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-white shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Sistema de agendamentos</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Entre com sua conta Google para continuar.
          </p>
        </div>

        <LoginButton />

        <p className="mt-6 text-center text-xs text-zinc-500">
          No primeiro acesso, você poderá escolher entre cliente, proprietário
          ou funcionário.
        </p>
      </div>
    </main>
  );
}
