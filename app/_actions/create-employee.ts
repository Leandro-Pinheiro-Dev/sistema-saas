"use server";

import { MembershipRole, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/prisma";
import { requireBusinessOwner } from "@/lib/permissions/membership";

type CreateEmployeeInput = {
  barbershopId: string;
  email: string;
};

export async function createEmployee(input: CreateEmployeeInput) {
  const barbershopId = input.barbershopId?.trim();
  const email = input.email?.trim().toLowerCase();

  if (!barbershopId) {
    throw new Error("Estabelecimento não informado.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }

  // Somente o proprietário deste estabelecimento pode cadastrar funcionários.
  await requireBusinessOwner(barbershopId);

  await db.$transaction(async (tx) => {
    const employee = await tx.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
      },
    });

    if (!employee) {
      throw new Error(
        "Esta conta ainda não existe. Peça ao funcionário para entrar com Google primeiro.",
      );
    }

    const existingMembership = await tx.membership.findUnique({
      where: {
        userId_barbershopId: {
          userId: employee.id,
          barbershopId,
        },
      },
    });

    if (existingMembership?.role === MembershipRole.OWNER) {
      throw new Error("Esta pessoa já é proprietária deste estabelecimento.");
    }

    if (existingMembership?.active) {
      throw new Error(
        "Este funcionário já está cadastrado neste estabelecimento.",
      );
    }

    if (existingMembership) {
      await tx.membership.update({
        where: { id: existingMembership.id },
        data: {
          role: MembershipRole.BARBER,
          active: true,
        },
      });
    } else {
      await tx.membership.create({
        data: {
          userId: employee.id,
          barbershopId,
          role: MembershipRole.BARBER,
          active: true,
        },
      });
    }

    // Atualiza a quantidade de pessoas ativas e o valor mensal.
    const activeMemberCount = await tx.membership.count({
      where: {
        barbershopId,
        active: true,
      },
    });

    const totalAmount = new Prisma.Decimal((activeMemberCount * 70).toFixed(2));

    await tx.subscription.upsert({
      where: { barbershopId },
      update: {
        memberCount: activeMemberCount,
        totalAmount,
        pricePerMember: new Prisma.Decimal("70.00"),
      },
      create: {
        barbershopId,
        memberCount: activeMemberCount,
        totalAmount,
        pricePerMember: new Prisma.Decimal("70.00"),
      },
    });
  });

  revalidatePath("/barbeiro/dashboard");

  return {
    success: true,
    message: "Funcionário cadastrado com sucesso.",
  };
}
