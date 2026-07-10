# BID Hub Backend Memory

This file is the persistent backend engineering memory for BID Hub. Read it before designing, implementing, reviewing, or refactoring backend code.

## Backend North Star

Build a backend that is boring in the best way: explicit boundaries, predictable data access, strong validation, reliable jobs, clear authorization, and no hidden business rules inside UI components.

The backend should support the product for years, not just make the current screens work.

## Chosen Stack

- Backend runtime: NestJS with TypeScript.
- API style: REST-first, OpenAPI documented. GraphQL is not needed for the first backend.
- Database: PostgreSQL.
- ORM/query layer: Prisma, unless we later hit a strong reason to use TypeORM or Drizzle.
- Auth: JWT/session-backed auth owned by the NestJS backend, with support for Google signup/login for entrepreneurs.
- Passwords: hash with Argon2.
- Frontend data fetching: TanStack Query.
- File storage: S3-compatible object storage for PDFs, deliverables, images, and downloadable tool files.
- Background jobs: BullMQ with Redis.
- Video platform: Mux Video.
- Video player: `@mux/mux-player-react`.
- Email: Resend unless the project later requires a different provider.
- Calendar provider: Google Calendar first, but keep session fields provider-agnostic.

NestJS is now the backend direction. Do not design new backend work around Next.js route handlers.

## Standing Backend Rules

- Keep backend concerns out of React components.
- Every mutation must have server-side validation.
- Controllers stay thin: parse request context, call services, return DTOs.
- Services own business rules and transactions.
- Repositories/data-access classes own database access when queries grow beyond simple Prisma calls.
- Never trust client-provided role, user ID, programme ID, trainer ID, or ownership fields.
- Prefer explicit authorization checks in services/policies.
- Use transactions for multi-step writes.
- Make write operations idempotent where retries or background jobs can happen.
- Keep audit trails for important admin actions.
- Do not delete business records casually. Prefer soft delete or status transitions for important records.
- Design every list endpoint for search, filters, sorting, pagination, and future backend-backed tables.
- Use cursor pagination for large or growing datasets. Offset pagination is acceptable only for small lookup data.
- Use stable identifiers. Do not expose sequential assumptions to the UI.
- Store files in object storage, not the database.
- Store only file metadata, storage keys, Mux asset IDs/playback IDs, and processing state in Postgres.
- Never put secrets in client code.
- Never expose private storage URLs without signed access rules.
- Do not put long-running work in controllers. Enqueue a job and return a status.
- All backend code should be testable without rendering UI.

## NestJS Module Rules

Use feature modules that match business boundaries:

```text
apps/api/src/
  main.ts
  app.module.ts
  config/
  common/
  database/
  auth/
  users/
  entrepreneurs/
  admins/
  trainers/
  programmes/
  learning-content/
  deliverables/
  sessions/
  tools/
  reporting/
  notifications/
  files/
  video/
  calendar/
  audit/
  jobs/
```

Each feature should prefer this internal shape:

```text
feature/
  feature.module.ts
  feature.controller.ts
  feature.service.ts
  dto/
  entities-or-types/
  policies/
  repositories/
  jobs/
```

Controllers should not contain business logic. DTOs validate input. Services coordinate business rules. Policies answer authorization questions. Repositories hold non-trivial query composition.

## Core Domain Boundaries

Keep these areas separate:

- Identity and access: users, profiles, roles, invitations, route access.
- Entrepreneur workspace: profile, funding history, periodic updates, deliverables, tool requests, sessions.
- Admin team: admins, invitations, calendar connection, operational notifications.
- Programme operations: programmes, lifecycle, modules, access grants, archival.
- Learning content: modules, content items, trainers attached to content, ratings, programme module order.
- Deliverable workflow: required deliverables, due rules, submissions, reviews, reviewer decisions.
- Trainer workflow: trainer profiles, content ownership, calendar connection, sessions, deliverable reviews.
- Sessions: booking requests, ownership, Google Meet links, reschedule history, completion.
- Tools: tool catalogue, global/programme/entrepreneur access, tool requests, admin decisions.
- Reporting: impact updates, fundraising attribution, overdue update rules, exports.
- Notifications and jobs: email, reminders, long-running processing.
- Audit and compliance: important admin actions and security-sensitive events.

## Authorization Model

Roles:

- `entrepreneur`
- `admin`
- `trainer`

Do not assume only one admin level forever. Model roles and capabilities in a way that can grow into permissions later.

Initial access rules:

- Entrepreneurs can read and update only their own business profile and submitted data.
- Entrepreneurs automatically get free resource access after signup.
- Entrepreneurs can read programmes/content they have access to through programme content access.
- Entrepreneurs can submit deliverables for their own business.
- Trainers can read entrepreneurs inferred from the programme content they own.
- Trainers can review deliverables attached to programmes/content in their trainer scope.
- Trainers are not directly assigned to entrepreneurs.
- Admins can manage operational data across the platform.

## Critical Business Rules

- Trainer scope is inferred from content ownership, not direct entrepreneur assignment.
- Content ratings roll up to the trainer attached to that content item.
- Programme access is many-to-many. An entrepreneur can have zero, one, or many programme access grants, plus automatic free resources.
- Free resources are globally available and should not be stored as per-entrepreneur assignments.
- Programme lifecycle is derived from dates and archive fields: draft, scheduled, active, completed, archived.
- Archived programmes are hidden from default operational lists and become read-only unless restored.
- Deliverable due dates come from programme deliverable rules, then become concrete due dates per entrepreneur/programme submission context.
- Periodic update overdue status comes from company configuration, not a manually maintained list.
- Impact reporting needs attribution: jobs/funds should only be charted by programme when the source record is programme-scoped or explicitly attributed.
- Sessions can be specific-person requests or open BID team requests. The first eligible admin/trainer who accepts an open request owns it.
- Only users with supported calendar connection can accept/own Google Meet session requests.
- Confirmed virtual sessions must have a provider-agnostic meeting link field.

## Data Modeling Rules

- Use relational tables for core business entities.
- Use join tables for many-to-many relationships.
- Use enum-like status fields deliberately and document transitions.
- Keep `createdAt`, `updatedAt`, and relevant actor fields on important tables.
- Add indexes for foreign keys, search filters, status filters, and dashboard counts.
- Avoid storing derived dashboard totals as primary truth unless they are snapshots.
- For analytics/reporting, start with query services/materialized views before introducing a warehouse.

## API Rules

- Prefer resource-oriented endpoints.
- Use `GET` for reads, `POST` for create/actions, `PATCH` for updates, `DELETE` only when deletion is truly allowed.
- Do not leak database rows directly. Return API DTOs.
- Response shapes should include pagination metadata for lists.
- Errors should be structured and safe to show in UI.
- Use consistent status codes:
  - `400` validation error.
  - `401` unauthenticated.
  - `403` unauthorized.
  - `404` not found or not accessible.
  - `409` conflict.
  - `422` business rule violation when validation passes but the operation is not allowed.
  - `500` unexpected server failure.

## Background Job Rules

Use BullMQ/Redis for:

- emails and notifications
- scheduled reminders
- report generation
- file processing
- Google Calendar sync
- Mux webhook processing
- long-running exports
- future AI summarization or analysis

Jobs must be idempotent. Store job records or idempotency keys when a job can be triggered more than once.

Controllers should enqueue jobs and return a job/status reference instead of doing long-running work inline.

## Video Rules

Use Mux for training video upload, encoding, playback, thumbnails, and analytics.

Object storage remains for:

- PDFs
- deliverable uploads
- images
- downloadable tool files

Do not build custom video transcoding unless the business explicitly chooses to own video infrastructure later.

## Security Rules

- Hash passwords with Argon2.
- Keep JWT/session secrets, OAuth secrets, storage keys, Mux secrets, and email keys server-only.
- Validate file type, size, and ownership before accepting uploads.
- Use signed URLs for private files.
- Log sensitive admin actions.
- Use rate limits for auth, uploads, public-ish endpoints, and expensive actions.
- Keep secrets in environment variables only.
- Do not log tokens, passwords, signed URLs, service keys, or raw uploaded file contents.

## Testing Rules

Backend work should include tests based on risk:

- Unit test services with business rules.
- Test repositories when joins, filters, or permissions are non-trivial.
- Test controllers for auth, validation, and response shape.
- Test job processors for idempotency and retry safety.
- Test authorization behavior before shipping real auth.

## Backend Build Sequence

Build backend in this order:

1. NestJS workspace and environment setup.
2. Database schema, Prisma migrations, and seed strategy.
3. Auth, users, profiles, roles, invitations.
4. Shared errors, response DTOs, guards, decorators, and policies.
5. Read APIs for lookup data, programmes, entrepreneurs, trainers, and content.
6. Replace mock reads with TanStack Query API reads.
7. Mutations for core admin, entrepreneur, and trainer workflows.
8. File storage and deliverable uploads.
9. BullMQ jobs, email notifications, and notification records.
10. Google Calendar OAuth, availability, and Google Meet session creation.
11. Mux video ingestion, webhooks, and playback metadata.
12. Reporting queries, exports, auditing, hardening, tests, and production readiness.

## Review Checklist

Before merging backend work, ask:

- Is the controller thin?
- Is input validated on the server?
- Is authorization explicit?
- Is business logic in a service?
- Are multi-step writes transactional?
- Is the operation idempotent if it can be retried?
- Are errors structured?
- Are files/videos handled outside Postgres?
- Are list endpoints scalable?
- Are tests proportional to risk?
- Would this still make sense when BID has thousands of entrepreneurs and hundreds of programmes?
