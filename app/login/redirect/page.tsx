import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

const LoginRedirectPage = async () => {
  // =====================================================
  // RECUPERA A SESSÃO
  // =====================================================

  const session = await getServerSession(authOptions);

  console.log("LOGIN REDIRECT");
  console.log("SESSION:", session);

  // =====================================================
  // USUÁRIO NÃO AUTENTICADO
  // =====================================================

  if (!session?.user?.id) {
    redirect("/login");
  }

  // =====================================================
  // BARBEIRO
  // =====================================================

  if (session.user.role === "BARBER") {
    redirect("/barbeiro/dashboard");
  }

  // =====================================================
  // CLIENTE
  // =====================================================

  redirect("/");
};

export default LoginRedirectPage;
