import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Você precisa estar logado." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);

    // Impede que esta API conceda acesso de dono ou funcionário.
    if (body?.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          error:
            "Este cadastro só permite o perfil de cliente. Para acessar um negócio, solicite um convite ao proprietário.",
        },
        { status: 403 },
      );
    }

    const user = await db.user.update({
      where: { id: session.user.id },
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

    return NextResponse.json({
      success: true,
      role: user.role,
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o perfil." },
      { status: 500 },
    );
  }
}
