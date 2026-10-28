import {
  PrismaClient,
  BusinessType,
  MembershipRole,
  UserRole,
  SubscriptionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const PRICE_PER_MEMBER = 70;

// Catálogos de exemplo para os nichos disponíveis no SaaS.
// Somente os serviços do nicho da SpaçoVip serão cadastrados pelo seed.
// Os outros catálogos poderão servir de base para o onboarding do proprietário.
const SERVICE_TEMPLATES: Record<
  BusinessType,
  Array<{
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    imageUrl: string;
  }>
> = {
  BARBERSHOP: [
    {
      name: "Corte de Cabelo",
      description: "Corte personalizado de acordo com seu estilo.",
      price: 35,
      durationMinutes: 30,
      imageUrl:
        "https://utfs.io/f/0ddfbd26-a424-43a0-aaf3-c3f1dc6be6d1-1kgxo7.png",
    },
    {
      name: "Barba",
      description: "Modelagem e acabamento da barba.",
      price: 35,
      durationMinutes: 30,
      imageUrl:
        "https://utfs.io/f/e6bdffb6-24a9-455b-aba3-903c2c2b5bde-1jo6tu.png",
    },
    {
      name: "Pézinho",
      description: "Acabamento para manter o corte alinhado.",
      price: 10,
      durationMinutes: 30,
      imageUrl:
        "https://utfs.io/f/8a457cda-f768-411d-a737-cdb23ca6b9b5-b3pegf.png",
    },
    {
      name: "Sobrancelha",
      description: "Modelagem de sobrancelhas.",
      price: 8,
      durationMinutes: 30,
      imageUrl:
        "https://utfs.io/f/2118f76e-89e4-43e6-87c9-8f157500c333-b0ps0b.png",
    },
  ],

  NAIL_SALON: [
    {
      name: "Manicure",
      description: "Cuidados e esmaltação das unhas das mãos.",
      price: 30,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Manicure",
    },
    {
      name: "Pedicure",
      description: "Cuidados e esmaltação das unhas dos pés.",
      price: 35,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Pedicure",
    },
    {
      name: "Alongamento de Unhas",
      description: "Aplicação de alongamento de unhas.",
      price: 100,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Alongamento",
    },
    {
      name: "Esmaltação em Gel",
      description: "Esmaltação em gel para maior durabilidade.",
      price: 55,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Esmaltacao",
    },
  ],

  EYEBROW_DESIGN: [
    {
      name: "Design de Sobrancelhas",
      description: "Design personalizado para valorizar o olhar.",
      price: 35,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Design",
    },
    {
      name: "Design com Henna",
      description: "Design de sobrancelhas com aplicação de henna.",
      price: 45,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Henna",
    },
    {
      name: "Brow Lamination",
      description: "Alinhamento e estilização dos fios.",
      price: 90,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Brow",
    },
  ],

  BEAUTY_SALON: [
    {
      name: "Escova",
      description: "Finalização e modelagem dos cabelos.",
      price: 50,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Escova",
    },
    {
      name: "Coloração",
      description: "Serviço de coloração com avaliação prévia.",
      price: 120,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Coloracao",
    },
    {
      name: "Hidratação",
      description: "Tratamento hidratante para os cabelos.",
      price: 80,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Hidratacao",
    },
    {
      name: "Corte Feminino",
      description: "Corte personalizado conforme o estilo desejado.",
      price: 70,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Corte",
    },
  ],

  OTHER: [
    {
      name: "Serviço Inicial",
      description: "Edite o nome, a descrição e o preço no painel.",
      price: 50,
      durationMinutes: 30,
      imageUrl: "https://placehold.co/800x600/png?text=Servico",
    },
  ],
};

const BUSINESS_DAYS = [
  { dayOfWeek: 0, active: false }, // Domingo
  { dayOfWeek: 1, active: false }, // Segunda
  { dayOfWeek: 2, active: true }, // Terça
  { dayOfWeek: 3, active: true }, // Quarta
  { dayOfWeek: 4, active: true }, // Quinta
  { dayOfWeek: 5, active: true }, // Sexta
  { dayOfWeek: 6, active: true }, // Sábado
];

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

async function seedDatabase() {
  try {
    // =====================================================
    // 1. NEGÓCIO DE DEMONSTRAÇÃO
    // =====================================================

    const barbershop = await prisma.barbershop.upsert({
      where: {
        slug: "barbearia-spacovip",
      },
      update: {
        name: "Barbearia SpaçoVip",
        businessType: BusinessType.BARBERSHOP,
        address: "Sebastião Batista de Oliveira - Conj. Hab. Sao Jose, 157",
        phones: ["(11) 99882-1533"],
        description:
          "Desde 2006, a Barbearia SpaçoVip faz parte da comunidade São José. Oferecemos serviços de barbearia com atendimento acolhedor, respeito e dedicação.",
      },
      create: {
        name: "Barbearia SpaçoVip",
        businessType: BusinessType.BARBERSHOP,
        slug: "barbearia-spacovip",
        address: "Sebastião Batista de Oliveira - Conj. Hab. Sao Jose, 157",
        phones: ["(11) 99882-1533"],
        description:
          "Desde 2006, a Barbearia SpaçoVip faz parte da comunidade São José. Oferecemos serviços de barbearia com atendimento acolhedor, respeito e dedicação.",
      },
    });

    // =====================================================
    // 2. USUÁRIOS DE DEMONSTRAÇÃO
    // =====================================================
    // Este seed utiliza Leandro como proprietário e Rafael
    // como funcionário da SpaçoVip.
    //
    // Ajuste os e-mails abaixo se essas contas não devem
    // ser usadas para a demonstração do SaaS.

    const owner = await prisma.user.upsert({
      where: {
        email: "leandropinheiro478@gmail.com",
      },
      update: {
        name: "Leandro Pinheiro",
        role: UserRole.BARBER,
        needsRoleSelection: false,
      },
      create: {
        email: "leandropinheiro478@gmail.com",
        name: "Leandro Pinheiro",
        role: UserRole.BARBER,
        needsRoleSelection: false,
      },
    });

    const employee = await prisma.user.upsert({
      where: {
        email: "rafael.spacovip26@gmail.com",
      },
      update: {
        name: "Rafael Santos",
        role: UserRole.BARBER,
        needsRoleSelection: false,
      },
      create: {
        email: "rafael.spacovip26@gmail.com",
        name: "Rafael Santos",
        role: UserRole.BARBER,
        needsRoleSelection: false,
      },
    });

    // =====================================================
    // 3. VÍNCULOS E PERMISSÕES POR NEGÓCIO
    // =====================================================

    await prisma.membership.upsert({
      where: {
        userId_barbershopId: {
          userId: owner.id,
          barbershopId: barbershop.id,
        },
      },
      update: {
        role: MembershipRole.OWNER,
        active: true,
      },
      create: {
        userId: owner.id,
        barbershopId: barbershop.id,
        role: MembershipRole.OWNER,
        active: true,
      },
    });

    await prisma.membership.upsert({
      where: {
        userId_barbershopId: {
          userId: employee.id,
          barbershopId: barbershop.id,
        },
      },
      update: {
        role: MembershipRole.BARBER,
        active: true,
      },
      create: {
        userId: employee.id,
        barbershopId: barbershop.id,
        role: MembershipRole.BARBER,
        active: true,
      },
    });

    // =====================================================
    // 4. ASSINATURA SAAS
    // =====================================================

    const activeMemberCount = await prisma.membership.count({
      where: {
        barbershopId: barbershop.id,
        active: true,
      },
    });

    const monthlyTotal = activeMemberCount * PRICE_PER_MEMBER;

    await prisma.subscription.upsert({
      where: {
        barbershopId: barbershop.id,
      },
      update: {
        memberCount: activeMemberCount,
        pricePerMember: PRICE_PER_MEMBER,
        totalAmount: monthlyTotal,
      },
      create: {
        barbershopId: barbershop.id,
        status: SubscriptionStatus.TRIAL,
        memberCount: activeMemberCount,
        pricePerMember: PRICE_PER_MEMBER,
        totalAmount: monthlyTotal,
      },
    });

    // =====================================================
    // 5. SERVIÇOS DO NICHO DO NEGÓCIO
    // =====================================================

    const services = SERVICE_TEMPLATES[barbershop.businessType];

    for (const service of services) {
      const existingService = await prisma.barbershopService.findFirst({
        where: {
          barbershopId: barbershop.id,
          name: service.name,
        },
      });

      if (existingService) {
        await prisma.barbershopService.update({
          where: {
            id: existingService.id,
          },
          data: {
            name: service.name,
            description: service.description,
            price: service.price,
            durationMinutes: service.durationMinutes,
            imageUrl: service.imageUrl,
            barbershopId: barbershop.id,
          },
        });
      } else {
        await prisma.barbershopService.create({
          data: {
            name: service.name,
            description: service.description,
            price: service.price,
            imageUrl: service.imageUrl,
            barbershopId: barbershop.id,
          },
        });
      }
    }

    // =====================================================
    // 7. DIAS DE FUNCIONAMENTO
    // =====================================================

    for (const day of BUSINESS_DAYS) {
      await prisma.businessDay.upsert({
        where: {
          barbershopId_dayOfWeek: {
            barbershopId: barbershop.id,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {
          active: day.active,
        },
        create: {
          barbershopId: barbershop.id,
          dayOfWeek: day.dayOfWeek,
          active: day.active,
        },
      });
    }

    // =====================================================
    // 8. HORÁRIOS DISPONÍVEIS
    // =====================================================
    // Domingo e segunda: todos inativos.
    // Terça a sábado: ativos, exceto 12:00.

    for (const day of BUSINESS_DAYS) {
      for (const time of TIME_SLOTS) {
        const active = day.active && time !== "12:00";

        await prisma.businessTimeSlot.upsert({
          where: {
            barbershopId_dayOfWeek_time: {
              barbershopId: barbershop.id,
              dayOfWeek: day.dayOfWeek,
              time,
            },
          },
          update: {
            active,
          },
          create: {
            barbershopId: barbershop.id,
            dayOfWeek: day.dayOfWeek,
            time,
            active,
          },
        });
      }
    }

    // =====================================================
    // 9. RESUMO
    // =====================================================

    console.log("======================================");
    console.log("Seed executado com sucesso!");
    console.log(`Negócio: ${barbershop.name}`);
    console.log(`Nicho: ${barbershop.businessType}`);
    console.log(`Slug: ${barbershop.slug}`);
    console.log(`Proprietário: ${owner.email}`);
    console.log(`Funcionário: ${employee.email}`);
    console.log(`Serviços cadastrados: ${services.length}`);
    console.log(`Membros ativos: ${activeMemberCount}`);
    console.log(`Valor mensal de referência: R$ ${monthlyTotal.toFixed(2)}`);
    console.log("Status da assinatura: TRIAL");
    console.log("Domingo e segunda: fechados");
    console.log("Terça a sábado: abertos");
    console.log("Horário de almoço: 12:00 bloqueado");
    console.log("======================================");
  } catch (error) {
    console.error("Erro ao executar o seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase().catch((error) => {
  console.error("Falha fatal no seed:", error);
  process.exitCode = 1;
});
