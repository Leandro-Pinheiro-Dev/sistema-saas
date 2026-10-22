"use client";

import { SmartphoneIcon } from "lucide-react";
import { Button } from "./ui/button";

interface PhoneItemProps {
  phone: string;
}

const PhoneItem = ({ phone }: PhoneItemProps) => {
  const handleWhatsAppClick = (phone: string) => {
    // Remove espaços, parênteses, hífens e outros caracteres
    const cleanPhone = phone.replace(/\D/g, "");

    // Adiciona o código do Brasil caso ainda não exista
    const whatsappPhone = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;

    // Abre o WhatsApp
    window.open(
      `https://wa.me/${whatsappPhone}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="flex justify-between">
      {/* ESQUERDA */}
      <div className="flex items-center gap-2">
        <SmartphoneIcon />
        <p className="text-sm">{phone}</p>
      </div>

      {/* DIREITA */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleWhatsAppClick(phone)}
      >
        WhatsApp
      </Button>
    </div>
  );
};

export default PhoneItem;
