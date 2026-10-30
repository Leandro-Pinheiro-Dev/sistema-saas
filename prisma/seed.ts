import { PrismaClient, BusinessType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Catálogos-base de serviços do SaaS.
 *
 * Estes modelos podem ser usados futuramente no onboarding:
 * quando o proprietário cadastrar um estabelecimento, a aplicação
 * poderá apresentar os serviços adequados ao nicho escolhido.
 *
 * Não são inseridos automaticamente no banco.
 */

type ServiceTemplate = {
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
};

const SERVICE_TEMPLATES: Record<BusinessType, ServiceTemplate[]> = {
  BARBERSHOP: [
    {
      name: "Corte de cabelo",
      description: "Corte tradicional ou personalizado.",
      price: 35,
      durationMinutes: 30,
      imageUrl: null,
    },
    {
      name: "Barba",
      description: "Aparar e modelar a barba.",
      price: 35,
      durationMinutes: 30,
      imageUrl: null,
    },
    {
      name: "Pezinho",
      description: "Acabamento do contorno do cabelo.",
      price: 10,
      durationMinutes: 10,
      imageUrl: null,
    },
    {
      name: "Sobrancelha",
      description: "Ajuste e acabamento das sobrancelhas.",
      price: 8,
      durationMinutes: 15,
      imageUrl: null,
    },
  ],

  NAIL_SALON: [
    {
      name: "Manicure",
      description: "Cuidados e esmaltação das unhas das mãos.",
      price: 35,
      durationMinutes: 45,
      imageUrl: null,
    },
    {
      name: "Pedicure",
      description: "Cuidados e esmaltação das unhas dos pés.",
      price: 40,
      durationMinutes: 50,
      imageUrl: null,
    },
    {
      name: "Alongamento de unhas",
      description: "Aplicação de alongamento conforme a técnica escolhida.",
      price: 100,
      durationMinutes: 120,
      imageUrl: null,
    },
    {
      name: "Manutenção de unhas",
      description: "Manutenção do alongamento existente.",
      price: 70,
      durationMinutes: 90,
      imageUrl: null,
    },
  ],

  EYEBROW_DESIGN: [
    {
      name: "Design de sobrancelhas",
      description: "Modelagem de sobrancelhas conforme o formato do rosto.",
      price: 35,
      durationMinutes: 30,
      imageUrl: null,
    },
    {
      name: "Design com henna",
      description: "Modelagem e aplicação de henna.",
      price: 45,
      durationMinutes: 40,
      imageUrl: null,
    },
    {
      name: "Brow lamination",
      description: "Procedimento estético para alinhamento dos fios.",
      price: 90,
      durationMinutes: 60,
      imageUrl: null,
    },
  ],

  BEAUTY_SALON: [
    {
      name: "Escova",
      description: "Finalização dos cabelos com escova.",
      price: 50,
      durationMinutes: 45,
      imageUrl: null,
    },
    {
      name: "Hidratação capilar",
      description: "Tratamento de hidratação dos cabelos.",
      price: 60,
      durationMinutes: 60,
      imageUrl: null,
    },
    {
      name: "Coloração",
      description: "Serviço de coloração capilar.",
      price: 120,
      durationMinutes: 120,
      imageUrl: null,
    },
    {
      name: "Corte feminino",
      description: "Corte de cabelo personalizado.",
      price: 70,
      durationMinutes: 60,
      imageUrl: null,
    },
  ],

  OTHER: [
    {
      name: "Serviço personalizado",
      description: "Modelo de serviço para personalização pelo proprietário.",
      price: 0,
      durationMinutes: 30,
      imageUrl: null,
    },
  ],
};

/**
 * Seed seguro para desenvolvimento.
 *
 * Não cria nem altera registros comerciais.
 * Não exclui dados existentes.
 * Não cria usuários, estabelecimentos ou agendamentos.
 *
 * Os catálogos ficam disponíveis neste arquivo para serem
 * reutilizados pelo fluxo de cadastro de estabelecimentos.
 */
async function main(): Promise<void> {
  await prisma.$connect();

  console.log("========================================");
  console.log("Seed do sistema SaaS");
  console.log("Conexão com o banco realizada.");
  console.log(
    `Nichos com catálogo-base: ${Object.keys(SERVICE_TEMPLATES).length}`,
  );
  console.log(
    `Modelos de serviços disponíveis: ${Object.values(SERVICE_TEMPLATES).reduce(
      (total, services) => total + services.length,
      0,
    )}`,
  );
  console.log("Nenhum usuário de demonstração foi criado.");
  console.log("Nenhum estabelecimento de demonstração foi criado.");
  console.log("Nenhum dado existente foi alterado ou excluído.");
  console.log("========================================");
}

main()
  .catch((error: unknown) => {
    console.error("Erro ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
