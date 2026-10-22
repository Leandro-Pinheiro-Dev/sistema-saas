"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

const LogoutButton = () => {
  const handleLogout = async () => {
    // Encerra a sessão do usuário.
    //
    // callbackUrl "/" define para onde o usuário
    // será enviado depois de sair.
    await signOut({
      callbackUrl: "/login",
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      className="gap-2 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
    >
      <LogOut size={18} />
      Sair
    </Button>
  );
};

export default LogoutButton;
