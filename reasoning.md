# Problem-Solving Reasoning

## 1. Problem statement

A busy clinic needs to schedule multiple doctors and patients without double-booking. The system must also support cancellation fees, patient lookup, doctor schedules, front-desk operations, and automation around reminders and no-shows.

The difficult part is not displaying a calendar. The difficult part is preserving correct business behavior when requests overlap, users have different permissions, time passes, and patients or staff update the same appointment.

## 2. Core design decision: the database is the final authority

A frontend-only availability check is not sufficient:

```text
Request A checks 10:00 -> available
Request B checks 10:00 -> available
Request A books
Request B books
```

To prevent this race condition, MediSlot uses three layers:

1. The frontend checks availability for immediate feedback.
2. The backend validates the request and checks conflicts inside a transaction.
3. PostgreSQL applies an exclusion constraint over doctor ID and appointment time range.

The PostgreSQL constraint uses a half-open range. Therefore:

```text
10:00-10:30 + 10:30-11:00 -> allowed
10:00-10:30 + 10:15-10:45 -> rejected
```

This makes the most important business rule independent of the browser and AI assistant.

## 3. Cancellation reasoning

Cancellation fees must not be accepted from the frontend because a user could modify the request. The backend calculates:

```text
cutoff = appointment_start - free_cancellation_window
late = cancellation_time > cutoff
fee = late ? configured_fee : 0
```

The cancellation record stores a policy snapshot. This prevents a later settings change from rewriting the meaning of historical cancellations.

## 4. Roles and authorization

The system has four roles:

- `ADMIN`: manages settings, reports, doctors, and broad clinic operations
- `FRONT_DESK`: manages patients, bookings, cancellations, and schedules
- `DOCTOR`: views schedules and updates appointment outcomes
- `PATIENT`: manages only their own appointments

The frontend hides or shows workflows for usability, but every sensitive operation is checked again by the API. A patient cannot create an appointment for another patient, cancel another patient's appointment, or access staff-only management actions.

## 5. Rescheduling: T6

Rescheduling keeps the same appointment, patient, and doctor. Only the time range changes.

The endpoint loads the existing appointment, verifies ownership or staff authorization, checks the new range against other appointments for the same doctor, and updates the appointment inside a transaction. A conflict returns a structured `DOCTOR_DOUBLE_BOOKING` response instead of silently moving the appointment.

## 6. Time automation: T1 and T2

The `/clock` endpoint makes time-based behavior deterministic for grading and testing. It accepts an optional timestamp rather than relying only on the machine clock.

For each scheduled appointment on the simulated day:

- An idempotent `APPOINTMENT_REMINDER` event is written to the outbox.
- If the appointment started at least 30 minutes earlier, it is changed to `NO_SHOW`.
- A deduplicated `APPOINTMENT_NO_SHOW` event is written.

The outbox is deliberately separate from notification delivery. A future Notification Service can consume the events without giving that service direct access to appointment business rules.

## 7. Patient self-service

Patients use the same authentication system as staff but receive a different portal. The portal calls patient-scoped endpoints, allowing a patient to:

- Choose a doctor and time
- Book a visit
- View their own appointments
- Reschedule their own scheduled visit
- Cancel their own visit

The staff application polls appointment data periodically so a patient action becomes visible to the front desk without requiring a full page reload.

## 8. Authentication and session security

Passwords are stored as bcrypt hashes. Login attempts are tracked by email. Five failed attempts result in a 15-minute lockout. A successful login clears the failure record.

Each JWT contains:

- User identity
- Role
- Optional patient profile ID
- A unique `jti`
- A 20-minute expiration

The browser also monitors the token expiration and clears the local session when it expires.

## 9. AI boundary

The AI assistant is an interface for controlled application capabilities, not a replacement for the backend. The safe flow is:

```text
User -> model -> validated tool -> backend service -> database
```

The model can ask to find a patient or inspect a schedule. It cannot invent a booking, generate SQL, bypass authorization, or claim a write succeeded without a backend success response.

## 10. Debugging approach

When a workflow failed, the request was reproduced outside the browser with the same method, URL, headers, and JSON body. This separated frontend problems from API and database problems.

Examples of issues found and fixed:

- Runtime `.env` loading from the wrong workspace directory
- PostgreSQL range type mismatch in the exclusion constraint
- Repeated seed data causing overlap conflicts
- Zod `.omit()` failing on a refined schema
- Expired placeholder tokens breaking browser tests
- Patient booking UI not preloading a selectable patient

## 11. Verification strategy

The project is validated at multiple levels:

- Unit tests for overlap boundaries and cancellation cutoff behavior
- AI tool input validation tests
- Prisma schema validation
- TypeScript compilation and production builds
- Direct API checks for login, patient booking, rescheduling, `/clock`, and `/outbox`
- Playwright smoke tests for authenticated browser navigation

This layered approach is intended to prove both the visible workflow and the underlying business guarantees.

## 12. Trade-offs and future work

The project prioritizes correctness and demonstrability over unnecessary infrastructure. The outbox is present and inspectable, while a production deployment would add a separate notification worker. The development password-reset response exposes a token only outside production; a deployed system should connect it to an email provider.

The architecture leaves room for stronger audit logs, refresh-token rotation, rate limiting by IP and account, richer calendar drag-and-drop interactions, and a full asynchronous notification service without changing the central appointment rules.
