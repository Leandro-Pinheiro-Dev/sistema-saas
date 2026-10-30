"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/prisma";
import { requireBusinessOwner } from "@/lib/permissions/membership";

type CreateServiceInput = {
  barbershopId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
};

export async function createService(input: CreateServiceInput) {
  const barbershopId = input.barbershopId?.trim();
  const name = input.name?.trim();
  const description = input.description?.trim() ?? "";
  const imageUrl = input.imageUrl?.trim() || "/agenda.jpeg";

  if (!barbershopId) {
    throw new Error("Estabelecimento não informado.");
  }

  if (!name || name.length > 100) {
    throw new Error("Informe um nome válido para o serviço.");
  }

  if (description.length > 1000) {
    throw new Error("A descrição pode ter no máximo 1.000 caracteres.");
  }

  if (
    !Number.isFinite(input.price) ||
    input.price <= 0 ||
    input.price > 1_000_000
  ) {
    throw new Error("Informe um preço válido maior que zero.");
  }

  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 5 ||
    input.durationMinutes > 720
  ) {
    throw new Error("A duração deve ser de 5 a 720 minutos.");
  }

  if (imageUrl.length > 500) {
    throw new Error("O endereço da imagem é muito longo.");
  }

  // Autoriza exclusivamente o proprietário deste estabelecimento.
  await requireBusinessOwner(barbershopId);

  const service = await db.barbershopService.create({
    data: {
      barbershopId,
      name,
      description,
      imageUrl,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      durationMinutes: input.durationMinutes,
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      price: true,
      durationMinutes: true,
      barbershopId: true,
    },
  });

  revalidatePath("/barbeiro/dashboard");
  revalidatePath(`/barbershops/${barbershopId}`);

  return {
    success: true,
    service: {
      ...service,
      price: Number(service.price),
    },
  };
}
