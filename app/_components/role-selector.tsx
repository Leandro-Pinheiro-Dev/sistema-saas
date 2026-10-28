"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Store, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/_components/ui/button";
import { setUserRole } from "@/app/_actions/set-user-role";

const RoleSelector = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCustomer = async () => {
    try {
      setLoading(true);

      await setUserRole();

      toast.success("Cadastro de cliente concluído!");
      router.replace("/");
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
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => router.push("/cadastro-estabelecimento")}
        className="h-auto w-full justify-start gap-4 whitespace-normal p-5 text-left"
      >
        <Store size={30} className="shrink-0" />
        <span>
          <span className="block font-bold">Sou Proprietário</span>
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            Quero cadastrar meu estabelecimento e gerenciar meu negócio.
          </span>
        </span>
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => router.push("/acesso/funcionario")}
        className="h-auto w-full justify-start gap-4 whitespace-normal p-5 text-left"
      >
        <UsersRound size={30} className="shrink-0" />
        <span>
          <span className="block font-bold">Sou Funcionário</span>
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            Quero acessar os agendamentos do estabelecimento onde trabalho.
          </span>
        </span>
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={handleCustomer}
        className="h-auto w-full justify-start gap-4 whitespace-normal p-5 text-left"
      >
        <UserRound size={30} className="shrink-0" />
        <span>
          <span className="block font-bold">Sou Cliente</span>
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            Quero conhecer os estabelecimentos e agendar serviços.
          </span>
        </span>
      </Button>

      {loading && (
        <p className="text-center text-sm text-zinc-400">
          Salvando seu cadastro...
        </p>
      )}

      <p className="flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
        <CalendarDays size={14} />
        Você poderá agendar serviços nos estabelecimentos cadastrados.
      </p>
    </div>
  );
};

export default RoleSelector;
