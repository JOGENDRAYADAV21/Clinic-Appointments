import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const doctors = await Promise.all([
    ['Dr. Ananya Sharma', 'General Medicine', 'ananya@medislot.local', '9876500001'],
    ['Dr. Raj Mehta', 'Cardiology', 'raj@medislot.local', '9876500002'],
    ['Dr. Priya Kapoor', 'Dermatology', 'priya@medislot.local', '9876500003'],
    ['Dr. Arjun Singh', 'Pediatrics', 'arjun@medislot.local', '9876500004']
  ].map(([name, specialization, email, phone]) => prisma.doctor.upsert({
    where: { email }, update: {}, create: {
      name, specialization, email, phone,
      workingHours: { monday: ['09:00', '17:00'], tuesday: ['09:00', '17:00'], wednesday: ['09:00', '17:00'], thursday: ['09:00', '17:00'], friday: ['09:00', '17:00'] }
    }
  })));

  const patients = await Promise.all([
    ['Rahul Sharma', 'rahul@medislot.local', '9876510001'], ['Priya Verma', 'priya.v@medislot.local', '9876510002'],
    ['Amit Kumar', 'amit@medislot.local', '9876510003'], ['Neha Singh', 'neha@medislot.local', '9876510004'],
    ['Rohit Jain', 'rohit@medislot.local', '9876510005']
  ].map(([name, email, phone]) => prisma.patient.upsert({ where: { email }, update: {}, create: { name, email, phone } })));

  await prisma.clinicSettings.upsert({ where: { id: 'default-settings' }, update: {}, create: { id: 'default-settings' } });
  const day = new Date(); day.setHours(9, 0, 0, 0);
  for (let index = 0; index < 5; index++) {
    const start = new Date(day.getTime() + index * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    await prisma.appointment.create({ data: { doctorId: doctors[index % doctors.length].id, patientId: patients[index].id, startTime: start, endTime: end, status: index === 4 ? AppointmentStatus.COMPLETED : AppointmentStatus.SCHEDULED, reason: 'Routine consultation' } });
  }
  const passwordHash = await bcrypt.hash('medislot-demo', 10);
  await prisma.user.upsert({ where: { email: 'frontdesk@medislot.local' }, update: { passwordHash }, create: { name: 'Front Desk', email: 'frontdesk@medislot.local', passwordHash, role: Role.FRONT_DESK } });
}

main().finally(() => prisma.$disconnect());
