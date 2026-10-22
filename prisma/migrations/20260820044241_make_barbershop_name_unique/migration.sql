/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `BarbershopService` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BarbershopService_name_key" ON "BarbershopService"("name");
