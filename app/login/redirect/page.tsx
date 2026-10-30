import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function LoginRedirectPage() {
  const session = await getServerSession(authOptions);

  console.log("[LOGIN REDIRECT] Diagnóstico:", {
    hasSession: Boolean(session),
    hasUser: Boolean(session?.user),
    hasUserId: Boolean(session?.user?.id),
  });

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

  console.log("[LOGIN REDIRECT] Banco de dados:", {
    userFound: Boolean(user),
    activeMemberships: user?.memberships.length ?? 0,
    roles: user?.memberships.map((membership) => membership.role) ?? [],
  });

  if (!user) {
    redirect("/login");
  }

  if (user.memberships.some((membership) => membership.role === "OWNER")) {
    redirect("/barbeiro/dashboard");
  }

  if (user.memberships.some((membership) => membership.role === "BARBER")) {
    redirect("/funcionario/dashboard");
  }

  if (user.needsRoleSelection) {
    redirect("/acesso");
  }

  redirect("/");
}
