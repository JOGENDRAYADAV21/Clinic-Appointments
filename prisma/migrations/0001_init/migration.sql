-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'FRONT_DESK', 'DOCTOR');
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TABLE "User" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"email" TEXT NOT NULL,"passwordHash" TEXT NOT NULL,"role" "Role" NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PasswordReset" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"tokenHash" TEXT NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Doctor" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"specialization" TEXT NOT NULL,"email" TEXT NOT NULL,"phone" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,"workingHours" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Patient" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"phone" TEXT NOT NULL,"email" TEXT NOT NULL,"dateOfBirth" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Patient_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Appointment" ("id" TEXT NOT NULL,"doctorId" TEXT NOT NULL,"patientId" TEXT NOT NULL,"startTime" TIMESTAMP(3) NOT NULL,"endTime" TIMESTAMP(3) NOT NULL,"status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',"reason" TEXT,"notes" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Cancellation" ("id" TEXT NOT NULL,"appointmentId" TEXT NOT NULL,"cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"reason" TEXT,"isLate" BOOLEAN NOT NULL,"fee" DECIMAL(10,2) NOT NULL,"policySnapshot" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Cancellation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ClinicSettings" ("id" TEXT NOT NULL,"clinicName" TEXT NOT NULL DEFAULT 'MediSlot Clinic',"timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',"freeCancellationWindowMinutes" INTEGER NOT NULL DEFAULT 120,"lateCancellationFee" DECIMAL(10,2) NOT NULL DEFAULT 200,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "ClinicSettings_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE INDEX "PasswordReset_userId_expiresAt_idx" ON "PasswordReset"("userId","expiresAt");
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");
CREATE INDEX "Appointment_doctorId_startTime_endTime_idx" ON "Appointment"("doctorId","startTime","endTime");
CREATE INDEX "Appointment_patientId_startTime_idx" ON "Appointment"("patientId","startTime");
CREATE UNIQUE INDEX "Cancellation_appointmentId_key" ON "Cancellation"("appointmentId");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cancellation" ADD CONSTRAINT "Cancellation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database-level protection: half-open ranges allow back-to-back appointments.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Appointment" ADD CONSTRAINT appointment_doctor_no_overlap EXCLUDE USING gist ("doctorId" WITH =, tsrange("startTime", "endTime", '[)') WITH &&) WHERE ("status" <> 'CANCELLED');
