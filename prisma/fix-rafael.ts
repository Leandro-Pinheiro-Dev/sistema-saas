import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixRafael() {
  try {
    const googleSub = "109027184125296706583";
    const rafaelEmail = "rafael.spacovip26@gmail.com";

    console.log("=================================");
    console.log("CORRIGINDO CONTA DO RAFAEL");
    console.log("=================================");

    // 1. Procurar usuário Rafael
    let rafael = await prisma.user.findUnique({
      where: {
        email: rafaelEmail,
      },
    });

    // 2. Se não existir, criar
    if (!rafael) {
      rafael = await prisma.user.create({
        data: {
          id: "cmt3n2x8y0000uwz0jxd2z136",
          name: "Rafael Santos",
          email: rafaelEmail,
          role: "BARBER",
        },
      });

      console.log("✅ Usuário Rafael criado.");
    } else {
      console.log("✅ Usuário Rafael encontrado:", rafael.id);
    }

    // 3. Garantir que Rafael seja BARBER
    rafael = await prisma.user.update({
      where: {
        id: rafael.id,
      },
      data: {
        role: "BARBER",
        name: "Rafael Santos",
      },
    });

    console.log("✅ Rafael definido como BARBER.");

    // 4. Procurar TODAS as contas Google
    const googleAccounts = await prisma.account.findMany({
      where: {
        provider: "google",
      },
    });

    console.log("\nCONTAS GOOGLE ANTES DA CORREÇÃO:");

    for (const account of googleAccounts) {
      console.log({
        id: account.id,
        providerAccountId: account.providerAccountId,
        userId: account.userId,
      });
    }

    // 5. Procurar a conta do Rafael pelo sub REAL do Google
    const rafaelAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleSub,
        },
      },
    });

    // 6. Se a conta já existe, transferir para Rafael
    if (rafaelAccount) {
      await prisma.account.update({
        where: {
          id: rafaelAccount.id,
        },
        data: {
          userId: rafael.id,
        },
      });

      console.log("✅ Account do Google transferida para Rafael.");
    } else {
      console.log("⚠️ Account do Rafael ainda não existe no banco.");
    }

    // 7. Mostrar resultado final
    const finalAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleSub,
        },
      },
      include: {
        user: true,
      },
    });

    console.log("\n=================================");
    console.log("RESULTADO FINAL");
    console.log("=================================");

    console.log(finalAccount);

    console.log("\n=================================");
    console.log("USUÁRIOS");
    console.log("=================================");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.table(users);

    console.log("\n✅ CORREÇÃO FINALIZADA.");
  } catch (error) {
    console.error("❌ ERRO:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRafael();
