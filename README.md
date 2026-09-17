# MediSlot

MediSlot is a clinic appointment management system for front desks, doctors, patients, and administrators. Its central guarantee is that a doctor cannot be double-booked, even when requests overlap or arrive concurrently.

## Why MediSlot

Busy clinics need more than a booking form. MediSlot brings scheduling, patient search, cancellation policy enforcement, doctor workflows, patient self-service, reminders, no-show automation, and a controlled AI assistant into one application.

The project was built around three priorities:

1. **Correct scheduling:** overlapping appointments are rejected by the API and PostgreSQL.
2. **Reliable business rules:** cancellation fees and no-show decisions are calculated by the backend.
3. **Fast workflows:** reception staff can search patients, inspect schedules, book visits, and update appointment status without leaving the workspace.

## Features

- Role-based login for `ADMIN`, `FRONT_DESK`, `DOCTOR`, and `PATIENT`
- Patient portal for booking, viewing, rescheduling, and cancelling appointments
- Front-desk dashboard with patient search and live appointment refresh
- Doctor day timeline and appointment status management
- Conflict-safe booking and rescheduling
- PostgreSQL exclusion constraint for database-level overlap protection
- Configurable free-cancellation window and late-cancellation fee
- Cancellation policy snapshots for historical accuracy
- Automatic 30-minute no-show processing through `POST /clock`
- Morning reminder events through the durable outbox
- Reports, clinic settings, and cancellation history
- Password hashing with bcrypt
- Five-failure login lockout with a 15-minute cooldown
- Unique JWT session IDs with 20-minute expiry
- Development forgot-password and one-time reset-token flow
- Optional OpenAI Responses API assistant with validated backend tools
- Safe local AI fallback when no OpenAI key is configured
- Playwright browser smoke test

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Lucide React |
| Backend | Node.js, TypeScript, Fastify, Zod |
| Database | PostgreSQL 16, Prisma ORM |
| Authentication | bcryptjs, JWT |
| AI | OpenAI Responses API with controlled tools |
| Testing | Vitest, Playwright |
| Local infrastructure | Docker Compose |

## Architecture

```text
Patient / Front Desk / Doctor / Admin
                 |
          React + TypeScript
                 |
          Fastify REST API
                 |
      Validation + authorization
                 |
       Domain transaction layer
                 |
       Prisma + PostgreSQL 16
```

The AI assistant follows the same boundary:

```text
User message -> OpenAI Responses API -> validated tool -> backend service -> PostgreSQL
```

The AI never generates SQL and never receives direct database access. The backend remains the source of truth for authorization, availability, cancellation fees, and appointment status.

## Project structure

```text
apps/
  api/
    src/
      server.ts       REST routes and authentication
      ai-service.ts   OpenAI Responses API integration
      ai-tools.ts     validated read-only AI tools
  web/
    src/
      AppComplete.tsx     authenticated staff application
      OperationalViews.tsx booking, calendar, and settings views
      PatientPortal.tsx   patient self-service portal
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/e2e/
  clinic.spec.ts
```

## Run locally

### Prerequisites

- Node.js 20.19+ recommended
- npm
- Docker Desktop with the Linux engine enabled

### Installation

```bash
npm install
copy .env.example .env
docker compose up -d
npx prisma migrate deploy
npm run db:generate
npm run db:seed
npm run dev
```

The web application runs at [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:4000](http://localhost:4000).

The API health check is available at:

```text
GET http://localhost:4000/health
```

## Demo accounts

All seeded demo accounts use the password `medislot-demo`.

| Role | Email |
| --- | --- |
| Admin | `admin@medislot.local` |
| Front desk | `frontdesk@medislot.local` |
| Doctor | `doctor@medislot.local` |
| Patient | `rahul@medislot.local` |

## Double-booking protection

The application uses defense in depth:

1. The frontend can check availability before submission.
2. The API validates the requested time range and checks conflicts inside a transaction.
3. PostgreSQL enforces a GiST exclusion constraint using a half-open `tsrange`.

This allows back-to-back visits such as `10:00-10:30` and `10:30-11:00`, while rejecting any real overlap. The database constraint is defined in `prisma/migrations/0001_init/migration.sql`.

## Cancellation policy

The default policy is:

- Free cancellation up to 120 minutes before the appointment
- Late cancellation fee of ₹200 after the cutoff

The fee is calculated only by the backend. Each cancellation stores a policy snapshot so historical records remain correct if the clinic changes its settings later.

## Graded twists

### T6: Rescheduling

```text
POST /api/appointments/:id/reschedule
```

The endpoint rechecks overlap at the new time and preserves the original doctor and patient.

### T1: Morning reminders

```text
POST /clock
GET  /outbox
```

`POST /clock` accepts an optional ISO timestamp. It creates deduplicated `APPOINTMENT_REMINDER` events for that day. The outbox is the integration point for a Notification Service.

### T2: Automatic no-show

The same `POST /clock` job marks scheduled appointments as `NO_SHOW` when they are at least 30 minutes past their start time. It also writes an `APPOINTMENT_NO_SHOW` outbox event.

## Patient self-service

Patients sign in through the same login screen and receive a dedicated portal. They can:

- Book an appointment with an active doctor
- View upcoming and historical appointments
- Reschedule their own scheduled appointment
- Cancel their own appointment
- See the cancellation result and applicable fee

Staff appointment data refreshes every 15 seconds so patient changes appear without a manual page refresh.

## API overview

| Area | Endpoints |
| --- | --- |
| Auth | `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password` |
| Doctors | `/api/doctors` |
| Patients | `/api/patients/search`, `/api/patients/:id/appointments` |
| Appointments | `/api/appointments`, `/api/appointments/availability` |
| Scheduling | `/api/appointments/:id/reschedule`, `/api/appointments/:id/status` |
| Cancellation | `/api/appointments/:id/cancel`, `/api/cancellations` |
| Automation | `/clock`, `/outbox` |
| Reporting | `/api/dashboard`, `/api/reports` |
| AI | `/api/ai/tools`, `/api/ai/query` |
| Settings | `/api/settings` |

## AI assistant

Set `OPENAI_API_KEY` in `.env` to enable the OpenAI Responses API integration. The key is server-side only and is never sent to the React application.

Available controlled tools include patient lookup, doctor schedules, cancellation policy lookup, and appointment-related availability queries. Without a key, the application uses a deterministic local fallback for the supported questions.

See [ai_logs.md](ai_logs.md) for the development AI-tool record and [reasoning.md](reasoning.md) for the problem-solving approach.

## Testing

```bash
npm test
npm run build
npm run test:e2e
```

The tests cover overlap behavior, cancellation policy boundaries, AI tool input validation, and the primary browser navigation flow.

## Security notes

- Never commit `.env`, API keys, database passwords, or reset tokens.
- Use a strong `JWT_SECRET` outside local development.
- The development reset flow returns a reset token only when `NODE_ENV` is not `production`.
- Configure an email provider before enabling password recovery in production.
- Rotate any credential that has been exposed in a terminal, screenshot, or repository.

## Documentation

- [ai_logs.md](ai_logs.md): AI tools and development assistance record
- [reasoning.md](reasoning.md): problem analysis, design decisions, and solution strategy
