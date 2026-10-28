import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

import { db } from "./prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db),

  session: {
    strategy: "jwt",
  },

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

  callbacks: {
    async signIn({ user }) {
      // Só permite entrar com uma conta Google que tenha e-mail.
      // Não atribui perfil administrativo pelo endereço de e-mail.
      return Boolean(user.email?.trim());
    },

    async jwt({ token, user }) {
      // No login inicial, usa o ID fornecido pelo Prisma Adapter.
      if (user?.id) {
        token.sub = user.id;
      }

      if (!token.sub) {
        return token;
      }

      // Consulta o perfil atual no banco, evitando depender
      // exclusivamente do valor armazenado anteriormente no JWT.
      const dbUser = await db.user.findUnique({
        where: {
          id: token.sub,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (dbUser) {
        token.sub = dbUser.id;
        token.role = dbUser.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        if (token.role) {
          session.user.role = token.role as "CUSTOMER" | "BARBER";
        }
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const redirectUrl = new URL(url);

        if (redirectUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        // URL inválida: usa a página inicial.
      }

      return baseUrl;
    },
  },
};
