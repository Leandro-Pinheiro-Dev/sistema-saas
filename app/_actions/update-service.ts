
"use server";

import { db } from "@/lib/prisma";
import { requireBusinessOwner } from "@/lib/permissions/membership";

interface UpdateServiceParams {
  serviceId: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export async function updateService({
  serviceId,
  name,
  price,
  durationMinutes,
}: UpdateServiceParams) {
  // 1. Validar os dados recebidos
  if (!serviceId?.trim()) {
    throw new Error("Serviço não informado.");
  }

  if (typeof name !== "string") {
    throw new Error("Nome do serviço inválido.");
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("O nome do serviço é obrigatório.");
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("O preço deve ser maior que zero.");
  }

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > 720
  ) {
    throw new Error(
      "A duração deve ser um número inteiro entre 5 e 720 minutos.",
    );
  }

  // 2. Localizar o serviço e seu estabelecimento
  const service = await db.barbershopService.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      barbershopId: true,
    },
  });

  if (!service) {
    throw new Error("Serviço não encontrado.");
  }

  // 3. Autorizar o proprietário do estabelecimento correto
  await requireBusinessOwner(service.barbershopId);

  // 4. Atualizar o serviço
  const updatedService = await db.barbershopService.update({
    where: { id: service.id },
    data: {
      name: trimmedName,
      price,
      durationMinutes,
    },
    select: {
      id: true,
      name: true,
      price: true,
      durationMinutes: true,
    },
  });

  // 5. Retornar os dados atualizados
  return {
    success: true,
    service: {
      id: updatedService.id,
      name: updatedService.name,
      price: Number(updatedService.price),
      durationMinutes: updatedService.durationMinutes,
    },
  };
}
