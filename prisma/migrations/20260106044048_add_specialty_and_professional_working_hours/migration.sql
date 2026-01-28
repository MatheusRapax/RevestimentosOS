-- AlterTable
ALTER TABLE "ClinicUser" ADD COLUMN     "color" TEXT,
ADD COLUMN     "specialtyId" TEXT;

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalWorkingHours" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalWorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Specialty_clinicId_idx" ON "Specialty"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_clinicId_name_key" ON "Specialty"("clinicId", "name");

-- CreateIndex
CREATE INDEX "ProfessionalWorkingHours_clinicId_idx" ON "ProfessionalWorkingHours"("clinicId");

-- CreateIndex
CREATE INDEX "ProfessionalWorkingHours_userId_idx" ON "ProfessionalWorkingHours"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalWorkingHours_clinicId_userId_dayOfWeek_key" ON "ProfessionalWorkingHours"("clinicId", "userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ClinicUser_specialtyId_idx" ON "ClinicUser"("specialtyId");

-- AddForeignKey
ALTER TABLE "ClinicUser" ADD CONSTRAINT "ClinicUser_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalWorkingHours" ADD CONSTRAINT "ProfessionalWorkingHours_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalWorkingHours" ADD CONSTRAINT "ProfessionalWorkingHours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
