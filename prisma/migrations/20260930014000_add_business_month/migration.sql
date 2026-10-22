-- CreateTable
CREATE TABLE "BusinessMonth" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMonth_barbershopId_year_month_key"
ON "BusinessMonth"("barbershopId", "year", "month");

-- CreateIndex
CREATE INDEX "BusinessMonth_barbershopId_idx"
ON "BusinessMonth"("barbershopId");

-- AddForeignKey
ALTER TABLE "BusinessMonth"
ADD CONSTRAINT "BusinessMonth_barbershopId_fkey"
FOREIGN KEY ("barbershopId")
REFERENCES "Barbershop"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;