"use client";

import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { createEmployee } from "@/app/_actions/create-employee";
import { Button } from "@/app/_components/ui/button";

type CreateEmployeeFormProps = {
  barbershopId: string;
};

export default function CreateEmployeeForm({
  barbershopId,
}: CreateEmployeeFormProps) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        const result = await createEmployee({
          barbershopId,
          email,
        });

        toast.success(result.message);
        setEmail("");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível cadastrar o funcionário.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="employee-email"
          className="mb-2 block text-sm font-medium text-zinc-300"
        >
          E-mail da conta Google do funcionário
        </label>

        <input
          id="employee-email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="funcionario@gmail.com"
          disabled={isPending}
          className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500"
        />
      </div>

      <Button type="submit" disabled={isPending || !email.trim()}>
        {isPending ? "Cadastrando..." : "Adicionar funcionário"}
      </Button>

      <p className="text-xs text-zinc-500">
        O funcionário precisa entrar com Google primeiro para que sua conta seja
        localizada e vinculada ao estabelecimento.
      </p>
    </form>
  );
}
