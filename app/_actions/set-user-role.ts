"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

import { UserRole } from "@prisma/client";

export const setUserRole = async (role: UserRole) => {
  // =====================================================
  // VERIFICA USUÁRIO LOGADO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // ATUALIZA USUÁRIO
  // =====================================================

  const user = await db.user.update({
    where: {
      id: session.user.id,
    },

    data: {
      /*
       * Define o tipo de usuário.
       *
       * CUSTOMER = cliente
       * BARBER   = barbeiro
       */
      role,

      /*
       * MUITO IMPORTANTE:
       *
       * false significa que o usuário
       * já escolheu seu tipo de conta.
       *
       * Se deixar true, o sistema continuará
       * mandando o usuário para /cadastro.
       */
      needsRoleSelection: false,
    },
  });

  console.log("=================================");
  console.log("USUÁRIO ATUALIZADO");
  console.log("ID:", user.id);
  console.log("ROLE:", user.role);
  console.log("NEEDS ROLE:", user.needsRoleSelection);
  console.log("=================================");

  return user;
};
