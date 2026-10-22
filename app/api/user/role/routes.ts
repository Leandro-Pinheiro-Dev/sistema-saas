import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

import { UserRole } from "@prisma/client";

export async function POST(request: Request) {
  try {
    // =====================================================
    // VERIFICA SE O USUÁRIO ESTÁ LOGADO
    // =====================================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Você precisa estar logado.",
        },
        {
          status: 401,
        },
      );
    }

    // =====================================================
    // RECEBE O PERFIL ESCOLHIDO
    // =====================================================

    const body = await request.json();

    const role = body.role as UserRole;

    // =====================================================
    // VALIDA O PERFIL
    // =====================================================

    if (role !== "CUSTOMER" && role !== "BARBER") {
      return NextResponse.json(
        {
          error: "Perfil inválido.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // ATUALIZA O USUÁRIO NO BANCO
    // =====================================================

    await db.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        role,
      },
    });

    // =====================================================
    // RETORNA SUCESSO
    // =====================================================

    return NextResponse.json({
      success: true,
      role,
    });
  } catch (error) {
    console.error("ERRO AO ATUALIZAR PERFIL:", error);

    return NextResponse.json(
      {
        error: "Não foi possível atualizar o perfil.",
      },
      {
        status: 500,
      },
    );
  }
}
