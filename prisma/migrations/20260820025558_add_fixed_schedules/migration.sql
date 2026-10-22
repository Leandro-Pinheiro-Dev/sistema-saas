-- CreateTable
CREATE TABLE "FixedSchedule" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FixedSchedule_barbershopId_dayOfWeek_time_key" ON "FixedSchedule"("barbershopId", "dayOfWeek", "time");

-- AddForeignKey
ALTER TABLE "FixedSchedule" ADD CONSTRAINT "FixedSchedule_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
