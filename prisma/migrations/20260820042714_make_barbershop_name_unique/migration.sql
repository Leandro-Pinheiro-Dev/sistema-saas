/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Barbershop` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Barbershop_name_key" ON "Barbershop"("name");
