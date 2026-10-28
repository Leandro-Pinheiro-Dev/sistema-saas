import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import RoleSelector from "@/app/_components/role-selector";

export default async function AccessPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      needsRoleSelection: true,
      memberships: {
        where: { active: true },
        select: {
          role: true,
          barbershopId: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const ownerMembership = user.memberships.find(
    (membership) => membership.role === "OWNER",
  );

  if (ownerMembership) {
    redirect("/barbeiro/dashboard");
  }

  const employeeMembership = user.memberships.find(
    (membership) => membership.role === "BARBER",
  );

  if (employeeMembership) {
    redirect("/funcionario/dashboard");
  }

  if (!user.needsRoleSelection) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-5 text-white">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Bem-vindo ao sistema</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Como você deseja utilizar a plataforma?
          </p>
        </div>

        <RoleSelector />
      </section>
    </main>
  );
}
