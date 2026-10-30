"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createService } from "@/app/_actions/create-service";

type CreateServiceFormProps = {
  barbershopId: string;
};

export default function CreateServiceForm({
  barbershopId,
}: CreateServiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await createService({
        barbershopId,
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        price: Number(formData.get("price")),
        durationMinutes: Number(formData.get("durationMinutes")),
        imageUrl: String(formData.get("imageUrl") ?? ""),
      });

      form.reset();
      setSuccess("Serviço cadastrado com sucesso.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível cadastrar o serviço.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
    >
      <h3 className="font-semibold text-white">Adicionar serviço</h3>

      <div>
        <label
          htmlFor="service-name"
          className="mb-1.5 block text-sm text-zinc-300"
        >
          Nome
        </label>
        <input
          id="service-name"
          name="name"
          required
          maxLength={100}
          className={inputClass}
          placeholder="Ex.: Corte de cabelo"
        />
      </div>

      <div>
        <label
          htmlFor="service-description"
          className="mb-1.5 block text-sm text-zinc-300"
        >
          Descrição
        </label>
        <textarea
          id="service-description"
          name="description"
          maxLength={1000}
          rows={3}
          className={inputClass}
          placeholder="Descreva o serviço (opcional)"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="service-price"
            className="mb-1.5 block text-sm text-zinc-300"
          >
            Preço (R$)
          </label>
          <input
            id="service-price"
            name="price"
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            className={inputClass}
            placeholder="35,00"
          />
        </div>

        <div>
          <label
            htmlFor="service-duration"
            className="mb-1.5 block text-sm text-zinc-300"
          >
            Duração (minutos)
          </label>
          <input
            id="service-duration"
            name="durationMinutes"
            type="number"
            min="5"
            max="720"
            step="5"
            defaultValue="30"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="service-image"
          className="mb-1.5 block text-sm text-zinc-300"
        >
          Caminho da imagem (opcional)
        </label>
        <input
          id="service-image"
          name="imageUrl"
          maxLength={500}
          className={inputClass}
          placeholder="/agenda.jpeg"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Por padrão, será usada a imagem /agenda.jpeg.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-950 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-lg bg-green-950 p-3 text-sm text-green-300"
        >
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-zinc-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Cadastrando..." : "Cadastrar serviço"}
      </button>
    </form>
  );
}
