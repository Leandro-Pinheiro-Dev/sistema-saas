"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export const setUserRole = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // O cadastro público só pode definir o perfil de cliente.
  // Donos e funcionários serão definidos por vínculos Membership.
  const user = await db.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      role: "CUSTOMER",
      needsRoleSelection: false,
    },
    select: {
      id: true,
      role: true,
      needsRoleSelection: true,
    },
  });

  return user;
};
