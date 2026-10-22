import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // =====================================================
    // VERIFICAR LOGIN
    // =====================================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    // =====================================================
    // RECEBER A ASSINATURA DO NAVEGADOR
    // =====================================================

    const body = await request.json();

    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;

    if (
      typeof endpoint !== "string" ||
      typeof p256dh !== "string" ||
      typeof auth !== "string"
    ) {
      return NextResponse.json(
        { error: "Assinatura de push inválida." },
        { status: 400 },
      );
    }

    // =====================================================
    // SALVAR / ATUALIZAR DISPOSITIVO
    // =====================================================

    const subscription = await db.pushSubscription.upsert({
      where: {
        endpoint,
      },
      update: {
        userId: session.user.id,
        p256dh,
        auth,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth,
      },
    });

    return NextResponse.json({
      success: true,
      id: subscription.id,
    });
  } catch (error) {
    console.error("Erro ao salvar PushSubscription:", error);

    return NextResponse.json(
      { error: "Não foi possível salvar o dispositivo." },
      { status: 500 },
    );
  }
}
