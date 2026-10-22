-- =====================================================
-- LIBERAÇÃO TEMPORÁRIA DE CLIENTE FIXO
-- =====================================================

CREATE TABLE "FixedScheduleException" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedScheduleException_pkey"
        PRIMARY KEY ("id")
);

-- =====================================================
-- UNIQUE
-- Uma exceção por barbearia + data + horário
-- =====================================================

CREATE UNIQUE INDEX "FixedScheduleException_barbershopId_date_time_key"
ON "FixedScheduleException"("barbershopId", "date", "time");

-- =====================================================
-- INDEX
-- =====================================================

CREATE INDEX "FixedScheduleException_barbershopId_date_idx"
ON "FixedScheduleException"("barbershopId", "date");

-- =====================================================
-- RELAÇÃO COM BARBEARIA
-- =====================================================

ALTER TABLE "FixedScheduleException"
ADD CONSTRAINT "FixedScheduleException_barbershopId_fkey"
FOREIGN KEY ("barbershopId")
REFERENCES "Barbershop"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

