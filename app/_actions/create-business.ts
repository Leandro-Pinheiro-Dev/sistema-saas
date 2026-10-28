"use server";

import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

const businessTypes = [
  "BARBERSHOP",
  "NAIL_SALON",
  "EYEBROW_DESIGN",
  "BEAUTY_SALON",
  "OTHER",
] as const;

type BusinessType = (typeof businessTypes)[number];

type CreateBusinessInput = {
  name: string;
  businessType: string;
  address: string;
  phone: string;
  description: string;
};

function createSlug(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 45);

  return normalized || "estabelecimento";
}

export async function createBusiness(input: CreateBusinessInput) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Faça login para cadastrar seu estabelecimento.");
  }

  const name = input.name.trim();
  const address = input.address.trim();
  const phone = input.phone.trim();
  const description = input.description.trim();

  if (!name || !address || !phone || !description) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  if (
    name.length > 100 ||
    address.length > 200 ||
    phone.length > 30 ||
    description.length > 1000
  ) {
    throw new Error("Um ou mais campos ultrapassaram o limite permitido.");
  }

  if (!businessTypes.includes(input.businessType as BusinessType)) {
    throw new Error("Selecione um segmento comercial válido.");
  }

  const userId = session.user.id;

  const existingMembership = await db.membership.findFirst({
    where: {
      userId,
      active: true,
    },
    select: { id: true },
  });

  if (existingMembership) {
    throw new Error(
      "Sua conta já possui um vínculo ativo com um estabelecimento.",
    );
  }

  try {
    const business = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error("Usuário não encontrado.");
      }

      const baseSlug = createSlug(name);
      let slug = baseSlug;

      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await tx.barbershop.findUnique({
          where: { slug },
          select: { id: true },
        });

        if (!exists) break;

        slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
      }

      const slugExists = await tx.barbershop.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (slugExists) {
        throw new Error(
          "Não foi possível gerar um endereço exclusivo. Tente novamente.",
        );
      }

      const createdBusiness = await tx.barbershop.create({
        data: {
          name,
          businessType: input.businessType as BusinessType,
          slug,
          address,
          phones: [phone],
          description,
        },
      });

      await tx.membership.create({
        data: {
          userId,
          barbershopId: createdBusiness.id,
          role: "OWNER",
          active: true,
        },
      });

      await tx.subscription.create({
        data: {
          barbershopId: createdBusiness.id,
          memberCount: 1,
          pricePerMember: new Prisma.Decimal("70.00"),
          totalAmount: new Prisma.Decimal("70.00"),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          role: "BARBER",
          needsRoleSelection: false,
        },
      });

      return createdBusiness;
    });

    revalidatePath("/");
    revalidatePath("/barbeiro/dashboard");

    redirect("/barbeiro/dashboard");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "O endereço do estabelecimento já está em uso. Tente novamente.",
      );
    }

    throw error;
  }
}
