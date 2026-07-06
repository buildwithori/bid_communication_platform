# BID Hub Backend Design Document

Last updated: 2026-07-01

Status: Draft for collaboration

Owner: BID Hub engineering

Related memory files:

- `PROJECT_MEMORY.md`
- `BACKEND_MEMORY.md`

## 1. Purpose

This document defines the backend architecture for BID Hub. It is intended to be collaborative and durable: we should update it as product decisions become clearer, but it should keep the backend work aligned around clean boundaries, reliable workflows, and scalable data design.

The current application is UI-first. The next major phase is to replace mock data and in-memory stores with real authentication, persistence, file storage, jobs, video streaming, and operational APIs.

## 2. Product Context

BID Hub supports entrepreneur development programmes. It has two primary workspaces:

- Entrepreneur workspace: learning, deliverables, profile, funding updates, sessions, tools.
- Admin workspace: programme operations, entrepreneurs, trainers, content, deliverable reviews, reporting, sessions, and tool requests.

The backend must support:

- role-based access
- growing programme and content libraries
- file uploads
- video training content
- deliverable submission and review
- session scheduling workflows
- report generation
- notifications and reminders
- auditability of important admin decisions

## 3. Chosen Stack

### Application Backend

- Next.js App Router route handlers.
- TypeScript throughout.
- Modular server code under `lib/server`.

Rationale:

- The product is not yet an external public API platform.
- We already use Next.js and TanStack Query.
- Route handlers are enough for the first production backend if we keep route handlers thin and place business logic in services.
- Avoiding a separate backend app reduces deployment and maintenance overhead.

### Database

- Supabase Postgres.
- Drizzle ORM for schema, migrations, and typed queries.

Rationale:

- The domain is relational: users, profiles, programmes, modules, enrolments, submissions, reviews, trainers, sessions, reports, and tool requests.
- Postgres gives us strong relational integrity, transactions, indexes, views, and future reporting flexibility.
- Drizzle keeps us close to SQL while preserving TypeScript safety.

### Auth and Authorization

- Supabase Auth.
- `profiles` table linked to Supabase Auth users.
- Application roles: entrepreneur, admin, trainer.
- Postgres RLS for exposed tables and storage access where appropriate.
- Service-level authorization checks for business operations.

### Validation

- Zod for server-side input validation.
- Existing UI form schemas can inform backend schemas, but server validation is authoritative.

### Client Data Fetching

- TanStack Query.
- Replace mock stores gradually with query/mutation hooks.

### Storage

- Supabase Storage for PDFs, deliverables, images, and downloadable tool resources.
- Store metadata and storage keys in Postgres.

### Background Jobs

- Trigger.dev.

Use it for:

- report generation
- email notifications
- deliverable review notifications
- weekly update reminders
- session reminders
- report generation
- calendar sync
- file post-processing
- future AI analysis/summarization
- video webhook processing if needed

### Video

- Mux Video for upload, encoding, thumbnails, adaptive streaming, playback analytics, and playback IDs.
- `@mux/mux-player-react` for frontend playback.

Do not use Supabase Storage as the primary training video streaming system. Supabase Storage is for files; Mux is for video streaming infrastructure.

### Email

- Resend, unless business requirements later prefer Postmark or another transactional email provider.

## 4. Architecture Principles

1. Keep route handlers thin.
2. Put business rules in services.
3. Put database access in repositories.
4. Validate all inputs on the server.
5. Authorize every read and write.
6. Use transactions for multi-step writes.
7. Use background jobs for long-running work.
8. Make jobs idempotent.
9. Design every list endpoint for growth.
10. Keep files and videos outside Postgres.
11. Use typed DTOs for API responses.
12. Keep the UI decoupled from database tables.

## 5. Target Backend Folder Structure

```text
lib/server/
  auth/
    get-current-user.ts
    require-role.ts
    permissions.ts
  db/
    client.ts
    schema/
    migrations/
  repositories/
    entrepreneurs.repository.ts
    trainers.repository.ts
    programmes.repository.ts
    content.repository.ts
    deliverables.repository.ts
    sessions.repository.ts
  services/
    entrepreneurs.service.ts
    trainers.service.ts
    programmes.service.ts
    content.service.ts
    deliverables.service.ts
    sessions.service.ts
    reporting.service.ts
  validators/
    entrepreneurs.validators.ts
    programmes.validators.ts
    content.validators.ts
    deliverables.validators.ts
  jobs/
    email-notification.job.ts
    session-reminder.job.ts
    weekly-update-reminder.job.ts
    video-webhook.job.ts
  storage/
    storage.service.ts
    signed-url.service.ts
  video/
    mux.service.ts
    video-assets.service.ts
  email/
    email.service.ts
    templates/
  audit/
    audit.service.ts
  errors/
    api-error.ts
    error-response.ts

app/api/
  auth/
  entrepreneurs/
  trainers/
  programmes/
  content/
  deliverables/
  sessions/
  reporting/
  webhooks/

drizzle/
  schema.ts
  migrations/
```

## 6. Request Flow

### Read Request

```text
Client component
  -> TanStack Query hook
  -> app/api route handler
  -> auth helper
  -> validator for query params
  -> service
  -> repository
  -> Drizzle/Postgres
  -> DTO response
```

### Mutation Request

```text
Client form
  -> React Hook Form + client Zod validation
  -> TanStack mutation
  -> app/api route handler
  -> auth helper
  -> server Zod validation
  -> service authorization and business rules
  -> repository transaction
  -> audit event
  -> optional background job trigger
  -> DTO response
```

### Long-Running Work

```text
Client action
  -> API route validates request
  -> service creates pending record
  -> service triggers Trigger.dev job
  -> API returns job/run reference
  -> job performs work
  -> job updates database status
  -> UI polls or subscribes to status later
```

## 7. Identity and Access Model

### Roles

Initial roles:

- `entrepreneur`
- `admin`
- `trainer`

Expected future growth:

- admin permissions
- reviewer-only roles
- programme manager role
- finance/reporting role
- trainer with restricted access

Do not hard-code assumptions that there will only ever be one admin type.

### Core Tables

```text
auth.users
profiles
roles or profile_roles
invitations
entrepreneur_profiles
trainer_profiles
```

### Profile Table

```text
profiles
  id uuid primary key
  auth_user_id uuid unique references auth.users
  role text
  full_name text
  email text
  avatar_url text nullable
  status text
  created_at timestamptz
  updated_at timestamptz
```

For entrepreneurs, keep business-specific fields in `entrepreneur_profiles`, not directly in `profiles`.

### Access Rules

Entrepreneur:

- Can read their own profile.
- Can update allowed business profile fields.
- Can view programmes they are enrolled in.
- Can view published content assigned to those programmes.
- Can submit deliverables for themselves.
- Can manage their funding updates and tool requests.

Trainer:

- Can read assigned sessions.
- Can read assigned entrepreneur summary data.
- Can update availability and session outcomes if allowed.

Admin:

- Can manage programmes, entrepreneurs, trainers, content, deliverables, sessions, reports, definitions, and tool requests.
- Sensitive admin operations should create audit logs.

## 8. Domain Model Draft

This is a working draft. Names may change during implementation, but the relationships should stay explicit.

### Programme Operations

```text
programmes
  id
  name
  description
  status
  start_date
  end_date
  max_entrepreneurs
  accent
  created_at
  updated_at

programme_enrolments
  id
  programme_id
  entrepreneur_id
  status
  enrolled_at
  completed_at

programme_modules
  id
  programme_id
  module_id
  order_index
  required
```

### Learning Content

```text
modules
  id
  title
  description
  status
  created_at
  updated_at

content_items
  id
  title
  type
  description
  duration_label
  status
  created_at
  updated_at

module_content_items
  id
  module_id
  content_item_id
  order_index

video_assets
  id
  content_item_id
  mux_asset_id
  mux_playback_id
  upload_id
  status
  duration_seconds
  thumbnail_url
  created_at
  updated_at

file_assets
  id
  content_item_id
  storage_bucket
  storage_key
  file_name
  mime_type
  file_size_bytes
  created_at
```

### Entrepreneur Data

```text
entrepreneur_profiles
  id
  profile_id
  business_name
  representative_name
  phone
  country
  sector_id
  stage_id
  funding_goal
  current_need
  assigned_trainer_id
  created_at
  updated_at

funding_rounds
  id
  entrepreneur_id
  amount
  source
  stage
  closed_at

periodic_updates
  id
  entrepreneur_id
  period_start
  period_end
  revenue
  jobs_created
  key_update
  blockers
  submitted_at
```

### Deliverables

```text
required_deliverables
  id
  programme_id nullable
  name
  due_rule
  required_for
  status
  created_at
  updated_at

deliverable_submissions
  id
  required_deliverable_id
  entrepreneur_id
  programme_id nullable
  file_asset_id nullable
  title
  notes
  status
  submitted_at
  reviewed_at nullable
  reviewed_by nullable

deliverable_reviews
  id
  submission_id
  reviewer_id
  decision
  feedback
  created_at
```

### Trainers and Sessions

```text
trainers
  id
  profile_id
  role
  bio
  calendar_provider
  calendar_connected
  status

trainer_specialisms
  id
  trainer_id
  specialism

trainer_assignments
  id
  trainer_id
  entrepreneur_id
  programme_id nullable
  status

sessions
  id
  entrepreneur_id
  trainer_id
  programme_id nullable
  title
  session_type
  status
  starts_at
  ends_at
  meeting_url
  notes
  created_at
  updated_at
```

### Reporting

```text
report_snapshots
  id
  type
  period_start
  period_end
  payload_json
  generated_by
  created_at
```

### Tools and Requests

```text
tools
  id
  title
  description
  category
  storage_bucket
  storage_key
  status

tool_requests
  id
  entrepreneur_id
  title
  description
  status
  admin_notes
  created_at
  updated_at
```

### Audit

```text
audit_logs
  id
  actor_profile_id
  action
  entity_type
  entity_id
  metadata_json
  created_at
```

Audit important actions:

- role changes
- entrepreneur assignment
- trainer assignment
- deliverable approval or rejection
- programme publish/unpublish
- content publish/unpublish
- file deletion
- admin edits to profile/business data

## 9. API Design

### Conventions

- API routes live under `app/api`.
- Response data should be DTOs, not raw database rows.
- Use Zod for params, query, and body validation.
- Services return typed results.
- List endpoints support:
  - `q`
  - filters
  - sort
  - cursor or page
  - page size

### Response Envelope

For single resources:

```json
{
  "data": {}
}
```

For lists:

```json
{
  "data": [],
  "pagination": {
    "nextCursor": null,
    "pageSize": 25,
    "total": 120
  }
}
```

For errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the submitted fields.",
    "fields": {}
  }
}
```

### Initial API Surface

Auth/profile:

```text
GET    /api/me
PATCH  /api/me/profile
```

Programmes:

```text
GET    /api/programmes
POST   /api/programmes
GET    /api/programmes/:id
PATCH  /api/programmes/:id
POST   /api/programmes/:id/modules
POST   /api/programmes/:id/modules/reuse
GET    /api/programmes/:id/readiness
```

Content:

```text
GET    /api/content
POST   /api/content
PATCH  /api/content/:id
POST   /api/content/:id/files
POST   /api/content/:id/video/upload-url
```

Entrepreneurs:

```text
GET    /api/entrepreneurs
POST   /api/entrepreneurs
GET    /api/entrepreneurs/:id
PATCH  /api/entrepreneurs/:id
POST   /api/entrepreneurs/:id/assign-programme
POST   /api/entrepreneurs/:id/assign-trainer
```

Deliverables:

```text
GET    /api/deliverables
POST   /api/deliverables/submissions
GET    /api/deliverables/submissions
GET    /api/deliverables/submissions/:id
POST   /api/deliverables/submissions/:id/review
```

Sessions:

```text
GET    /api/sessions
POST   /api/sessions
PATCH  /api/sessions/:id
POST   /api/sessions/:id/cancel
```

Reporting:

```text
GET    /api/reporting/dashboard
GET    /api/reporting/programmes
GET    /api/reporting/exports
POST   /api/reporting/exports
```

Webhooks:

```text
POST   /api/webhooks/mux
POST   /api/webhooks/trigger
POST   /api/webhooks/resend
```

## 10. Query and Mutation Strategy

The frontend already has TanStack Query installed. Backend integration should introduce query hooks gradually.

Target client structure:

```text
lib/client/api/
  fetcher.ts
  query-keys.ts
  auth.queries.ts
  programmes.queries.ts
  entrepreneurs.queries.ts
  deliverables.queries.ts
```

Rules:

- Centralize fetch behavior.
- Centralize query keys.
- Use optimistic updates only when the rollback path is clear.
- Invalidate precise query keys after mutations.
- Keep server response DTOs stable.
- Avoid one-off fetch calls inside components.

## 11. Storage Design

### Buckets

Proposed Supabase Storage buckets:

```text
deliverables-private
tools-private
content-files-private
profile-images
```

### File Metadata

Postgres should store:

- owner or source entity
- bucket
- storage key
- original file name
- MIME type
- size
- upload status
- checksum if needed
- created by
- created at

### Access

- Private files use signed URLs.
- Public profile images may use public URLs only if approved.
- Deliverables should not be publicly accessible.

## 12. Video Design

### Why Mux

Training content can grow quickly and video is operationally expensive to do well. Mux handles upload, encoding, adaptive playback, thumbnails, analytics, and playback infrastructure.

### Video Flow

```text
Admin creates video content item
  -> backend creates Mux direct upload
  -> admin uploads video to Mux
  -> Mux processes asset
  -> Mux webhook updates video_assets row
  -> content becomes playable when status is ready
  -> entrepreneur views with Mux Player
```

### Tables

Use `video_assets` linked to `content_items`.

Important fields:

- `mux_asset_id`
- `mux_playback_id`
- `mux_upload_id`
- `status`
- `duration_seconds`
- `thumbnail_url`
- `error_message`

### Player

Use `@mux/mux-player-react/lazy` for training detail pages.

### Access Control

Start with signed playback if content must be restricted to enrolled entrepreneurs. If public playback IDs are acceptable for early internal pilots, still design the table so signed playback can be added later.

## 13. Background Jobs Design

### Job Categories

Notification jobs:

- welcome email
- password reset or verification follow-up if needed outside Supabase templates
- deliverable submitted notification
- deliverable review decision notification
- session reminders
- weekly update reminders

Maintenance jobs:

- overdue deliverable status updates
- session status updates
- stale invitation cleanup
- dashboard/report snapshot generation

Integration jobs:

- calendar sync
- Mux webhook post-processing
- future CRM/accounting integrations

### Job Rules

- Jobs must be idempotent.
- Jobs should receive IDs, not full domain objects.
- Jobs should reload current state from the database.
- Jobs should write status transitions.
- Jobs should be retry-safe.
- Jobs should emit audit logs when they complete important business actions.

### Job Status Tables

For long-running user-visible jobs, create a table:

```text
background_tasks
  id
  type
  status
  source_type
  source_id
  trigger_run_id
  requested_by
  error_message
  created_at
  updated_at
  completed_at
```

## 14. Email Design

Use Resend for transactional email unless changed later.

Email categories:

- account verification and account lifecycle
- admin invitations
- trainer invitations
- deliverable status notifications
- session reminders
- weekly update reminders

Email rules:

- Trigger emails from services or jobs, not UI components.
- Keep email templates versioned in code.
- Do not send emails directly inside a database transaction.
- Use a notification log table to avoid duplicate sends.

Possible table:

```text
notification_logs
  id
  recipient_profile_id
  channel
  template
  status
  provider_message_id
  metadata_json
  sent_at
  created_at
```

## 15. Authorization and RLS Strategy

Use both:

- service-level authorization for business rules
- RLS for data protection at the database/storage boundary

Do not rely only on frontend route protection.

### Service Authorization

Every service method should receive an actor:

```ts
type Actor = {
  profileId: string;
  authUserId: string;
  role: 'admin' | 'entrepreneur' | 'trainer';
};
```

Services should check:

- Is the actor authenticated?
- Does the actor have the right role?
- Is the actor assigned to this entity?
- Is the entity in the right status for this action?

### RLS

Use RLS for:

- entrepreneur-owned data
- deliverable submissions
- private file metadata
- storage objects
- trainer assigned views if direct client access is used

If all data access goes through server-side route handlers with service role, still keep RLS policies planned and documented so future direct Supabase client access does not become dangerous.

## 16. Search, Filtering, and Pagination

Backend list endpoints should support the UI patterns already built.

Required list behavior:

- search query
- filters
- sort
- page size
- pagination metadata

For small admin lookup lists:

- offset pagination is acceptable.

For large tables:

- use cursor pagination.
- index filter and sort columns.

Large/growing surfaces:

- entrepreneurs
- trainers
- programmes
- content library
- deliverable submissions
- sessions
- reporting exports
- training library

## 17. Error Handling

Create a shared `ApiError`.

Suggested error codes:

```text
VALIDATION_ERROR
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
CONFLICT
BUSINESS_RULE_VIOLATION
RATE_LIMITED
INTERNAL_ERROR
```

Rules:

- Never expose raw database errors to users.
- Log unexpected errors server-side.
- Return safe, structured error responses.
- Preserve field-level validation errors for forms.

## 18. Audit and Compliance

Audit logs should record important actions without storing sensitive payloads.

Audit examples:

- admin created programme
- admin edited entrepreneur profile
- admin assigned trainer
- admin reviewed deliverable
- admin generated document
- admin changed content publish status
- trainer completed session
- entrepreneur submitted deliverable

Audit metadata should be useful, but not become a dump of private data.

## 19. Observability

Minimum:

- structured server logs
- Trigger.dev job dashboard
- provider logs for Mux, Resend, and Supabase
- clear error handling

Later:

- Sentry for frontend/backend exceptions
- PostHog or similar for product analytics if needed
- custom admin health dashboard backed by reporting queries

## 20. Environment Variables

Draft environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_ID=

MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=

RESEND_API_KEY=
EMAIL_FROM=

APP_URL=
```

Rules:

- Only `NEXT_PUBLIC_*` variables can reach the browser.
- Service keys must stay server-side.
- Webhook secrets must be validated.

## 21. Testing Strategy

### Unit Tests

Test:

- services
- validators
- permission helpers
- DTO mappers

### Integration Tests

Test:

- route handlers
- repository filters and joins
- transactional workflows
- job handlers

### Security Tests

Test:

- entrepreneur cannot read another entrepreneur's data
- trainer cannot read unassigned entrepreneurs
- non-admin cannot perform admin mutations
- signed file URLs require ownership or admin access

### Job Tests

Test:

- idempotency
- retry safety
- status transitions
- duplicate email prevention

## 22. Backend Implementation Phases

### Phase 1: Foundation

- Install Supabase, Drizzle, Trigger.dev, Mux, Resend packages.
- Add environment variable template.
- Create Drizzle config and schema folder.
- Add server error helpers.
- Add auth/session helpers.
- Create `profiles` and role model.

### Phase 2: Read APIs

- Build read endpoints for programmes, content, entrepreneurs, trainers, sessions, deliverables.
- Replace mock reads with TanStack Query.
- Keep mock stores only as fallback until migrated.

### Phase 3: Core Mutations

- Entrepreneur signup profile creation.
- Admin entrepreneur create/edit/assign.
- Trainer create/edit/assign.
- Programme create/edit.
- Module/content create/reuse.
- Deliverable submission and review.

### Phase 4: Storage

- Deliverable upload flow.
- Tool/resource file storage.
- Signed URL access.

### Phase 5: Jobs and Email

- Trigger.dev setup.
- Email notification jobs.
- Session reminders.
- Weekly update reminders.

### Phase 6: Video

- Mux direct upload.
- Mux webhook.
- Video asset status.
- Mux player integration in training pages.
- Signed playback decision.

### Phase 7: Reporting and Hardening

- Dashboard metrics from real queries.
- Report snapshots/exports.
- Audit logs.
- RLS policies.
- Rate limiting.
- Production monitoring.

## 23. Key Open Questions

These should be answered before or during backend implementation:

- Will admins and trainers be invited only, or can admins create them directly in the admin UI?
- Does every entrepreneur belong to exactly one organization/business, or can one user represent multiple businesses?
- Can an entrepreneur be enrolled in multiple programmes at once?
- Can a trainer be assigned at programme level, entrepreneur level, or both?
- Should training videos require signed playback from day one?
- What email templates need business approval?
- What reporting outputs are required by funders?
- Do we need multi-tenant organization separation in the future?
- What is the expected number of entrepreneurs, programmes, videos, and deliverables over 12 months?

## 24. Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-07-01 | Use Next.js route handlers instead of a separate backend app initially. | Lower operational complexity while keeping modular backend boundaries. |
| 2026-07-01 | Use Supabase Postgres/Auth/Storage. | Provides relational database, auth, storage, and RLS aligned with product needs. |
| 2026-07-01 | Use Drizzle ORM. | Type-safe and close to SQL without forcing a heavy data framework. |
| 2026-07-01 | Use Trigger.dev for background jobs. | Reliable jobs, retries, scheduling, monitoring, and long-running workflows without managing queue infrastructure. |
| 2026-07-01 | Use Mux for training video. | Avoid custom video encoding/streaming infrastructure; support adaptive playback and analytics. |
| 2026-07-01 | Use Supabase Storage for non-video files. | Good fit for deliverables, PDFs, tools, and other non-video assets. |

## 25. References

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Drizzle ORM: https://orm.drizzle.team/docs/overview
- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Trigger.dev: https://trigger.dev/docs
- Mux Video: https://www.mux.com/docs/guides/video
- Mux Player React: https://github.com/muxinc/elements/tree/main/packages/mux-player-react
- Resend: https://resend.com/docs
