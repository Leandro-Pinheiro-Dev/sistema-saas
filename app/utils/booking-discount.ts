export interface DiscountResult {
  subtotal: number;
  discount: number;
  total: number;
  description?: string;
}

interface ServiceForDiscount {
  name: string;
  price: number;
}

// Normaliza o nome para evitar problemas com
// maiúsculas, minúsculas e acentos.
const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function calculateBookingDiscount(
  services: ServiceForDiscount[],
): DiscountResult {
  // =====================================================
  // SUBTOTAL
  // =====================================================

  const subtotal = services.reduce(
    (total, service) => total + Number(service.price),
    0,
  );

  // Lista dos serviços selecionados.
  const names = services.map((service) => normalizeName(service.name));

  // Verifica se determinado serviço está no carrinho.
  const has = (name: string) => names.includes(normalizeName(name));

  let discount = 0;
  let description: string | undefined;

  // =====================================================
  // COMBO 1
  // CORTE + BARBA
  // =====================================================
  //
  // R$35 + R$35 = R$70
  // Desconto = R$10
  // Total = R$60
  //
  // Este é o primeiro combo porque tem prioridade.
  // =====================================================

  if (has("Corte de Cabelo") && has("Barba")) {
    discount = 10;
    description = "Combo Corte + Barba";
  }

  // =====================================================
  // COMBO 2
  // BARBA + PÉZINHO
  // =====================================================
  //
  // R$35 + R$10 = R$45
  // Desconto = R$5
  // Total = R$40
  //
  // IMPORTANTE:
  // Corte + Pézinho NÃO recebe desconto.
  //
  // Isso porque o Pézinho já está incluído no Corte.
  // =====================================================
  else if (has("Barba") && has("Pézinho")) {
    discount = 5;
    description = "Combo Barba + Pézinho";
  }

  // =====================================================
  // COMBO 3
  // CORTE + SOBRANCELHA
  // =====================================================
  //
  // R$35 + R$8 = R$43
  // Desconto = R$3
  // Total = R$40
  // =====================================================
  else if (has("Corte de Cabelo") && has("Sobrancelha")) {
    discount = 3;
    description = "Combo Corte + Sobrancelha";
  }

  // =====================================================
  // COMBO 4
  // BARBA + SOBRANCELHA
  // =====================================================
  //
  // R$35 + R$8 = R$43
  // Desconto = R$3
  // Total = R$40
  // =====================================================
  else if (has("Barba") && has("Sobrancelha")) {
    discount = 3;
    description = "Combo Barba + Sobrancelha";
  }

  // =====================================================
  // TOTAL FINAL
  // =====================================================

  const total = Math.max(0, subtotal - discount);

  return {
    subtotal,
    discount,
    total,
    description,
  };
}
