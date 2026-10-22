import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { db } from "@/lib/prisma";

import { sendPushNotification } from "@/lib/push";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    const subscriptions = await db.pushSubscription.findMany({
      where: {
        userId: session.user.id,
      },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nenhum dispositivo possui notificações ativadas para este usuário.",
        },
        { status: 404 },
      );
    }

    let sent = 0;
    let removed = 0;

    for (const subscription of subscriptions) {
      try {
        await sendPushNotification(subscription, {
          title: "SpaçoVip Barbearia ✂️",
          body: "Teste de notificação funcionando!",
          url: "/",
        });

        sent++;
      } catch (error: unknown) {
        console.error("Erro ao enviar push:", error);

        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : undefined;

        // 404 ou 410 normalmente significa
        // que a inscrição daquele dispositivo expirou.
        if (statusCode === 404 || statusCode === 410) {
          await db.pushSubscription.delete({
            where: {
              id: subscription.id,
            },
          });

          removed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      removed,
    });
  } catch (error) {
    console.error("Erro no teste de notificação:", error);

    return NextResponse.json(
      {
        error: "Não foi possível enviar a notificação.",
      },
      { status: 500 },
    );
  }
}
