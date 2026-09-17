import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export const aiToolSchemas = {
  findPatient: z.object({ name: z.string().min(2).max(100) }),
  getDoctorSchedule: z.object({ doctorName: z.string().min(2), date: z.coerce.date() }),
  checkSlotAvailability: z.object({ doctorId: z.string(), startTime: z.coerce.date(), endTime: z.coerce.date() }),
  getPatientAppointments: z.object({ patientId: z.string() }),
  getCancellationPolicy: z.object({})
};

export async function findPatient(input: unknown) {
  const { name } = aiToolSchemas.findPatient.parse(input);
  return prisma.patient.findMany({ where: { name: { contains: name, mode: 'insensitive' } }, take: 10 });
}

export async function getDoctorSchedule(input: unknown) {
  const { doctorName, date } = aiToolSchemas.getDoctorSchedule.parse(input);
  const doctor = await prisma.doctor.findFirst({ where: { name: { contains: doctorName, mode: 'insensitive' } } });
  if (!doctor) return { doctor: null, appointments: [] };
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 1);
  return { doctor, appointments: await prisma.appointment.findMany({ where: { doctorId: doctor.id, startTime: { gte: start, lt: end }, status: { not: AppointmentStatus.CANCELLED } }, include: { patient: true }, orderBy: { startTime: 'asc' } }) };
}

export async function checkSlotAvailability(input: unknown) {
  const { doctorId, startTime, endTime } = aiToolSchemas.checkSlotAvailability.parse(input);
  const conflict = await prisma.appointment.findFirst({ where: { doctorId, status: { not: AppointmentStatus.CANCELLED }, startTime: { lt: endTime }, endTime: { gt: startTime } }, include: { patient: true } });
  return { available: !conflict, conflict };
}

export async function getPatientAppointments(input: unknown) {
  const { patientId } = aiToolSchemas.getPatientAppointments.parse(input);
  return prisma.appointment.findMany({ where: { patientId }, include: { doctor: true, cancellation: true }, orderBy: { startTime: 'desc' } });
}

export async function getCancellationPolicy(input: unknown) {
  aiToolSchemas.getCancellationPolicy.parse(input);
  return prisma.clinicSettings.findFirstOrThrow();
}

export const aiToolDefinitions = [
  { name: 'findPatient', description: 'Find patients by name', parameters: aiToolSchemas.findPatient },
  { name: 'getDoctorSchedule', description: 'Read a doctor schedule for a date', parameters: aiToolSchemas.getDoctorSchedule },
  { name: 'checkSlotAvailability', description: 'Check a requested appointment range', parameters: aiToolSchemas.checkSlotAvailability },
  { name: 'getPatientAppointments', description: 'Read a patient appointment history', parameters: aiToolSchemas.getPatientAppointments },
  { name: 'getCancellationPolicy', description: 'Read the active clinic cancellation policy', parameters: aiToolSchemas.getCancellationPolicy }
] as const;
