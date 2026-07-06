# BID Hub Backend Memory

This file is the persistent backend engineering memory for BID Hub. Read it before designing, implementing, reviewing, or refactoring backend code.

## Backend North Star

Build a backend that is boring in the best way: explicit boundaries, predictable data access, strong validation, reliable jobs, clear authorization, and no hidden business rules inside UI components.

The backend should support the product for years, not just make the current screens work.

## Chosen Stack

- App runtime: Next.js App Router route handlers.
- Database: Supabase Postgres.
- Auth: Supabase Auth.
- Authorization: application roles plus Postgres RLS where it protects direct data access.
- ORM/query layer: Drizzle ORM.
- Validation: Zod.
- Frontend data fetching: TanStack Query.
- File storage: Supabase Storage.
- Background jobs: Trigger.dev.
- Video platform: Mux Video.
- Video player: `@mux/mux-player-react`.
- Email: Resend unless the project later requires a different provider.

Do not introduce a separate backend framework, NestJS, Express server, or microservice until there is a clear operational reason. Start modular inside Next.js.

## Standing Backend Rules

- Keep backend concerns out of React components.
- Every mutation must have server-side validation.
- Every route handler must call a service; route handlers should not contain business logic.
- Services own business rules and transactions.
- Repositories own database access.
- UI schemas and server schemas may share types, but server validation is always authoritative.
- Never trust client-provided role, user ID, programme ID, or ownership fields.
- Prefer explicit authorization checks in services, even when RLS also exists.
- Use transactions for multi-step writes.
- Make write operations idempotent where retries or background jobs can happen.
- Keep audit trails for important admin actions.
- Do not delete business records casually. Prefer soft delete or status transitions for important records.
- Design every list endpoint for search, filters, sorting, pagination, and future backend-backed tables.
- Use cursor pagination for large or growing datasets. Offset pagination is acceptable only for small lookup data.
- Use stable identifiers. Do not expose sequential assumptions to the UI.
- Store files in object storage, not the database.
- Store only file metadata, storage keys, playback IDs, and processing state in Postgres.
- Never put service role keys in client code.
- Never expose private storage URLs without signed access rules.
- Do not put long-running work in route handlers. Trigger a background job and return a status.
- All backend code should be testable without rendering UI.

## Folder Rules

Use this target structure when backend work begins:

```text
lib/server/
  auth/
  db/
  repositories/
  services/
  validators/
  jobs/
  storage/
  video/
  email/
  errors/
  audit/

app/api/
  ...

drizzle/
  schema.ts
  migrations/
```

Route handlers in `app/api` should be thin adapters:

1. Read request input.
2. Get authenticated actor.
3. Validate input.
4. Call a service.
5. Return a typed response.

## Core Domain Boundaries

Keep these areas separate:

- Identity and access: users, profiles, roles, invitations, route access.
- Entrepreneur workspace: profile, funding history, updates, deliverables, tool requests, sessions.
- Programme operations: programmes, enrolments, stages, sectors, assignments.
- Learning content: modules, content items, programme module order, video assets, resources.
- Deliverable workflow: required deliverables, submissions, reviews, reviewer decisions.
- Trainer workflow: trainer profiles, availability, assignments, sessions.
- Reporting: report snapshots and exports.
- Notifications and jobs: email, reminders, long-running processing.
- Audit and compliance: important admin actions and security-sensitive events.

## Authorization Model

Use a `profiles` table linked to Supabase Auth users.

Roles:

- `entrepreneur`
- `admin`
- `trainer`

Do not assume only one admin level forever. Model role and capability checks in a way that can grow into permissions later.

Initial access rules:

- Entrepreneurs can read and update only their own business profile and submitted data.
- Entrepreneurs can read programmes they are enrolled in.
- Entrepreneurs can read published training content assigned to their programmes.
- Entrepreneurs can submit deliverables for their own account.
- Trainers can read assigned entrepreneurs, assigned programmes, and sessions.
- Admins can manage operational data across the platform.

## Data Modeling Rules

- Use relational tables for core business entities.
- Use join tables for many-to-many relationships.
- Use enum-like status fields deliberately and document transitions.
- Keep `created_at`, `updated_at`, and relevant actor fields on important tables.
- Add indexes for foreign keys, search filters, status filters, and dashboard counts.
- Avoid storing derived dashboard totals as primary truth unless they are snapshots.
- For analytics/reporting, start with views or query services before introducing a warehouse.

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

Use Trigger.dev for:

- emails and notifications
- scheduled reminders
- report generation
- file processing
- calendar sync
- video webhook processing if needed
- long-running exports
- future AI summarization or analysis

Jobs must be idempotent. Store job records or idempotency keys when a job can be triggered more than once.

Route handlers should enqueue jobs and return a job/run status reference instead of doing long-running work inline.

## Video Rules

Use Mux for training video upload, encoding, playback, thumbnails, and analytics.

Supabase Storage remains for:

- PDFs
- deliverable uploads
- images
- downloadable tool files

Do not build custom video transcoding unless the business explicitly chooses to own video infrastructure later.

## Security Rules

- Enable RLS on exposed Supabase tables.
- Keep service-role access server-only.
- Validate file type, size, and ownership before accepting uploads.
- Use signed URLs for private files.
- Log sensitive admin actions.
- Use rate limits for auth, uploads, public-ish endpoints, and expensive actions.
- Keep secrets in environment variables only.
- Do not log tokens, passwords, signed URLs, service keys, or raw uploaded file contents.

## Testing Rules

Backend work should include tests based on risk:

- Unit test services with business rules.
- Test repository queries when joins, filters, or permissions are non-trivial.
- Test route handlers for auth, validation, and response shape.
- Test job handlers for idempotency and retry safety.
- Test RLS policies or authorization behavior before shipping real auth.

## Backend Build Sequence

Build backend in this order:

1. Environment and package setup.
2. Database schema and migrations.
3. Auth session helpers and profile/role model.
4. Shared server error and response helpers.
5. Repositories and services for read-only data.
6. Replace mock reads with TanStack Query API reads.
7. Mutations for core admin and entrepreneur workflows.
8. File storage and deliverable uploads.
9. Trigger.dev jobs and email notifications.
10. Mux video ingestion and playback metadata.
11. Reporting jobs.
12. Auditing, hardening, tests, and production readiness.

## Review Checklist

Before merging backend work, ask:

- Is the route handler thin?
- Is input validated on the server?
- Is authorization explicit?
- Is the data access in a repository?
- Is business logic in a service?
- Are multi-step writes transactional?
- Is the operation idempotent if it can be retried?
- Are errors structured?
- Are files/videos handled outside Postgres?
- Are list endpoints scalable?
- Are tests proportional to risk?
- Would this still make sense when BID has thousands of entrepreneurs and hundreds of programmes?
