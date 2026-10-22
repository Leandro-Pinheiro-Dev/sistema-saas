"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

interface CreateReviewParams {
  barbershopId: string;
  rating: number;
  comment?: string;
}

export const createReview = async ({
  barbershopId,
  rating,
  comment,
}: CreateReviewParams) => {
  // =========================================================
  // 1. VERIFICA O USUÁRIO LOGADO
  // =========================================================

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Você precisa estar logado para avaliar.");
  }

  // =========================================================
  // 2. SOMENTE CUSTOMER PODE AVALIAR
  // =========================================================

  if (session.user.role !== "CUSTOMER") {
    throw new Error("Somente clientes podem avaliar.");
  }

  // =========================================================
  // 3. VALIDA A NOTA
  // =========================================================

  if (rating < 1 || rating > 5) {
    throw new Error("A avaliação deve ser de 1 a 5 estrelas.");
  }

  // =========================================================
  // 4. VERIFICA SE A BARBEARIA EXISTE
  // =========================================================

  const barbershop = await db.barbershop.findUnique({
    where: {
      id: barbershopId,
    },
  });

  if (!barbershop) {
    throw new Error("Barbearia não encontrada.");
  }

  // =========================================================
  // 5. VERIFICA SE O CLIENTE JÁ TEVE AGENDAMENTO
  // =========================================================
  //
  // Aqui estamos usando a relação:
  //
  // Booking -> Service -> Barbershop
  //
  // Ou seja:
  //
  // usuário
  //   ↓
  // Booking
  //   ↓
  // Service
  //   ↓
  // Barbershop
  //
  // Isso impede que qualquer usuário avalie uma
  // barbearia sem ter feito agendamento.
  //

  const booking = await db.booking.findFirst({
    where: {
      userId: session.user.id,
      service: {
        barbershopId,
      },
      status: "COMPLETED",
    },
  });

  if (!booking) {
    throw new Error(
      "Você precisa ter realizado um agendamento para avaliar esta barbearia.",
    );
  }

  // =========================================================
  // 6. VERIFICA SE JÁ AVALIOU
  // =========================================================
  //
  // O schema possui:
  //
  // @@unique([userId, barbershopId])
  //
  // Portanto cada cliente pode ter apenas uma avaliação
  // para cada barbearia.
  //

  const existingReview = await db.review.findUnique({
    where: {
      userId_barbershopId: {
        userId: session.user.id,
        barbershopId,
      },
    },
  });

  if (existingReview) {
    throw new Error("Você já avaliou esta barbearia.");
  }

  // =========================================================
  // 7. CRIA A AVALIAÇÃO
  // =========================================================

  const review = await db.review.create({
    data: {
      rating,

      comment: comment?.trim() || null,

      userId: session.user.id,

      barbershopId,
    },
  });

  // =========================================================
  // 8. RETORNA A AVALIAÇÃO CRIADA
  // =========================================================

  return review;
};
