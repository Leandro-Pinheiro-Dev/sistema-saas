import { getServerSession } from "next-auth";
import { MembershipRole } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

/**
 * Retorna os estabelecimentos aos quais o usuário
 * está vinculado por uma Membership ativa.
 */
export async function getCurrentUserMemberships() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  return db.membership.findMany({
    where: {
      userId: session.user.id,
      active: true,
    },
    include: {
      barbershop: {
        select: {
          id: true,
          name: true,
          slug: true,
          businessType: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

/**
 * Confirma que o usuário possui um vínculo ativo
 * com o estabelecimento e uma das funções permitidas.
 *
 * Temporariamente, MembershipRole.BARBER representa
 * o funcionário até migrarmos o enum para EMPLOYEE.
 */
export async function requireBusinessMembership(
  barbershopId: string,
  allowedRoles: MembershipRole[],
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      barbershopId,
      active: true,
      role: {
        in: allowedRoles,
      },
    },
    include: {
      barbershop: {
        select: {
          id: true,
          name: true,
          businessType: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error(
      "Você não tem permissão para acessar este estabelecimento.",
    );
  }

  return membership;
}

/**
 * Atalho para operações exclusivas do proprietário.
 */
export async function requireBusinessOwner(barbershopId: string) {
  return requireBusinessMembership(barbershopId, ["OWNER"]);
}

/**
 * Atalho para operações de atendimento.
 * Aceita o proprietário ou o funcionário.
 */
export async function requireBusinessStaff(barbershopId: string) {
  return requireBusinessMembership(barbershopId, ["OWNER", "BARBER"]);
}
