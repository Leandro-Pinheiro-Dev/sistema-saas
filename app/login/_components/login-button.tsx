"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/app/_components/ui/button";

import { LogIn } from "lucide-react";

const LoginButton = () => {
  const handleLogin = async () => {
    await signIn("google", {
      callbackUrl: "/",
    });
  };

  return (
    <Button
      type="button"
      onClick={handleLogin}
      className="w-full gap-3"
      size="lg"
    >
      <LogIn size={20} />
      Entrar com Google
    </Button>
  );
};

export default LoginButton;
