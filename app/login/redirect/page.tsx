import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function LoginRedirectPage() {
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
        select: { role: true },
      },
    },
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
