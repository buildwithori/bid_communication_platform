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
- Runtime setup: Docker and Docker Compose, with separate local and production Compose configurations.
- Compose services: Next.js frontend, NestJS API, PostgreSQL, Redis, Mailpit for development email catching, and supporting local tooling.
- File storage: DigitalOcean Spaces for PDFs, deliverables, images, downloadable tool files, and report exports.
- Background jobs: BullMQ with Redis.
- Video platform: Mux Video.
- Video player: `@mux/mux-player-react`.
- Email: Resend for delivery, React Email for templates/components, and Mailpit as the local development email catcher.
- Calendar provider: Google Calendar first, but keep session fields provider-agnostic.

NestJS is now the backend direction. Do not design new backend work around Next.js route handlers.

Repository shape is a required monorepo:

- `apps/web` for the Next.js frontend.
- `apps/api` for the NestJS backend.
- `packages/shared` for stable shared contracts/types/utilities.
- root `prisma` for schema and migrations.

Do not create a separate root-level `backend/` app.

Frontend and backend should run as separate Docker Compose services. The frontend should call the API service through environment-configured URLs, not hardcoded localhost assumptions.

Maintain both local and production Docker setup:

- Local: `docker-compose.yml` for development, source mounts, hot reload, Postgres, Redis, Mailpit, and developer-friendly defaults.
- Production: `docker-compose.prod.yml` or a production override for built images, no source mounts, production commands, restart policies, health checks, and production environment variables.

Email templates should be built as a reusable BID email brand system with React Email. Even if final email designs are not provided, the backend implementation should define consistent branded layouts, typography, footer/legal text, CTA buttons, and reusable templates for auth, invitations, sessions, deliverables, tools, and reporting.

## Standing Backend Rules

- Keep backend concerns out of React components.
- Every mutation must have server-side validation.
- Before creating Prisma models or NestJS DTOs for a feature, reconcile them against the current UI form schemas and modals. Every UI field must be persisted, derived, request-only, or intentionally removed from the UI.
- Controllers stay thin: parse request context, call services, return DTOs.
- Services own business rules and transactions.
- Repositories/data-access classes own database access when queries grow beyond simple Prisma calls.
- Never trust client-provided role, user ID, programme ID, trainer ID, or ownership fields.
- Prefer explicit authorization checks in services/policies.
- Use transactions for multi-step writes.
- Make write operations idempotent where retries or background jobs can happen.
- Keep audit trails for important admin actions, but do not manually create audit rows inside every feature. Business lifecycle helpers should emit audit/domain events inside the same transaction, and a background processor should turn those events into immutable audit logs.
- Treat notifications as a full product system. Create a durable notification record once, track per-channel delivery status, respect company/user preferences, and process in-app/email fanout through background jobs instead of scattering ad hoc notification writes across services.
- Do not delete business records casually. Prefer soft delete or status transitions for important records.
- Design every list endpoint for search, filters, sorting, pagination, and future backend-backed tables.
- Use cursor pagination for large or growing datasets. Offset pagination is acceptable only for small lookup data.
- Use stable identifiers. Do not expose sequential assumptions to the UI.
- Store files in DigitalOcean Spaces, not the database.
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

- Identity and access: users, single active role, invitations, route access.
- Entrepreneur workspace: profile, funding history, periodic updates, deliverables, tool requests, sessions.
- Admin team: admins, invitations, calendar connection, operational notifications.
- Programme operations: programmes, lifecycle, modules, access grants, archival.
- Learning content: modules, content items, trainers attached to content, ratings, programme module order.
- Deliverable workflow: required deliverables, due rules, submissions, reviews, reviewer decisions.
- Trainer workflow: trainer capabilities, content ownership, calendar connection, sessions, deliverable reviews.
- Sessions: booking requests, ownership, Google Meet links, reschedule history, completion.
- Tools: tool catalogue, global/programme/entrepreneur access, tool requests, admin decisions.
- Reporting: impact updates, fundraising attribution, overdue update rules, exports.
- Notifications and jobs: email, reminders, long-running processing.
- Audit and compliance: important admin actions and security-sensitive events.

## Audit Logging Rules

- Audit logging should be infrastructure-supported, not manually reimplemented in every service.
- Business actions should go through lifecycle/action helpers such as `ProgrammeLifecycleService.archive`, `SessionWorkflowService.acceptRequest`, or `DeliverableReviewService.reviewSubmission`.
- Those helpers should emit structured audit events as part of the same database transaction as the business change.
- Persist audit events to an `audit_outbox` table first, then process them asynchronously into immutable `audit_logs`.
- Use a Prisma extension or repository-level hook as a safety net for selected sensitive model updates, but do not rely on raw database diffs alone for business meaning.
- Audit entries should include actor, action, entity type, entity ID, correlation/request ID, before/after summaries, and business metadata.
- Feature code should never hand-write audit rows directly unless it is inside the shared audit infrastructure.

## Authorization Model

Roles:

- `entrepreneur`
- `admin`
- `trainer`

Each user has exactly one active role at a time. Do not model multi-role users for launch.

Do not create separate `admin_profiles`, `trainer_profiles`, and `entrepreneur_profiles` tables. Shared identity/profile fields belong on `users`. Role-specific business data belongs in real domain tables, for example `businesses`, `business_memberships`, `trainer_specialisms`, `calendar_connections`, content ownership tables, and future permission/capability tables.

Role change is not supported for launch. If someone needs a different role, create/invite them through the correct role flow instead of mutating `users.role`.

Do not assume only one admin level forever. Model admin capabilities in a way that can grow into permissions later without turning users into multi-role accounts.

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
- Programme access grants are per entrepreneur user, not per business. Business-level programme context is derived through the entrepreneur users attached to the business.
- Free resources are globally available and should not be stored as per-entrepreneur assignments.
- Regular email entrepreneur signup collects the required signup baseline and does not require onboarding. Google entrepreneur signup uses `/auth/onboarding` only when provider data is missing required baseline details. Google onboarding should collect or confirm business name, representative name, email, country, and phone, with provider name/email prefilled when available.
- Admin-managed lookup data such as sectors, business stages, programme goal types, and tool areas must be backend models because they power autocomplete filters and form options across roles.
- Programme lifecycle is derived from dates and archive fields: draft, scheduled, active, completed, archived. Completed is derived from `end_date`; do not add manual programme completion fields.
- Programme create/edit must persist the current UI fields, including `max_entrepreneurs`. UI `publishState` maps to the initial publish action, not to publish/unpublish workflow fields or a loose status column.
- Archived programmes are hidden from default operational lists and become read-only unless restored.
- Deliverable due dates come from programme deliverable rules, then become concrete `deliverable_instances.due_date` values per entrepreneur/programme submission context. Review queues must read due dates from instances, not invent them.
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

1. Move/organize the repo into `apps/web`, `apps/api`, `packages/shared`, and root `prisma`.
2. Docker/Compose setup for frontend, API, Postgres, and Redis.
3. NestJS workspace and environment setup.
4. Database schema, Prisma migrations, and seed strategy.
5. Auth, users, single-role model, invitations.
6. Shared errors, response DTOs, guards, decorators, policies, request context, and audit outbox foundation.
7. Read APIs for lookup data, programmes, entrepreneurs, trainers, and content.
8. Replace mock reads with TanStack Query API reads.
9. Mutations for core admin, entrepreneur, and trainer workflows with automatic lifecycle audit events.
10. DigitalOcean Spaces file storage and deliverable uploads.
11. BullMQ jobs, email notifications, notification records, and audit outbox processors.
12. Google Calendar OAuth, availability, and Google Meet session creation.
13. Mux video ingestion, webhooks, and playback metadata.
14. Reporting queries, exports, auditing hardening, tests, and production readiness.

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
- Does the DTO/model match the actual UI form fields, with derived/request-only fields explicitly called out?
- Are tests proportional to risk?
- Would this still make sense when BID has thousands of entrepreneurs and hundreds of programmes?
