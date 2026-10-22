export interface BookingServicePrice {
  id: string;
  name: string;
  price: number;
}

// =====================================================
// NORMALIZAR NOME DO SERVIÇO
// =====================================================

const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// =====================================================
// VERIFICAR SE É CORTE DE CABELO
// =====================================================

export function isHaircutService(name: string) {
  return normalizeName(name) === normalizeName("Corte de Cabelo");
}

// =====================================================
// CALCULAR PREÇO INDIVIDUAL DO SERVIÇO
// =====================================================

export function getBookingServicePrice(
  service: BookingServicePrice,
  isChild: boolean,
) {
  // ===================================================
  // CORTE INFANTIL
  // ===================================================
  //
  // Somente o Corte de Cabelo passa de R$35 para R$30.
  //
  // Os outros serviços continuam com o preço normal.
  //

  if (isChild && isHaircutService(service.name)) {
    return 30;
  }

  // ===================================================
  // PREÇO NORMAL
  // ===================================================

  return Number(service.price);
}

// =====================================================
// CALCULAR PREÇOS DE TODOS OS SERVIÇOS
// =====================================================

export function getPricedBookingServices(
  services: BookingServicePrice[],
  isChild: boolean,
) {
  return services.map((service) => ({
    ...service,

    // Mantém o ID original do serviço e altera
    // somente o preço quando necessário.
    price: getBookingServicePrice(service, isChild),
  }));
}
