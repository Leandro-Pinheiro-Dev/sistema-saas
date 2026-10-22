"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { UserRound, Scissors } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/app/_components/ui/button";

import { setUserRole } from "@/app/_actions/set-user-role";

const RoleSelector = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const handleSelectRole = async (role: "CUSTOMER" | "BARBER") => {
    try {
      setLoading(true);

      // =================================================
      // SALVA O PERFIL NO BANCO
      // =================================================

      await setUserRole(role);

      toast.success("Cadastro concluído!");

      // =================================================
      // REDIRECIONAMENTO
      // =================================================

      if (role === "BARBER") {
        router.push("/barbeiro/dashboard");
      } else {
        router.push("/");
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o cadastro.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* =================================================
          CUSTOMER
      ================================================= */}

      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => handleSelectRole("CUSTOMER")}
        className="h-auto w-full justify-start gap-4 p-5 text-left"
      >
        <UserRound size={30} />

        <div>
          <p className="font-bold">Sou Cliente</p>

          <p className="text-sm text-muted-foreground">
            Quero agendar serviços e avaliar a barbearia.
          </p>
        </div>
      </Button>

      {/* =================================================
          BARBER
      ================================================= */}

      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => handleSelectRole("BARBER")}
        className="h-auto w-full justify-start gap-4 p-5 text-left"
      >
        <Scissors size={30} />

        <div>
          <p className="font-bold">Sou Barbeiro</p>

          <p className="text-sm text-muted-foreground">
            Quero gerenciar minha agenda e meus clientes.
          </p>
        </div>
      </Button>
    </div>
  );
};

export default RoleSelector;
