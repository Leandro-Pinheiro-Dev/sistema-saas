import { db } from "@/lib/prisma";

interface IsFixedScheduleParams {
  barbershopId: string;
  date: Date;
  time: string;
}

export const isFixedSchedule = async ({
  barbershopId,
  date,
  time,
}: IsFixedScheduleParams) => {
  const dayOfWeek = date.getDay();

  const fixedSchedule = await db.fixedSchedule.findFirst({
    where: {
      barbershopId,
      dayOfWeek,
      time,
      active: true,
    },
  });

  return fixedSchedule;
};
