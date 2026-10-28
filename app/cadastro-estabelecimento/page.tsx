"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

import { createBusiness } from "@/app/_actions/create-business";

const businessTypes = [
  { value: "BARBERSHOP", label: "Barbearia" },
  { value: "NAIL_SALON", label: "Manicure e unhas" },
  { value: "EYEBROW_DESIGN", label: "Sobrancelhas" },
  { value: "BEAUTY_SALON", label: "Salão de beleza" },
  { value: "OTHER", label: "Outro" },
];

export default function CreateBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      await createBusiness({
        name: String(form.get("name") ?? ""),
        businessType: String(form.get("businessType") ?? ""),
        address: String(form.get("address") ?? ""),
        phone: String(form.get("phone") ?? ""),
        description: String(form.get("description") ?? ""),
      });

      router.replace("/barbeiro/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível cadastrar.";

      if (message.includes("NEXT_REDIRECT")) {
        router.replace("/barbeiro/dashboard");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-amber-500";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-white">
      <section className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
            <Store size={28} />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Cadastre seu estabelecimento</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Comece a organizar seus serviços e agendamentos.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm">
              Nome do estabelecimento
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={100}
              className={inputClass}
              placeholder="Ex.: Espaço Bela"
            />
          </div>

          <div>
            <label htmlFor="businessType" className="mb-2 block text-sm">
              Segmento
            </label>
            <select
              id="businessType"
              name="businessType"
              required
              defaultValue="BARBERSHOP"
              className={inputClass}
            >
              {businessTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="address" className="mb-2 block text-sm">
              Endereço
            </label>
            <input
              id="address"
              name="address"
              required
              maxLength={200}
              className={inputClass}
              placeholder="Rua, número, bairro e cidade"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm">
              Telefone ou WhatsApp
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              maxLength={30}
              className={inputClass}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              required
              maxLength={1000}
              rows={4}
              className={inputClass}
              placeholder="Conte um pouco sobre seu estabelecimento"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-950 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-300">Plano inicial</p>
            <p className="mt-1 text-2xl font-bold">
              R$ 70,00{" "}
              <span className="text-sm font-normal text-zinc-400">/mês</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Valor inicial para um membro ativo, incluindo o proprietário.
              Nenhuma cobrança será realizada por este formulário.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-500 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Cadastrando..." : "Cadastrar estabelecimento"}
          </button>
        </form>
      </section>
    </main>
  );
}
