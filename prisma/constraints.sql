-- Run after the initial Prisma migration on PostgreSQL.
-- This is the final database guard against overlapping doctor appointments.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT appointment_doctor_no_overlap
  EXCLUDE USING gist (
    "doctorId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELLED');
