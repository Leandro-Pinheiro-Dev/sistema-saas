"use client";

import Image from "next/image";
import { toast } from "sonner";

import { Card, CardContent } from "./ui/card";
import { Button } from "@/app/_components/ui/button";

import { useServiceCart } from "./service-cart";

interface Service {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  barbershopId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceItemProps {
  service: Service;
  barbershop: {
    name: string;
  };
}

const ServiceItem = ({ service }: ServiceItemProps) => {
  const { addService, removeService, isInCart } = useServiceCart();

  const selected = isInCart(service.id);

  const formattedPrice = Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(service.price));

  const handleCartClick = () => {
    if (selected) {
      removeService(service.id);

      toast.success(`${service.name} removido do carrinho.`);
      return;
    }

    addService({
      id: service.id,
      name: service.name,
      price: Number(service.price),
    });

    toast.success(`${service.name} adicionado ao carrinho.`);
  };

  return (
    <Card
      className={`overflow-hidden transition ${
        selected ? "border-primary ring-1 ring-primary" : ""
      }`}
    >
      <CardContent className="p-0">
        <div className="border-b border-gray-800 p-3 sm:p-4">
          <div className="flex gap-3 sm:gap-4">
            {/* IMAGEM */}
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
              <Image
                src={service.imageUrl}
                alt={service.name}
                fill
                sizes="(max-width: 640px) 96px, 112px"
                className="object-cover"
              />
            </div>

            {/* INFORMAÇÕES */}
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-sm font-semibold sm:text-base">
                {service.name}
              </h3>

              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400 sm:text-sm">
                {service.description}
              </p>

              <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                <p className="text-sm font-bold text-primary sm:text-base">
                  {formattedPrice}
                </p>

                <Button
                  type="button"
                  variant={selected ? "default" : "secondary"}
                  size="sm"
                  className="shrink-0"
                  onClick={handleCartClick}
                >
                  {selected ? "✓ Selecionado" : "Adicionar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceItem;
