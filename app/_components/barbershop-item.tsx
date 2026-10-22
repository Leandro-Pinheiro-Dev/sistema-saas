import { Barbershop } from "@prisma/client";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { StarIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface BarbershopItemProps {
  barbershop: Barbershop;
}

const BarbershopItem = ({ barbershop }: BarbershopItemProps) => {
  return (
    <Card className="w-44 shrink-0 overflow-hidden rounded-2xl sm:w-48">
      <CardContent className="p-0">
        {/* IMAGEM */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/agenda.jpeg"
            alt={barbershop.name}
            fill
            sizes="(max-width: 640px) 176px, 192px"
            className="object-cover"
          />

          {/* AVALIAÇÃO */}
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-1"
          >
            <StarIcon size={12} className="fill-primary text-primary" />

            <span className="text-xs font-semibold">5,0</span>
          </Badge>
        </div>
        {/* TEXTO */}
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold">{barbershop.name}</h3>

          <p className="mt-1 truncate text-xs text-muted-foreground">
            {barbershop.address}
          </p>

          {/* RESERVAR */}
          <Link href={`/barbershops/${barbershop.id}`} className="block">
            <Button variant="secondary" className="mt-3 h-9 w-full text-sm">
              Reservar
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarbershopItem;
