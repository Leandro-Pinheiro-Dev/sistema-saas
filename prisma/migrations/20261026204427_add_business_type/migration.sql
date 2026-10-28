-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('BARBERSHOP', 'NAIL_SALON', 'EYEBROW_DESIGN', 'BEAUTY_SALON', 'OTHER');

-- AlterTable
ALTER TABLE "Barbershop" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'BARBERSHOP';
