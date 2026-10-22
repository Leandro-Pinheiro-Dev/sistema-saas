import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    // =====================================================
    // 1. CRIAR / ATUALIZAR A BARBEARIA
    // =====================================================

    const barbershop = await prisma.barbershop.upsert({
      where: {
        name: "Barbearia SpaçoVip",
      },
      update: {
        address: "Sebastião Batista de Oliveira - Conj. Hab. Sao Jose, 157",
        phones: ["(11) 99882-1533"],
        description:
          "Desde 2006, a Barbearia SpaçoVip faz parte da comunidade São José, construindo ao longo dos anos uma história de confiança, amizade e dedicação. Nossa experiência e técnica estão presentes em cada serviço, mas acreditamos que uma barbearia vai muito além de um bom corte. É também um lugar para encontrar amigos, dar boas risadas e compartilhar aquela resenha sobre música, futebol e tantos outros assuntos que fazem parte do nosso dia a dia. Aqui, todos são recebidos de braços abertos, com respeito, simplicidade e sem diferenças. Nosso compromisso é oferecer um excelente serviço aliado a um atendimento acolhedor, criando bons momentos e fazendo com que cada cliente se sinta em casa.",
      },
      create: {
        name: "Barbearia SpaçoVip",
        address: "Sebastião Batista de Oliveira - Conj. Hab. Sao Jose, 157",
        imageUrl: "https://pt.pngtree.com/free-backgrounds-photos/barbearia",
        phones: ["(11) 99882-1533"],
        description:
          "Desde 2006, a Barbearia SpaçoVip faz parte da comunidade São José, construindo ao longo dos anos uma história de confiança, amizade e dedicação. Nossa experiência e técnica estão presentes em cada serviço, mas acreditamos que uma barbearia vai muito além de um bom corte. É também um lugar para encontrar amigos, dar boas risadas e compartilhar aquela resenha sobre música, futebol e tantos outros assuntos que fazem parte do nosso dia a dia. Aqui, todos são recebidos de braços abertos, com respeito, simplicidade e sem diferenças. Nosso compromisso é oferecer um excelente serviço aliado a um atendimento acolhedor, criando bons momentos e fazendo com que cada cliente se sinta em casa.",
      },
    });

    // =====================================================
    // 2. SERVIÇOS
    // =====================================================

    const services = [
      {
        name: "Corte de Cabelo",
        description: "Estilo personalizado com as últimas tendências.",
        price: 35.0,
        imageUrl:
          "https://utfs.io/f/0ddfbd26-a424-43a0-aaf3-c3f1dc6be6d1-1kgxo7.png",
      },
      {
        name: "Barba",
        description: "Modelagem completa para destacar sua masculinidade.",
        price: 35.0,
        imageUrl:
          "https://utfs.io/f/e6bdffb6-24a9-455b-aba3-903c2c2b5bde-1jo6tu.png",
      },
      {
        name: "Pézinho",
        description: "Acabamento perfeito para um visual renovado.",
        price: 10.0,
        imageUrl:
          "https://utfs.io/f/8a457cda-f768-411d-a737-cdb23ca6b9b5-b3pegf.png",
      },
      {
        name: "Sobrancelha",
        description: "Modelagem precisa para destacar o olhar.",
        price: 8.0,
        imageUrl:
          "https://utfs.io/f/2118f76e-89e4-43e6-87c9-8f157500c333-b0ps0b.png",
      },
    ];

    // =====================================================
    // 3. CADASTRAR / ATUALIZAR SERVIÇOS
    // =====================================================

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
            description: service.description,
            price: service.price,
            imageUrl: service.imageUrl,
          },
        });
      } else {
        await prisma.barbershopService.create({
          data: {
            name: service.name,
            description: service.description,
            price: service.price,
            imageUrl: service.imageUrl,
            barbershop: {
              connect: {
                id: barbershop.id,
              },
            },
          },
        });
      }
    }

    // =====================================================
    // 4. HORÁRIOS FIXOS
    //
    // IMPORTANTE:
    // Esses horários continuam separados da configuração
    // da agenda.
    //
    // Portanto:
    // - Alan continua sendo cliente fixo
    // - Diego continua sendo cliente fixo
    // - etc.
    //
    // BusinessDay e BusinessTimeSlot NÃO apagam esses dados.
    // =====================================================

    const fixedSchedules = [
      // QUINTA-FEIRA
      {
        clientName: "Alan",
        dayOfWeek: 4,
        time: "09:00",
      },
      {
        clientName: "Ricardo",
        dayOfWeek: 4,
        time: "18:00",
      },

      // SEXTA-FEIRA
      {
        clientName: "Cris",
        dayOfWeek: 5,
        time: "08:00",
      },
      {
        clientName: "Diego",
        dayOfWeek: 5,
        time: "09:00",
      },
      {
        clientName: "Igor",
        dayOfWeek: 5,
        time: "11:00",
      },
      {
        clientName: "Weley",
        dayOfWeek: 5,
        time: "13:00",
      },
      {
        clientName: "Alemão",
        dayOfWeek: 5,
        time: "17:00",
      },
      {
        clientName: "Thomas",
        dayOfWeek: 5,
        time: "18:00",
      },
      {
        clientName: "Geba",
        dayOfWeek: 5,
        time: "19:00",
      },
      {
        clientName: "Buiu",
        dayOfWeek: 5,
        time: "20:00",
      },

      // SÁBADO
      {
        clientName: "Joaquim",
        dayOfWeek: 6,
        time: "08:00",
      },
      {
        clientName: "Danilo",
        dayOfWeek: 6,
        time: "09:00",
      },
      {
        clientName: "Big",
        dayOfWeek: 6,
        time: "10:00",
      },
      {
        clientName: "Daniel",
        dayOfWeek: 6,
        time: "11:00",
      },
      {
        clientName: "Peterson",
        dayOfWeek: 6,
        time: "13:00",
      },
      {
        clientName: "Zaca",
        dayOfWeek: 6,
        time: "16:00",
      },
      {
        clientName: "Benny",
        dayOfWeek: 6,
        time: "17:00",
      },
    ];

    // =====================================================
    // 5. EVITAR DUPLICAÇÃO DOS HORÁRIOS FIXOS
    // =====================================================

    for (const schedule of fixedSchedules) {
      const existingSchedule = await prisma.fixedSchedule.findFirst({
        where: {
          barbershopId: barbershop.id,
          dayOfWeek: schedule.dayOfWeek,
          time: schedule.time,
        },
      });

      if (existingSchedule) {
        await prisma.fixedSchedule.update({
          where: {
            id: existingSchedule.id,
          },
          data: {
            clientName: schedule.clientName,
          },
        });
      } else {
        await prisma.fixedSchedule.create({
          data: {
            barbershopId: barbershop.id,
            clientName: schedule.clientName,
            dayOfWeek: schedule.dayOfWeek,
            time: schedule.time,
          },
        });
      }
    }

    // =====================================================
    // 6. CONFIGURAÇÃO DOS DIAS DA SEMANA
    //
    // JavaScript:
    //
    // 0 = Domingo
    // 1 = Segunda
    // 2 = Terça
    // 3 = Quarta
    // 4 = Quinta
    // 5 = Sexta
    // 6 = Sábado
    //
    // Regra inicial da SpaçoVip:
    //
    // Domingo  ❌ FECHADO
    // Segunda  ❌ FECHADO
    // Terça    ✅ ABERTO
    // Quarta   ✅ ABERTO
    // Quinta   ✅ ABERTO
    // Sexta    ✅ ABERTO
    // Sábado   ✅ ABERTO
    // =====================================================

    const businessDays = [
      {
        dayOfWeek: 0,
        active: false,
      },
      {
        dayOfWeek: 1,
        active: false,
      },
      {
        dayOfWeek: 2,
        active: true,
      },
      {
        dayOfWeek: 3,
        active: true,
      },
      {
        dayOfWeek: 4,
        active: true,
      },
      {
        dayOfWeek: 5,
        active: true,
      },
      {
        dayOfWeek: 6,
        active: true,
      },
    ];

    // =====================================================
    // 7. CADASTRAR / ATUALIZAR DIAS
    // =====================================================

    for (const day of businessDays) {
      await prisma.businessDay.upsert({
        where: {
          barbershopId_dayOfWeek: {
            barbershopId: barbershop.id,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {},
        create: {
          barbershopId: barbershop.id,
          dayOfWeek: day.dayOfWeek,
          active: day.active,
        },
      });
    }

    // =====================================================
    // 8. HORÁRIOS DISPONÍVEIS
    //
    // 12:00 fica propositalmente fora do horário de
    // atendimento.
    //
    // A configuração terá TODOS os horários cadastrados.
    // Isso permite que o barbeiro posteriormente possa
    // bloquear/desbloquear individualmente pelo dashboard.
    //
    // 08:00
    // 09:00
    // 10:00
    // 11:00
    // 12:00  -> BLOQUEADO
    // 13:00
    // 14:00
    // 15:00
    // 16:00
    // 17:00
    // 18:00
    // 19:00
    // 20:00
    // =====================================================

    const timeList = [
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

    // =====================================================
    // 9. CADASTRAR / ATUALIZAR HORÁRIOS
    //
    // Para cada dia criamos todos os horários.
    //
    // Domingo e segunda:
    //   todos começam bloqueados.
    //
    // Terça a sábado:
    //   08:00-11:00 -> ativos
    //   12:00       -> bloqueado
    //   13:00-20:00 -> ativos
    // =====================================================

    for (const day of businessDays) {
      for (const time of timeList) {
        const isLunchTime = time === "12:00";

        const active = day.active === true && !isLunchTime;

        await prisma.businessTimeSlot.upsert({
          where: {
            barbershopId_dayOfWeek_time: {
              barbershopId: barbershop.id,
              dayOfWeek: day.dayOfWeek,
              time,
            },
          },
          update: {},
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
    // 10. LOGIN DO BARBEIRO
    // =====================================================

    const rafael = await prisma.user.upsert({
      where: {
        email: "rafael.spacovip26@gmail.com",
      },
      update: {
        role: "BARBER",
        name: "Rafael Santos",
      },
      create: {
        email: "rafael.spacovip26@gmail.com",
        name: "Rafael Santos",
        role: "BARBER",
      },
    });

    console.log("Rafael:", rafael);

    // =====================================================
    // 11. RESUMO
    // =====================================================

    console.log("======================================");
    console.log("✅ Barbearia cadastrada/atualizada!");
    console.log("✅ Serviços cadastrados/atualizados!");
    console.log("✅ Horários fixos cadastrados/atualizados!");
    console.log("✅ Dias da agenda configurados!");
    console.log("✅ Horários da agenda configurados!");
    console.log("======================================");
    console.log("📅 Domingo: FECHADO");
    console.log("📅 Segunda: FECHADO");
    console.log("📅 Terça a sábado: ABERTO");
    console.log("🕛 12:00: BLOQUEADO");
    console.log("🕗 08:00-11:00: DISPONÍVEL");
    console.log("🕐 13:00-20:00: DISPONÍVEL");
    console.log("======================================");
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
