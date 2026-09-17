# MediSlot

MediSlot is a smart clinic front-desk appointment and scheduling system. It makes doctor double-booking impossible, applies cancellation fees on the backend, and gives reception teams a fast dashboard for today's work.

## Included features

- React + TypeScript + Vite frontend dashboard
- Fastify + TypeScript API with Prisma and PostgreSQL
- JWT authentication and role-based access for admin, front desk, and doctor users
- Conflict-free appointments enforced by API validation and a PostgreSQL exclusion constraint
- Cancellation fees with historical policy snapshots
- Patient search, doctor day timeline, reports, and clinic settings
- OpenAI Responses API tools with a safe local fallback
- Development forgot-password and one-time reset-token flow
- Password-protected bcrypt credentials, five-attempt lockout, unique JWT sessions, and 20-minute session expiry
- Playwright browser smoke test

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

Set `OPENAI_API_KEY` in `.env` to enable the Responses API assistant. The key remains server-side; the browser only calls `/api/ai/query`.

Click `Forgot password?` on the login screen. In development, the API returns a one-time reset token to the UI so the password can be changed without an email provider. Production deployments should connect this flow to a mail service and never return the token in the response.

The checked-in migration already applies the PostgreSQL exclusion constraint in `prisma/migrations/0001_init/migration.sql`. It uses `btree_gist` and a half-open `tsrange`, so a 10:00-10:30 appointment can be followed by a 10:30-11:00 appointment but any real overlap is rejected by PostgreSQL itself. `prisma/constraints.sql` is also provided for existing databases created before this migration.

## Verification

```bash
npm test
npm run build
npm run test:e2e
```
## Demo data

The seed script creates these demo users, all using password `medislot-demo`:

- `frontdesk@medislot.local` (`FRONT_DESK`)
- `admin@medislot.local` (`ADMIN`)
- `doctor@medislot.local` (`DOCTOR`)
- `rahul@medislot.local` (`PATIENT`)

## Graded twist endpoints

- `POST /api/appointments/:id/reschedule` rechecks the doctor's overlap while preserving the existing patient and doctor.
- `POST /clock` accepts an optional `{ "now": "ISO timestamp" }`, creates today's `APPOINTMENT_REMINDER` outbox events, and marks scheduled appointments as `NO_SHOW` 30 minutes after start.
- `GET /outbox` exposes the durable notification events for the Notification Service grader.

Patient accounts use the same login screen and can book, view, reschedule, and cancel their own appointments. The front-desk dashboard polls appointment data every 15 seconds so patient and staff changes appear live.

## Architecture

```text
React dashboard -> Fastify REST API -> domain validation -> Prisma transaction -> PostgreSQL
                                             ^
                                   AI tools will call these APIs
```

The AI assistant must never generate SQL or access Prisma directly. Appointment creation, availability, authorization, and cancellation rules remain controlled by the API.

