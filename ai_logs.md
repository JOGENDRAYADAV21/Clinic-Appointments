# AI Development Log

## Purpose

This document records how AI-assisted development was used while building MediSlot. AI tools supported ideation, implementation, debugging, documentation, and test planning. The final code was reviewed and validated locally with the project test and build commands.

## Tools used

## Professionalized prompt record

The following entries summarize the main instructions used during development. They are intentionally rewritten as professional engineering briefs rather than reproduced as raw conversation transcripts.

### Product and architecture brief

> Design and implement MediSlot, a complete clinic appointment management platform for administrators, front-desk staff, doctors, and patients. The system must prevent overlapping appointments for the same doctor, enforce cancellation policies on the backend, support patient search and doctor schedules, and provide a responsive operational dashboard. Use a TypeScript monorepo with React and Vite for the frontend, Fastify for the API, Prisma for data access, and PostgreSQL as the source of truth. Keep the backend modular and ensure that AI capabilities communicate through validated application tools rather than direct database access.

### Scheduling integrity brief

> Treat double-booking prevention as the highest-priority domain requirement. Implement frontend availability feedback, backend validation, transactional appointment creation, and a PostgreSQL exclusion constraint over doctor and appointment time ranges. Permit adjacent appointments while rejecting every actual overlap. Return structured conflict responses that identify the conflicting appointment and provide useful information for the user interface.

### Cancellation and time-policy brief

> Implement a configurable cancellation policy with a free-cancellation window and a late-cancellation fee. Calculate the final fee exclusively on the server, record whether the cancellation was late, and persist a snapshot of the policy used at the time of cancellation. Use timezone-aware date handling and keep historical cancellation records accurate after future settings changes.

### Patient self-service brief

> Add a patient role with secure authentication and a dedicated portal. Patients must be able to view their own appointments, book a doctor and time, reschedule without changing the doctor or patient identity, and cancel an appointment through the same business rules used by staff. Ensure that patient authorization is enforced by the API and that staff screens reflect patient changes without requiring a full reload.

### Lifecycle automation brief

> Implement the scheduling lifecycle extensions. A reschedule request must re-check conflicts before updating the existing appointment. A deterministic clock endpoint must create deduplicated reminder events for the current day and mark scheduled appointments as no-show after thirty minutes. Expose the outbox so an external Notification Service can consume the events without bypassing domain rules.

### Authentication and security brief

> Secure all account workflows with bcrypt password hashes, role-based authorization, unique JWT session identifiers, and twenty-minute token expiry. Limit repeated failed logins with a persistent five-attempt lockout and fifteen-minute cooldown. Provide a development-only password reset token flow while keeping secrets, reset tokens, and API keys out of committed files.

### AI assistant brief

> Add an optional OpenAI Responses API assistant for safe front-desk questions. Define explicit, validated tools for patient lookup, doctor schedules, appointment availability, and cancellation policy queries. The model must never generate SQL, access Prisma directly, invent records, or claim that a write succeeded without a successful backend response. When no API key is configured, provide a deterministic local fallback for supported read-only questions.

### Validation and delivery brief

> Work incrementally and validate each functional slice before expanding scope. Include unit tests for overlap and cancellation boundaries, integration checks for authentication and appointment behavior, Playwright coverage for the main browser workflow, Prisma schema validation, and production builds. Document the architecture, setup process, demo credentials, security assumptions, AI usage, and known production considerations in a GitHub-ready repository.

### GitHub Copilot

GitHub Copilot was used as the primary coding assistant inside VS Code for:

- Turning the clinic scheduling requirements into an implementation plan
- Scaffolding the React, Fastify, Prisma, and PostgreSQL project structure
- Implementing appointment, cancellation, authentication, patient, and automation APIs
- Designing the controlled AI tool boundary
- Creating the patient portal and staff dashboard workflows
- Diagnosing TypeScript, Prisma, Vite, and runtime errors
- Writing unit tests, browser tests, migrations, and README documentation

### Gemini

Gemini was used as a supplementary planning and review assistant for:

- Brainstorming the MediSlot product concept and contest demonstration flow
- Comparing implementation options for the double-booking guarantee
- Reviewing the cancellation policy and patient workflow requirements
- Suggesting documentation structure and presentation details

Gemini was used for analysis and ideation. It did not receive database credentials, production secrets, or direct access to the application database.

### OpenAI Responses API

The application itself includes an optional OpenAI Responses API integration. This is a runtime feature of MediSlot rather than a development-only tool.

The integration provides controlled tools for:

- Finding a patient
- Reading a doctor schedule
- Checking cancellation policy information
- Supporting safe front-desk questions

The model cannot generate SQL or access Prisma directly. The API validates tool inputs and performs the actual data access.

## AI safety and review process

1. AI suggestions were treated as drafts, not as unquestioned truth.
2. Database writes were kept behind explicit backend routes and business rules.
3. Authentication, authorization, conflict checks, and cancellation calculations were implemented server-side.
4. Secrets were kept out of source code and `.env.example`.
5. Changes were checked with TypeScript builds, Prisma validation, Vitest, direct API requests, and Playwright.
6. Runtime errors were reproduced locally before fixes were applied.

## Validation commands

```bash
npx prisma validate
npm test
npm run build
npm run test:e2e
```

## Important note

The AI tools helped accelerate implementation, but the project behavior was verified against the actual PostgreSQL database and running application. The backend and database, not the AI assistant, remain the source of truth.
