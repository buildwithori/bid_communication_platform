# BID Hub Backend Design Document

Last updated: 2026-07-10

Status: Draft for collaboration before implementation

Owner: BID Hub engineering

Related memory files:

- `PROJECT_MEMORY.md`
- `BACKEND_MEMORY.md`

## 1. Purpose

This document defines the backend architecture for BID Hub now that the backend direction is NestJS. It is intentionally detailed because we are about to move from UI-first mock flows into real data, permissions, files, jobs, calendar integration, and video processing.

The goal is not to build quickly at the cost of future pain. The goal is to build a backend that can support BID operations as entrepreneurs, programmes, trainers, content, deliverables, sessions, tools, and reports grow.

## 2. Product Context

BID Hub supports entrepreneur development programmes across three workspaces:

- Entrepreneur workspace: learning, deliverables, profile, funding updates, sessions, tools.
- Admin workspace: operations, programmes, entrepreneurs, trainers, content, deliverable reviews, sessions, reporting, tool requests, settings.
- Trainer workspace: programme/content portfolio, inferred entrepreneurs, sessions, deliverable reviews, settings.

Important product decisions the backend must preserve:

- Entrepreneurs can have zero, one, or many programme access grants.
- Every entrepreneur automatically has free resource access after signup.
- Free resources are not stored as per-entrepreneur assignments.
- Trainers are not directly assigned to entrepreneurs.
- Trainers are assigned to programme content items/modules.
- An entrepreneur's trainer context is inferred from the content they can access.
- Ratings on content roll up to the trainer attached to that content.
- Programme impact reporting must be attributed explicitly. Do not force unattributed jobs/funding into programme charts.
- Deliverable due dates come from programme deliverable rules and become concrete per entrepreneur/programme context.
- Session requests can target a specific person or the open BID team queue.
- The first eligible admin/trainer who accepts an open team request owns the session.
- Google Calendar/Google Meet is first, but session data should stay provider-agnostic.

## 3. Chosen Stack

### Backend Framework

- NestJS.
- TypeScript.
- REST-first API.
- OpenAPI/Swagger documentation generated from DTOs.

Rationale:

- The product has multiple bounded domains and non-trivial workflows.
- NestJS gives us modules, guards, interceptors, pipes, providers, dependency injection, and testable services.
- A dedicated backend keeps business logic out of the Next.js UI.
- REST maps cleanly to the current TanStack Query integration.

### Frontend

- Existing Next.js app remains the frontend.
- TanStack Query remains the client data fetching layer.
- The frontend should call NestJS APIs through typed client helpers/hooks.

### Database

- PostgreSQL.
- Prisma ORM for schema, migrations, and typed database access.

Rationale:

- The domain is relational and needs transactions, constraints, indexes, joins, and reporting queries.
- Prisma gives strong schema visibility, migrations, generated types, and a clean developer experience with NestJS.

### Auth

- NestJS-owned authentication.
- Email/password auth for standard login.
- Google OAuth signup/login for entrepreneurs.
- Admin/trainer invitation flows.
- JWT access tokens plus refresh tokens stored server-side or hashed in the database.
- Argon2 for password hashing.

Rationale:

- We need business-specific role routing, invitations, email verification, password reset, and future permissions.
- Owning auth in the NestJS backend keeps authorization decisions close to the domain.

### Authorization

- Role-based access first: entrepreneur, trainer, admin.
- Policy-based checks inside services for business rules.
- Capability/permission table can be added later without rewriting every endpoint.

### Files

- S3-compatible object storage.
- Use storage keys in the database, not public URLs.
- Signed URLs for private reads/downloads.
- Direct upload URLs where appropriate.

### Video

- Mux Video for video upload, encoding, playback, thumbnails, captions later, and analytics.
- Frontend uses `@mux/mux-player-react`.
- Store Mux asset IDs, playback IDs, duration, status, and metadata in Postgres.

### Jobs

- Redis + BullMQ.
- NestJS queue processors for background work.
- Use repeatable jobs for reminders and sync.

Jobs cover:

- email notifications
- in-app notification fanout
- session reminders
- deliverable reminders
- periodic update reminders
- report generation/export
- file processing
- Google Calendar sync
- Mux webhook processing

### Email

- Resend for transactional email unless the business chooses another provider later.

### Calendar

- Google Calendar first.
- Store OAuth tokens encrypted.
- Read free/busy availability.
- Create/update/cancel Google Calendar events with Google Meet links.
- Keep session fields provider-agnostic so we can add Zoom/Teams later.

## 4. Architecture Principles

1. Controllers are thin.
2. DTOs validate request input.
3. Services own business rules and transactions.
4. Policies own authorization decisions that are more complex than role guards.
5. Repositories/query helpers own complex database queries.
6. Jobs are idempotent.
7. Files and videos stay outside Postgres.
8. Every list endpoint supports growth: search, filters, sorting, pagination.
9. Use transactions for multi-step writes.
10. Use audit logs for important admin decisions.
11. Never trust client-provided ownership, role, or status transitions.
12. Return API DTOs, not raw database rows.

## 5. Repository Shape

Recommended monorepo shape:

```text
apps/
  web/              # existing Next.js UI, or current root app can stay until migrated
  api/              # NestJS backend
packages/
  shared/           # optional shared types/constants later
prisma/
  schema.prisma
  migrations/
```

If we keep the current repo root as the web app initially, create the backend under:

```text
backend/
  src/
  test/
  package.json
  tsconfig.json
```

The long-term preferred structure is `apps/api` and `apps/web`, but we do not need to move the frontend on day one if that slows backend setup.

## 6. NestJS Folder Structure

```text
apps/api/src/
  main.ts
  app.module.ts
  config/
    app.config.ts
    database.config.ts
    auth.config.ts
    storage.config.ts
    mux.config.ts
    calendar.config.ts
  common/
    decorators/
    dto/
    errors/
    filters/
    guards/
    interceptors/
    pagination/
    pipes/
    policies/
    types/
  database/
    prisma.module.ts
    prisma.service.ts
    transaction.ts
  auth/
  users/
  admins/
  entrepreneurs/
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

Feature module pattern:

```text
feature/
  feature.module.ts
  feature.controller.ts
  feature.service.ts
  dto/
  policies/
  repositories/
  mappers/
  jobs/
```

## 7. Request Flow

### Read Request

```text
Next.js page/component
  -> TanStack Query hook
  -> API client
  -> NestJS controller
  -> auth guard
  -> query DTO validation
  -> service
  -> policy check
  -> repository/query helper
  -> Prisma/Postgres
  -> mapper
  -> DTO response
```

### Mutation Request

```text
Form
  -> client validation for UX
  -> TanStack mutation
  -> NestJS controller
  -> auth guard
  -> body DTO validation
  -> service
  -> policy check
  -> transaction
  -> audit log
  -> optional job enqueue
  -> DTO response
```

### Long Running Work

```text
Client action
  -> controller validates request
  -> service creates pending record/job record
  -> service enqueues BullMQ job
  -> controller returns status reference
  -> worker processes job idempotently
  -> worker updates database
  -> UI polls, refreshes, or receives future realtime notification
```

## 8. Identity and Auth Model

### Core Tables

- `users`
- `user_roles`
- `admin_profiles`
- `trainer_profiles`
- `entrepreneur_profiles`
- `businesses`
- `invitations`
- `refresh_tokens`
- `email_verification_tokens`
- `password_reset_tokens`
- `oauth_accounts`

### Role Rules

A user can have one or more roles, but initial UI routes assume one active workspace at a time.

- Entrepreneurs can self-register.
- Entrepreneurs can sign up with Google.
- Admins are invited.
- Trainers are invited.
- Admins/trainers can connect Google Calendar after account creation.

### Auth Flows

- Signup creates user, entrepreneur profile, business profile, and sends verification email.
- Login returns access token and refresh token.
- Refresh token rotation should invalidate reused/stolen tokens.
- Forgot password creates a short-lived token and sends email.
- Reset password validates token and updates password hash.
- Google auth links by verified email where safe, otherwise creates entrepreneur account.
- Invitations create an invitation token and role intent.
- Accept invitation creates/links user and role profile.

## 9. Domain Model Draft

This is the first schema plan. Exact Prisma names can change, but the relationships should stay stable.

### Lookup and Company Settings

- `company_settings`
  - periodic update overdue threshold in days
  - default timezone
  - default session provider
  - notification defaults
- `sectors`
- `business_stages`
- `goal_types`
- `tool_areas`
- `countries` can be static seed data initially

### Entrepreneurs and Businesses

- `businesses`
  - name
  - country
  - sector_id
  - stage_id
  - status
  - source: self_registered, admin_invited, imported
- `entrepreneur_profiles`
  - user_id
  - business_id
  - representative details
- `business_contacts` can come later if multiple contacts are needed.

### Programme Operations

- `programmes`
  - name
  - description
  - access_type: free, assigned
  - start_date
  - end_date
  - published_at
  - completed_at
  - archived_at
  - archived_by_id
  - archive_reason
- `programme_modules`
  - programme_id
  - module_id
  - position
- `programme_access_grants`
  - programme_id
  - business_id
  - granted_by_id
  - granted_at
  - revoked_at
  - revoke_reason

Rules:

- Free programmes/resources do not need per-business grants.
- Assigned programmes use `programme_access_grants`.
- Programme lifecycle is derived, not blindly stored as a manual status.

### Learning Content

- `modules`
  - title
  - description
  - reusable flag or implicit reuse by joins
- `module_content_items`
  - module_id
  - content_item_id
  - position
- `content_items`
  - title
  - description
  - type: video, pdf, tool
  - trainer_id nullable but required when ratings should attribute to a trainer
  - duration_seconds nullable
  - status: draft, processing, ready, failed, archived
- `video_assets`
  - content_item_id
  - mux_asset_id
  - mux_upload_id
  - playback_id
  - duration
  - status
- `file_assets`
  - content_item_id nullable
  - storage_key
  - original_filename
  - mime_type
  - size_bytes
  - status
- `content_tool_links`
  - content_item_id
  - tool_id nullable
  - external_url nullable
- `content_ratings`
  - content_item_id
  - business_id
  - entrepreneur_user_id
  - trainer_id copied from content item at rating time
  - rating
  - comment

Rules:

- A module can be reused across programmes.
- Reordering must update `position` safely inside a transaction.
- Trainer attribution comes from content item ownership at the time of rating.

### Deliverables

- `programme_deliverable_rules`
  - programme_id
  - name
  - description
  - due_type: fixed_date, after_module, recurring, manual
  - due_date nullable
  - due_after_module_id nullable
  - recurring_rule nullable
  - required_for: all, stage, sector, custom later
- `deliverable_instances`
  - rule_id
  - business_id
  - programme_id
  - due_date
  - status: not_submitted, submitted, changes_required, approved, overdue
- `deliverable_submissions`
  - instance_id
  - submitted_by_id
  - file_asset_id
  - note
  - submitted_at
- `deliverable_reviews`
  - submission_id
  - reviewer_id
  - reviewer_role
  - decision: approved, changes_required
  - feedback
  - created_at
  - read_at nullable

Rules:

- Programme deliverable rules define the requirement.
- Deliverable instances define what one entrepreneur/business owes.
- Reviews are history. Do not overwrite feedback.
- `changes_required` is a status, not just a note.
- Entrepreneurs need unread feedback tracking.
- Trainers can review deliverables in their trainer scope.

### Sessions

- `session_requests`
  - business_id
  - requested_by_id
  - session_type
  - topic
  - notes
  - requested_date
  - requested_start_time
  - target_type: specific_user, open_team
  - target_user_id nullable
  - status: awaiting_owner, awaiting_trainer, confirmed, declined, cancelled, completed
- `sessions`
  - request_id nullable
  - business_id
  - owner_user_id
  - owner_role
  - session_type
  - topic
  - notes
  - starts_at
  - ends_at
  - provider: google_meet for now
  - meeting_url
  - calendar_event_id
  - status: confirmed, completed, cancelled
- `session_reschedules`
  - session_id or request_id
  - requested_by_id
  - previous_starts_at
  - previous_ends_at
  - new_starts_at
  - new_ends_at
  - reason
  - status
- `session_notes`
  - session_id
  - author_id
  - note
- `calendar_connections`
  - user_id
  - provider
  - provider_account_email
  - encrypted_access_token
  - encrypted_refresh_token
  - scopes
  - status
  - last_synced_at

Rules:

- Time slots are computed from selected person/team, date, duration, and calendar availability.
- Open team requests are accepted by the first eligible admin/trainer.
- Only users with Google Calendar connection can accept Google Meet ownership.
- Meeting links are generated in the background when ownership is confirmed.

### Tools

- `tools`
  - name
  - description
  - type: pdf, online_tool
  - tool_area_id
  - visibility: global, programme, custom
  - status: draft, published, archived
  - file_asset_id nullable
  - external_url nullable
- `tool_programme_access`
- `tool_business_access`
- `tool_hidden_businesses`
- `tool_requests`
  - business_id
  - requested_by_id
  - title
  - business_need
  - tool_area_id
  - needed_by nullable
  - status: under_review, in_development, built, declined
  - admin_decision_note nullable
  - decided_by_id nullable
  - decided_at nullable

Rules:

- Global tools are visible to all entrepreneurs unless explicitly hidden.
- Programme tools are visible to businesses with access to that programme.
- Custom tools are visible only to selected businesses.
- Admin decisions on requests must be visible to the entrepreneur.

### Reporting

- `periodic_updates`
  - business_id
  - reporting_period_start
  - reporting_period_end
  - submitted_at
  - jobs_total
  - jobs_women
  - jobs_men
  - funds_mobilised
  - programme_id nullable when explicitly programme-scoped
  - notes
- `fundraising_rounds`
  - business_id
  - round_name
  - amount
  - currency
  - date
  - source
  - programme_goal_id nullable
  - programme_id nullable only if explicitly attributed
- `programme_goals`
  - business_id
  - programme_id nullable depending on goal type scope
  - goal_type_id
  - target_amount nullable
  - target_date nullable
  - description
  - status: active, achieved, closed
- `report_exports`
  - requested_by_id
  - status
  - storage_key nullable
  - filters json

Rules:

- Jobs by programme require periodic updates to be programme-scoped.
- Funds by programme require fundraising rounds or goals to be programme-attributed.
- If attribution is missing, report as company-wide/unattributed, not under a programme.

### Notifications and Audit

- `notifications`
  - recipient_user_id
  - type
  - title
  - body
  - entity_type
  - entity_id
  - read_at
- `audit_logs`
  - actor_id
  - action
  - entity_type
  - entity_id
  - before json
  - after json
  - created_at

## 10. State Machines

### Programme Lifecycle

```text
Draft -> Scheduled -> Active -> Completed -> Archived
Draft -> Archived
Scheduled -> Archived
Active -> Completed
Active -> Archived (sets completed_at if needed)
Completed -> Active (reopen)
Archived -> previous derived state (restore)
```

Derived order:

1. `archived_at` means Archived.
2. no `published_at` means Draft.
3. `completed_at` or passed `end_date` means Completed.
4. future `start_date` means Scheduled.
5. otherwise Active.

### Deliverable Instance

```text
Not submitted -> Submitted -> Approved
Not submitted -> Submitted -> Changes required -> Submitted -> Approved
Not submitted -> Overdue -> Submitted
Submitted -> Changes required
```

Rules:

- Review history is append-only.
- Latest review decision determines review-facing status.
- Entrepreneur read state is per review or per feedback event.

### Tool Request

```text
Under review -> In development -> Built
Under review -> Declined
In development -> Built
In development -> Declined
```

Rules:

- Built should link to the created/published tool when available.
- Declined requires a decision note.

### Session Request

```text
Awaiting owner -> Confirmed -> Completed
Awaiting owner -> Declined
Confirmed -> Cancelled
Confirmed -> Rescheduled -> Confirmed
```

Specific trainer request can be represented as awaiting that trainer. Open BID team request remains `awaiting_owner` until accepted.

## 11. API Design

### API Conventions

- Base path: `/api/v1`.
- REST nouns for resources.
- Action endpoints only when the operation is not a simple CRUD update.
- Request DTOs validated by `class-validator` or Zod pipes. Pick one consistently during implementation.
- Response DTOs should be explicit.
- Use cursor pagination for growing lists.

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
  "pageInfo": {
    "nextCursor": "...",
    "hasNextPage": true
  },
  "totalCount": 124
}
```

For errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted fields.",
    "details": []
  }
}
```

### Initial API Surface

Auth:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`
- `GET /auth/me`

Admin team:

- `GET /admins`
- `POST /admins/invitations`
- `GET /admins/:id`
- `PATCH /admins/:id`

Entrepreneurs:

- `GET /entrepreneurs`
- `POST /entrepreneurs`
- `GET /entrepreneurs/:id`
- `PATCH /entrepreneurs/:id`
- `GET /entrepreneurs/:id/programme-access`
- `POST /entrepreneurs/:id/programme-access`
- `DELETE /entrepreneurs/:id/programme-access/:programmeId`
- `GET /entrepreneurs/:id/tool-access`
- `POST /entrepreneurs/:id/tool-access`
- `DELETE /entrepreneurs/:id/tool-access/:toolId`

Programmes:

- `GET /programmes`
- `POST /programmes`
- `GET /programmes/:id`
- `PATCH /programmes/:id`
- `POST /programmes/:id/publish`
- `POST /programmes/:id/complete`
- `POST /programmes/:id/archive`
- `POST /programmes/:id/restore`
- `GET /programmes/:id/modules`
- `POST /programmes/:id/modules`
- `PATCH /programmes/:id/modules/reorder`

Learning content:

- `GET /modules/:id`
- `POST /modules`
- `PATCH /modules/:id`
- `POST /modules/:id/content-items`
- `PATCH /modules/:id/content-items/reorder`
- `GET /content-items/:id`
- `POST /content-items/:id/ratings`

Deliverables:

- `GET /programme-deliverable-rules`
- `POST /programmes/:id/deliverable-rules`
- `PATCH /deliverable-rules/:id`
- `GET /deliverable-instances`
- `POST /deliverable-instances/:id/submissions`
- `GET /deliverable-reviews`
- `POST /deliverable-submissions/:id/reviews`
- `PATCH /deliverable-instances/:id/due-date`
- `POST /deliverable-reviews/:id/mark-read`

Sessions:

- `GET /sessions`
- `POST /session-requests`
- `GET /session-requests`
- `POST /session-requests/:id/accept`
- `POST /session-requests/:id/decline`
- `POST /sessions`
- `POST /sessions/:id/reschedule`
- `POST /sessions/:id/complete`
- `POST /sessions/:id/notes`
- `GET /availability`

Tools:

- `GET /tools`
- `POST /tools`
- `GET /tools/:id`
- `PATCH /tools/:id`
- `POST /tools/:id/publish`
- `POST /tools/:id/archive`
- `GET /tool-requests`
- `POST /tool-requests`
- `POST /tool-requests/:id/transition`

Reporting:

- `GET /reporting/overview`
- `GET /reporting/overdue-updates`
- `POST /periodic-updates`
- `GET /periodic-updates`
- `POST /fundraising-rounds`
- `GET /fundraising-rounds`
- `POST /report-exports`

Files/video/calendar:

- `POST /files/direct-upload-url`
- `GET /files/:id/signed-url`
- `POST /video/direct-upload`
- `POST /webhooks/mux`
- `GET /calendar/google/connect-url`
- `POST /calendar/google/callback`
- `DELETE /calendar/connections/:id`

Notifications:

- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`

## 12. Search, Filtering, and Pagination

Every growing list endpoint should accept:

- `search`
- `cursor`
- `limit`
- `sortBy`
- `sortDirection`
- domain filters

Use case-insensitive search over normalized fields. Add indexes before production data grows.

Important filters:

- Entrepreneurs: source, status, sector, stage, country, programme access, tool access.
- Trainers: status, specialism, access level, calendar support.
- Programmes: lifecycle, access type, archive state.
- Content: type, readiness, trainer, programme usage.
- Deliverables: programme, status, due date, reviewer, unread feedback.
- Sessions: status, owner, target type, date range, session type.
- Tools: type, area, visibility, status.
- Reporting: programme attribution, date range, country, sector, stage.

## 13. Storage Design

### File Categories

- deliverable submissions
- programme PDFs
- tool PDFs
- profile images later
- report exports

### Storage Rules

- Files are private by default.
- Generate short-lived signed URLs for reads.
- Validate file type and size before issuing upload permission.
- Store file metadata in `file_assets`.
- Keep original file name but never use it as the storage key.
- Use background scan/post-processing hook if needed later.

### Upload Flow

```text
Client asks API for upload permission
API authorizes actor and validates desired file category
API creates pending file_asset record
API returns signed upload URL or direct upload credentials
Client uploads file
Client confirms upload
API marks file ready or schedules processing job
```

## 14. Video Design

### Mux Upload Flow

```text
Admin creates video content item
API creates Mux direct upload
API stores pending video_asset
Client uploads video to Mux
Mux sends webhook
API verifies webhook signature
API updates video_asset status, asset ID, playback ID, duration
Content item becomes ready when Mux asset is ready
```

### Access Control

Start with private/signed playback if training content should be restricted. If we temporarily use public playback IDs for pilots, keep database fields ready for signed playback policy.

### Playback Data

Store:

- mux upload ID
- mux asset ID
- playback ID
- playback policy
- duration
- aspect ratio if needed
- status
- error message if processing fails

## 15. Background Jobs

### Queues

- `emails`
- `notifications`
- `sessions`
- `calendar-sync`
- `deliverables`
- `periodic-updates`
- `reports`
- `video`

### Job Rules

- Jobs must be idempotent.
- Jobs should reload current state from the database.
- Jobs should no-op safely if the target entity has changed state.
- Store `job_runs` for user-visible long-running work.
- Use exponential backoff for transient provider failures.
- Do not send emails inside database transactions.

### Scheduled Jobs

- Daily deliverable overdue check.
- Daily periodic update overdue check.
- Session reminders before scheduled start.
- Calendar sync for connected admins/trainers.
- Report export cleanup for old signed/generated files.

## 16. Calendar and Meeting Design

### Google Calendar Connection

- Admin/trainer starts OAuth from settings.
- Backend stores encrypted tokens and scopes.
- Backend verifies required scopes are present.
- Backend marks calendar support available only after successful token exchange.

### Availability

Availability endpoint input:

- date or date range
- session type/duration
- target user or open team
- timezone

Availability output:

- available slots
- eligible owners for open team requests if needed

Rules:

- Do not return static time lists after trainer selection.
- For open team requests, show slots that at least one eligible connected owner can cover.
- When a user accepts a request, recheck availability inside the transaction/workflow.

### Meeting Link Creation

- Confirmed Google Meet sessions should be backed by a Google Calendar event.
- Store provider, event ID, meeting URL, and owner.
- Reschedule updates the calendar event.
- Cancel/decline cancels or marks the event based on state.

## 17. Email and Notification Design

Use in-app notifications for immediate product context and email for important external prompts.

Notification triggers:

- admin/trainer invitation
- email verification
- password reset
- deliverable submitted
- deliverable reviewed
- feedback unread reminder
- session requested
- session accepted/declined/rescheduled/completed
- trainer nudged
- tool request decision changed
- periodic update overdue
- report export ready

Templates should live in backend email module and use stable template names.

## 18. Authorization Details

### Guards

- `JwtAuthGuard`
- `RolesGuard`
- optional `VerifiedEmailGuard`

### Decorators

- `@CurrentUser()`
- `@Roles()`
- `@RequestId()`

### Policies

Examples:

- `ProgrammePolicy.canViewProgramme(actor, programme)`
- `ProgrammePolicy.canManageProgramme(actor)`
- `EntrepreneurPolicy.canViewBusiness(actor, businessId)`
- `TrainerPolicy.canViewBusinessThroughContent(actor, businessId)`
- `DeliverablePolicy.canReviewSubmission(actor, submissionId)`
- `SessionPolicy.canAcceptRequest(actor, requestId)`
- `ToolPolicy.canViewTool(actor, toolId)`

Authorization should be checked in services, close to business logic, even if a controller already requires a role.

## 19. Error Handling

Use a global exception filter to normalize errors.

Error code examples:

- `VALIDATION_ERROR`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `BUSINESS_RULE_VIOLATION`
- `UPLOAD_NOT_ALLOWED`
- `CALENDAR_NOT_CONNECTED`
- `SESSION_SLOT_UNAVAILABLE`
- `VIDEO_PROCESSING_FAILED`

Do not leak raw Prisma/provider errors to the frontend.

## 20. Observability

Minimum production setup:

- structured JSON logging with request IDs
- Sentry for backend exceptions
- health endpoint
- readiness endpoint
- queue dashboard or admin observability for BullMQ
- provider webhook logs
- audit log table for business actions

Track:

- API error rate
- auth failures
- upload failures
- Mux webhook failures
- calendar sync failures
- job retry/dead-letter counts
- email send failures

## 21. Environment Variables

Draft variables:

```bash
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ARGON2_MEMORY_COST=
APP_WEB_URL=
API_URL=
RESEND_API_KEY=
EMAIL_FROM=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
ENCRYPTION_KEY=
SENTRY_DSN=
```

## 22. Testing Strategy

### Unit Tests

- services with business rules
- policy checks
- date/due-date calculations
- programme lifecycle derivation
- reporting attribution calculations
- session state transitions

### Integration Tests

- auth flows
- programme access grants/revokes
- deliverable submit/review
- session request/accept/reschedule
- tool access and request decisions
- file upload permission creation

### Job Tests

- idempotency
- retry behavior
- no-op when entity state changes
- provider webhook handling

### Contract Tests

The frontend depends on stable DTOs. Add OpenAPI generation and consider generated frontend API types once core endpoints settle.

## 23. Backend Implementation Phases

### Phase 0: Planning Lock

- Confirm stack.
- Confirm repository layout.
- Confirm auth ownership.
- Confirm storage provider.
- Confirm first production hosting target.

### Phase 1: NestJS Foundation

- Scaffold NestJS app.
- Add config validation.
- Add Prisma/Postgres.
- Add global validation pipe.
- Add global exception filter.
- Add logging/request ID.
- Add health endpoints.
- Add OpenAPI setup.

### Phase 2: Identity and Access

- Users, roles, profiles.
- Entrepreneur signup/login.
- Google signup/login.
- Email verification.
- Password reset.
- Admin/trainer invitations.
- Auth guards/decorators.

### Phase 3: Read APIs

- Lookups/settings.
- Programmes/content/training library.
- Entrepreneurs/admin directory.
- Trainers/trainer dashboard data.
- Tools catalogue.

### Phase 4: Core Mutations

- Entrepreneur profile updates.
- Programme access management.
- Programme CRUD/lifecycle.
- Module/content CRUD/reorder.
- Tool CRUD/access/request decisions.
- Periodic updates/fundraising/goals.

### Phase 5: Deliverables

- Programme deliverable rules.
- Deliverable instances.
- Upload flow.
- Review history.
- Unread feedback.
- Trainer review queue.

### Phase 6: Sessions and Calendar

- Calendar OAuth.
- Availability endpoint.
- Session request flow.
- Open team acceptance.
- Google Meet creation.
- Reschedule/completion/notes.
- Notifications.

### Phase 7: Files, Video, and Jobs

- S3 file uploads.
- Mux direct uploads.
- Mux webhooks.
- BullMQ processors.
- Email notifications.

### Phase 8: Reporting and Hardening

- Reporting queries.
- Overdue periodic updates.
- Exports.
- Audit logs.
- Rate limiting.
- Security review.
- Load/performance checks.

## 24. Open Questions

These should be answered before implementation or during Phase 0:

1. Hosting: where will the NestJS API, Postgres, Redis, and object storage run?
2. Auth cookies vs bearer tokens: do we want httpOnly cookie sessions for the web app, bearer tokens, or both?
3. Multi-business users: can one entrepreneur user belong to more than one business in the future?
4. Admin permissions: do all admins have full access at launch, or do we need permission groups immediately?
5. Trainer permissions: can trainers edit any content they own, or only view/review until admins publish changes?
6. File storage provider: AWS S3, Cloudflare R2, DigitalOcean Spaces, or another S3-compatible service?
7. Video playback: signed playback from day one, or public playback IDs for internal pilot?
8. Calendar: can admins also accept sessions, or only trainers with connected calendars? Current UI says admins can too.
9. Reports: do exported reports need branded PDF generation in Phase 1, or can CSV/Excel come first?
10. Data import: will existing entrepreneur/programme data be migrated from a spreadsheet or another system?

## 25. Decision Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-07-10 | Use NestJS for the backend. | The product now needs a dedicated backend with clear modules, services, jobs, auth, files, calendar, and video workflows. |
| 2026-07-10 | Use PostgreSQL with Prisma. | Relational domain, strong migrations, typed access, and good NestJS fit. |
| 2026-07-10 | Own auth in NestJS. | Invitations, roles, verification, reset, Google signup, and future permissions should live near backend policies. |
| 2026-07-10 | Use BullMQ with Redis for jobs. | Reliable local/production queue model with retries, scheduling, and NestJS processors. |
| 2026-07-10 | Use Mux for video. | Training video needs upload, transcoding, adaptive playback, thumbnails, and analytics. |
| 2026-07-10 | Use S3-compatible object storage for non-video files. | Keeps PDFs, deliverables, tools, and exports outside Postgres with signed access. |
| 2026-07-10 | Google Calendar/Meet first, provider-agnostic model. | Current product focuses on Google Meet, but future providers should not require schema redesign. |

## 26. References

- NestJS documentation: https://docs.nestjs.com/
- Prisma documentation: https://www.prisma.io/docs
- BullMQ documentation: https://docs.bullmq.io/
- Mux Video documentation: https://docs.mux.com/guides/video
- Google Calendar API: https://developers.google.com/calendar/api/guides/overview
- Resend documentation: https://resend.com/docs
