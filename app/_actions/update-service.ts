"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

interface UpdateServiceParams {
  serviceId: string;
  name: string;
  price: number;
}

export const updateService = async ({
  serviceId,
  name,
  price,
}: UpdateServiceParams) => {
  // =====================================================
  // AUTENTICAÇÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  // =====================================================
  // AUTORIZAÇÃO
  // =====================================================

  if (session.user.role !== "BARBER") {
    throw new Error("Acesso não autorizado.");
  }

  // =====================================================
  // VALIDAÇÕES
  // =====================================================

  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("O nome do serviço é obrigatório.");
  }

  if (price <= 0) {
    throw new Error("O preço deve ser maior que zero.");
  }

  // =====================================================
  // VERIFICA SE O SERVIÇO EXISTE
  // =====================================================

  const service = await db.barbershopService.findUnique({
    where: {
      id: serviceId,
    },
  });

  if (!service) {
    throw new Error("Serviço não encontrado.");
  }

  // =====================================================
  // ATUALIZA O SERVIÇO
  // =====================================================

  const updatedService = await db.barbershopService.update({
    where: {
      id: serviceId,
    },
    data: {
      name: trimmedName,
      price,
    },
  });

  // =====================================================
  // RETORNO
  // =====================================================

  return {
    success: true,
    service: {
      id: updatedService.id,
      name: updatedService.name,
      price: Number(updatedService.price),
    },
  };
};
