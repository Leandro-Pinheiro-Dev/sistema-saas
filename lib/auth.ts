import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { db } from "./prisma";

// =====================================================
// E-MAIL DO ÚNICO BARBEIRO
// =====================================================

const BARBER_EMAIL = "rafael.spacovip26@gmail.com".toLowerCase();

// =====================================================
// CONFIGURAÇÃO DO NEXTAUTH
// =====================================================

export const authOptions: AuthOptions = {
  // ===================================================
  // PRISMA ADAPTER
  // ===================================================

  adapter: PrismaAdapter(db),

  // ===================================================
  // SESSÃO
  // ===================================================

  session: {
    strategy: "jwt",
  },

  // ===================================================
  // GOOGLE
  // ===================================================

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],

  // ===================================================
  // CALLBACKS
  // ===================================================

  callbacks: {
    // =================================================
    // SIGN IN
    // =================================================

    async signIn({ user }) {
      console.log("=================================");
      console.log("GOOGLE LOGIN");
      console.log("USER ID:", user.id);
      console.log("EMAIL:", user.email);
      console.log("=================================");

      if (!user.email) {
        console.log("LOGIN NEGADO: usuário sem e-mail.");
        return false;
      }

      const email = user.email.trim().toLowerCase();

      try {
        // O e-mail autorizado recebe a função BARBER.
        if (email === BARBER_EMAIL) {
          console.log("USUÁRIO IDENTIFICADO COMO BARBEIRO");

          const barber = await db.user.findUnique({
            where: { email },
            select: {
              id: true,
              role: true,
            },
          });

          if (barber) {
            await db.user.update({
              where: { id: barber.id },
              data: {
                role: "BARBER",
                needsRoleSelection: false,
              },
            });

            console.log("BARBER ATUALIZADO:", barber.id);
          } else {
            // O PrismaAdapter normalmente cria o usuário
            // durante o fluxo OAuth. Não criamos outro aqui.
            console.log(
              "Usuário ainda não encontrado no banco; " +
                "a criação será tratada pelo fluxo de autenticação.",
            );
          }

          return true;
        }

        // Todos os demais usuários seguem o fluxo normal.
        console.log("USUÁRIO IDENTIFICADO COMO CUSTOMER");

        return true;
      } catch (error) {
        console.error("ERRO AO VALIDAR USUÁRIO:", error);
        return false;
      }
    },

    // =================================================
    // JWT
    // =================================================

    async jwt({ token, user }) {
      console.log("=================================");
      console.log("JWT CALLBACK");
      console.log("TOKEN SUB:", token.sub);
      console.log("USER ID:", user?.id);
      console.log("USER EMAIL:", user?.email);
      console.log("=================================");

      try {
        // No login inicial, usa o e-mail para localizar
        // o registro real no banco de dados.
        const email = user?.email?.trim().toLowerCase();

        if (email) {
          const dbUser = await db.user.findUnique({
            where: { email },
            select: {
              id: true,
              role: true,
            },
          });

          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role;

            console.log("USUÁRIO ENCONTRADO NO BANCO");
            console.log("ID:", dbUser.id);
            console.log("ROLE:", dbUser.role);
          } else {
            console.error("Usuário não encontrado no banco durante o JWT.");
          }
        } else if (token.sub) {
          // Nas requisições seguintes, atualiza a função
          // com o valor atual do banco, não apenas do token.
          const dbUser = await db.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              role: true,
            },
          });

          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role;

            console.log("ROLE ATUALIZADA DO BANCO:", dbUser.role);
          }
        }

        console.log("TOKEN FINAL:");
        console.log("SUB:", token.sub);
        console.log("ROLE:", token.role);

        return token;
      } catch (error) {
        console.error("ERRO NO CALLBACK JWT:", error);
        throw error;
      }
    },

    // =================================================
    // SESSION
    // =================================================

    async session({ session, token }) {
      console.log("=================================");
      console.log("SESSION CALLBACK");
      console.log("TOKEN SUB:", token.sub);
      console.log("TOKEN ROLE:", token.role);
      console.log("=================================");

      if (session.user && token.sub) {
        session.user.id = token.sub;

        if (token.role) {
          session.user.role = token.role as "CUSTOMER" | "BARBER";
        }
      }

      return session;
    },

    // =================================================
    // REDIRECT
    // =================================================

    async redirect({ url, baseUrl }) {
      console.log("=================================");
      console.log("REDIRECT CALLBACK");
      console.log("URL:", url);
      console.log("BASE URL:", baseUrl);
      console.log("=================================");

      // Aceita caminhos relativos do próprio site.
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Aceita URLs da mesma origem.
      try {
        const redirectUrl = new URL(url);

        if (redirectUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        // URL inválida: redireciona para a página inicial.
      }

      return baseUrl;
    },
  },
};
