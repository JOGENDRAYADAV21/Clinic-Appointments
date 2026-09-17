# MediSlot

MediSlot is a smart clinic front-desk appointment and scheduling system. It makes doctor double-booking impossible, applies cancellation fees on the backend, and gives reception teams a fast dashboard for today's work.

## Current foundation

- React + TypeScript + Vite frontend dashboard
- Fastify + TypeScript API
- Prisma schema for PostgreSQL 16
- Doctor, patient, appointment, cancellation, user, and clinic settings models
- Backend overlap checks and structured `DOCTOR_DOUBLE_BOOKING` conflicts
- Backend-owned cancellation fee calculation with policy snapshots
- Seed data for four doctors, five patients, appointments, and a front-desk user
- Responsive dashboard, authenticated login, schedule list, patient search, cancellations, reports, and AI assistant
- Unit tests for back-to-back and overlapping appointment behavior

## Run locally

Prerequisites: Node.js 20.19+ (required by current Vite), npm, and Docker Desktop.

```bash
npm install
copy .env.example .env
docker compose up -d
npx prisma migrate deploy
npx prisma db seed
npm run db:generate
npm run dev
```

The web app runs at `http://localhost:5173` and the API runs at `http://localhost:4000`.

The checked-in migration already applies the PostgreSQL exclusion constraint in `prisma/migrations/0001_init/migration.sql`. It uses `btree_gist` and a half-open `tstzrange`, so a 10:00-10:30 appointment can be followed by a 10:30-11:00 appointment but any real overlap is rejected by PostgreSQL itself. `prisma/constraints.sql` is also provided for existing databases created before this migration.

## Verification

```bash
npm test
npm run build
```

## Demo data

The seed script creates `frontdesk@medislot.local` with the `FRONT_DESK` role. Demo password: `medislot-demo`.

## Architecture

```text
React dashboard -> Fastify REST API -> domain validation -> Prisma transaction -> PostgreSQL
                                             ^
                                   AI tools will call these APIs
```

The AI assistant must never generate SQL or access Prisma directly. Appointment creation, availability, authorization, and cancellation rules remain controlled by the API.

## Planned modules

Auth/RBAC, doctor day timeline, patient details, cancellation history, reports, OpenAI Responses API tool calling, Playwright coverage, and production deployment configuration are organized as the next phases from the agreed project plan.
