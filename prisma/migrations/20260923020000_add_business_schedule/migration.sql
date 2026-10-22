-- =====================================================
-- CONFIGURAÇÃO DA AGENDA DA BARBEARIA
-- =====================================================

CREATE TABLE "BusinessDay" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessDay_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- HORÁRIOS INDIVIDUAIS DA AGENDA
-- =====================================================

CREATE TABLE "BusinessTimeSlot" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTimeSlot_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- ÍNDICES / UNIQUE
-- =====================================================

CREATE UNIQUE INDEX "BusinessDay_barbershopId_dayOfWeek_key"
ON "BusinessDay"("barbershopId", "dayOfWeek");

CREATE INDEX "BusinessDay_barbershopId_idx"
ON "BusinessDay"("barbershopId");

CREATE UNIQUE INDEX "BusinessTimeSlot_barbershopId_dayOfWeek_time_key"
ON "BusinessTimeSlot"("barbershopId", "dayOfWeek", "time");

CREATE INDEX "BusinessTimeSlot_barbershopId_dayOfWeek_idx"
ON "BusinessTimeSlot"("barbershopId", "dayOfWeek");

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

ALTER TABLE "BusinessDay"
ADD CONSTRAINT "BusinessDay_barbershopId_fkey"
FOREIGN KEY ("barbershopId")
REFERENCES "Barbershop"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "BusinessTimeSlot"
ADD CONSTRAINT "BusinessTimeSlot_barbershopId_fkey"
FOREIGN KEY ("barbershopId")
REFERENCES "Barbershop"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
