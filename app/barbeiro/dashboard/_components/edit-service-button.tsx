"use client";

import { useState, useTransition } from "react";

import { Pencil, Save, X } from "lucide-react";

import { updateService } from "@/app/_actions/update-service";

import { Button } from "@/app/_components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";

import { Input } from "@/app/_components/ui/input";

interface EditServiceButtonProps {
  service: {
    id: string;
    name: string;
    price: number;
  };
}

const EditServiceButton = ({ service }: EditServiceButtonProps) => {
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(service.name);

  const [price, setPrice] = useState(
    service.price.toFixed(2).replace(".", ","),
  );

  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    // =====================================================
    // CONVERTE O PREÇO
    // =====================================================

    const numericPrice = Number(price.replace(/\./g, "").replace(",", "."));

    // =====================================================
    // VALIDAÇÃO
    // =====================================================

    if (!name.trim()) {
      alert("Informe o nome do serviço.");
      return;
    }

    if (!numericPrice || numericPrice <= 0) {
      alert("Informe um preço válido.");
      return;
    }

    // =====================================================
    // ATUALIZAÇÃO
    // =====================================================

    startTransition(async () => {
      try {
        await updateService({
          serviceId: service.id,
          name,
          price: numericPrice,
        });

        // Fecha o modal após salvar
        setOpen(false);

        // Atualiza os dados da página
        window.location.reload();
      } catch (error) {
        console.error(error);

        alert(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o serviço.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="icon" title="Editar serviço" />}
      >
        <Pencil size={17} />
      </DialogTrigger>

      <DialogContent className="w-[90%] max-w-md">
        <DialogHeader>
          <DialogTitle>Editar serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* =================================================
              NOME DO SERVIÇO
          ================================================= */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do serviço</label>

            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Corte de Cabelo"
            />
          </div>

          {/* =================================================
              PREÇO
          ================================================= */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Preço</label>

            <Input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="35,00"
              inputMode="decimal"
            />
          </div>

          {/* =================================================
              BOTÕES
          ================================================= */}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              <X size={17} />
              Cancelar
            </Button>

            <Button
              className="flex-1 gap-2"
              onClick={handleSave}
              disabled={isPending}
            >
              <Save size={17} />

              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceButton;
