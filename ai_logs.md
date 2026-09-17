# AI Development Log

## Purpose

This document records how AI-assisted development was used while building MediSlot. AI tools supported ideation, implementation, debugging, documentation, and test planning. The final code was reviewed and validated locally with the project test and build commands.

## Tools used

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
