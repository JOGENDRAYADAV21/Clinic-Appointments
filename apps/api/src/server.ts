import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { aiToolDefinitions, findPatient, getCancellationPolicy, getDoctorSchedule, getPatientAppointments } from './ai-tools.js';
import { runOpenAiAssistant } from './ai-service.js';

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(fastifyJwt, { secret: process.env.JWT_SECRET ?? 'local-development-secret-change-me' });

type AuthUser = { id: string; role: 'ADMIN' | 'FRONT_DESK' | 'DOCTOR'; name: string; email: string };
const authenticate = async (request: any, reply: any) => {
  try { await request.jwtVerify(); } catch { return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'A valid login token is required.' } }); }
};
const requireRole = (...roles: AuthUser['role'][]) => async (request: any, reply: any) => {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (!roles.includes(request.user.role)) return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Your role cannot perform this action.' } });
};

const appointmentInput = z.object({
  doctorId: z.string().min(1), patientId: z.string().min(1),
  startTime: z.coerce.date(), endTime: z.coerce.date(),
  reason: z.string().max(200).optional(), notes: z.string().max(1000).optional()
}).refine((value) => value.endTime > value.startTime, { message: 'End time must be after start time' });

app.get('/health', async () => ({ status: 'ok', service: 'medislot-api' }));
app.post('/api/auth/login', async (request, reply) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(request.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
  const token = app.jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
});
app.get('/api/auth/me', { preHandler: authenticate }, async (request: any) => ({ user: request.user }));
app.get('/api/ai/tools', { preHandler: authenticate }, async () => aiToolDefinitions.map(({ name, description }) => ({ name, description })));
app.post('/api/ai/query', { preHandler: authenticate }, async (request, reply) => {
  const { message } = z.object({ message: z.string().min(2).max(500) }).parse(request.body);
  const openAiAnswer = await runOpenAiAssistant(message);
  if (openAiAnswer) return { tool: 'openai-responses', answer: openAiAnswer, data: null };
  const normalized = message.toLowerCase();
  if (normalized.includes('find') || normalized.includes('appointment')) {
    const name = message.match(/(?:find|for)\s+([a-z ]+)/i)?.[1]?.trim() ?? '';
    if (name) {
      const patients = await findPatient({ name });
      return { tool: 'findPatient', answer: patients.length ? `I found ${patients.length} patient record(s) matching ${name}.` : `I could not find a patient matching ${name}.`, data: patients };
    }
  }
  if (normalized.includes('policy') || normalized.includes('fee')) {
    const policy = await getCancellationPolicy({});
    return { tool: 'getCancellationPolicy', answer: `Free cancellation is available until ${policy.freeCancellationWindowMinutes} minutes before the appointment. Late cancellations incur ₹${policy.lateCancellationFee}.`, data: policy };
  }
  if (normalized.includes('schedule') || normalized.includes('availability')) {
    const doctorName = message.match(/dr\.\s+[a-z ]+/i)?.[0] ?? 'Dr. Ananya Sharma';
    const schedule = await getDoctorSchedule({ doctorName, date: new Date() });
    return { tool: 'getDoctorSchedule', answer: schedule.doctor ? `${schedule.doctor.name} has ${schedule.appointments.length} appointment(s) today.` : `I could not find ${doctorName}.`, data: schedule };
  }
  return reply.send({ answer: 'I can search patients, show doctor schedules, check availability, and explain cancellation fees. Try asking “Find Rahul Sharma” or “Show Dr. Sharma schedule”.', data: null });
});
app.get('/api/doctors', async () => prisma.doctor.findMany({ where: { active: true }, orderBy: { name: 'asc' } }));
app.get('/api/patients/search', async (request) => {
  const query = z.object({ q: z.string().min(1) }).parse(request.query).q;
  return prisma.patient.findMany({ where: { OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }, { phone: { contains: query } }] }, take: 20 });
});
app.get('/api/patients/:id/appointments', async (request) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  return prisma.appointment.findMany({ where: { patientId: id }, include: { doctor: true, cancellation: true }, orderBy: { startTime: 'desc' } });
});
app.get('/api/appointments', async (request) => {
  const query = z.object({ date: z.coerce.date().optional(), doctorId: z.string().optional() }).parse(request.query);
  const start = query.date ? new Date(query.date.setHours(0, 0, 0, 0)) : undefined;
  const end = query.date ? new Date(query.date.setHours(23, 59, 59, 999)) : undefined;
  return prisma.appointment.findMany({ where: { doctorId: query.doctorId, ...(start && end ? { startTime: { gte: start, lte: end } } : {}) }, include: { doctor: true, patient: true }, orderBy: { startTime: 'asc' } });
});
app.get('/api/appointments/availability', async (request) => {
  const query = z.object({ doctorId: z.string(), startTime: z.coerce.date(), endTime: z.coerce.date() }).parse(request.query);
  const conflict = await prisma.appointment.findFirst({ where: { doctorId: query.doctorId, status: { not: AppointmentStatus.CANCELLED }, startTime: { lt: query.endTime }, endTime: { gt: query.startTime } }, include: { patient: true } });
  return { available: !conflict, conflict: conflict ? { appointmentId: conflict.id, patient: conflict.patient.name, startTime: conflict.startTime, endTime: conflict.endTime } : null };
});
app.post('/api/appointments', { preHandler: requireRole('ADMIN', 'FRONT_DESK') }, async (request, reply) => {
  const input = appointmentInput.parse(request.body);
  try {
    const appointment = await prisma.$transaction(async (transaction) => {
      const conflict = await transaction.appointment.findFirst({ where: { doctorId: input.doctorId, status: { not: AppointmentStatus.CANCELLED }, startTime: { lt: input.endTime }, endTime: { gt: input.startTime } } });
      if (conflict) throw Object.assign(new Error('The doctor already has an appointment during the requested time.'), { code: 'DOCTOR_DOUBLE_BOOKING', conflict });
      return transaction.appointment.create({ data: input, include: { doctor: true, patient: true } });
    });
    return reply.code(201).send({ success: true, appointment });
  } catch (error) {
    const typed = error as { code?: string; message?: string; conflict?: unknown };
    if (typed.code === 'DOCTOR_DOUBLE_BOOKING') return reply.code(409).send({ success: false, error: { code: typed.code, message: typed.message, conflict: typed.conflict } });
    throw error;
  }
});
app.post('/api/appointments/:id/cancel', { preHandler: requireRole('ADMIN', 'FRONT_DESK') }, async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const body = z.object({ reason: z.string().max(200).optional() }).parse(request.body ?? {});
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment || appointment.status === AppointmentStatus.CANCELLED) return reply.code(404).send({ error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found or already cancelled.' } });
  const settings = await prisma.clinicSettings.findFirstOrThrow();
  const cancelledAt = new Date();
  const cutoff = new Date(appointment.startTime.getTime() - settings.freeCancellationWindowMinutes * 60_000);
  const isLate = cancelledAt > cutoff;
  const fee = isLate ? settings.lateCancellationFee : 0;
  const result = await prisma.$transaction(async (transaction) => {
    await transaction.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED } });
    return transaction.cancellation.create({ data: { appointmentId: id, cancelledAt, reason: body.reason, isLate, fee, policySnapshot: { freeCancellationWindowMinutes: settings.freeCancellationWindowMinutes, lateCancellationFee: settings.lateCancellationFee.toString(), timezone: settings.timezone } } });
  });
  return { success: true, cancellation: result };
});
app.get('/api/dashboard', async () => {
  const today = new Date(); today.setHours(0, 0, 0, 0); const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const [appointments, completed, cancelled, late] = await Promise.all([
    prisma.appointment.count({ where: { startTime: { gte: today, lt: tomorrow } } }),
    prisma.appointment.count({ where: { status: AppointmentStatus.COMPLETED, startTime: { gte: today, lt: tomorrow } } }),
    prisma.appointment.count({ where: { status: AppointmentStatus.CANCELLED, startTime: { gte: today, lt: tomorrow } } }),
    prisma.cancellation.count({ where: { isLate: true, cancelledAt: { gte: today, lt: tomorrow } } })
  ]);
  return { appointments, completed, cancelled, lateCancellations: late };
});

app.patch('/api/appointments/:id/status', { preHandler: requireRole('ADMIN', 'DOCTOR') }, async (request, reply) => {
  const { id } = z.object({ id: z.string() }).parse(request.params);
  const { status } = z.object({ status: z.enum(['COMPLETED', 'NO_SHOW', 'SCHEDULED']) }).parse(request.body);
  const appointment = await prisma.appointment.update({ where: { id }, data: { status }, include: { doctor: true, patient: true } });
  return { success: true, appointment };
});

app.get('/api/cancellations', { preHandler: requireRole('ADMIN', 'FRONT_DESK') }, async () => prisma.cancellation.findMany({ include: { appointment: { include: { doctor: true, patient: true } } }, orderBy: { cancelledAt: 'desc' } }));
app.get('/api/reports', { preHandler: requireRole('ADMIN', 'FRONT_DESK') }, async () => {
  const [total, completed, cancelled, revenue] = await Promise.all([
    prisma.appointment.count(), prisma.appointment.count({ where: { status: AppointmentStatus.COMPLETED } }),
    prisma.appointment.count({ where: { status: AppointmentStatus.CANCELLED } }), prisma.cancellation.aggregate({ _sum: { fee: true } })
  ]);
  return { totalAppointments: total, completedAppointments: completed, cancelledAppointments: cancelled, cancellationRate: total ? Math.round((cancelled / total) * 100) : 0, lateCancellationRevenue: revenue._sum.fee ?? 0 };
});
app.get('/api/settings', { preHandler: requireRole('ADMIN', 'FRONT_DESK') }, async () => prisma.clinicSettings.findFirstOrThrow());
app.patch('/api/settings', { preHandler: requireRole('ADMIN') }, async (request) => {
  const input = z.object({ clinicName: z.string().min(2).max(120), timezone: z.string().min(2), freeCancellationWindowMinutes: z.number().int().min(0).max(10080), lateCancellationFee: z.number().min(0).max(100000) }).parse(request.body);
  const existing = await prisma.clinicSettings.findFirstOrThrow();
  return prisma.clinicSettings.update({ where: { id: existing.id }, data: input });
});

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: '0.0.0.0' }).catch((error) => { app.log.error(error); process.exit(1); });
