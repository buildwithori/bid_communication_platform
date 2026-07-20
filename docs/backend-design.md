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
- Programme access grants are per entrepreneur user, not per business.
- Every entrepreneur automatically has free resource access after signup.
- Free resources are not stored as per-entrepreneur assignments.
- Trainers are not directly assigned to entrepreneurs.
- Trainers are assigned to programme content items/modules.
- An entrepreneur's trainer context is inferred from the content they can access.
- Ratings on content roll up to the trainer attached to that content.
- Programme impact reporting must be attributed explicitly. Do not force unattributed jobs/funding into programme charts.
- Deliverable due dates come from programme deliverable rules and become concrete per entrepreneur/programme context.
- Deliverable instances are linked to the entrepreneur user, not the business record. Business names in review queues are derived through membership.
- Session requests and confirmed sessions are linked to the entrepreneur user, not the business record. Business names in calendars and queues are derived through membership.
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

### Runtime and Local Setup

- Docker for application packaging.
- Docker Compose for local development and production deployment wiring.
- Compose services should include:
  - `web`: Next.js frontend.
  - `api`: NestJS backend.
  - `postgres`: PostgreSQL database.
  - `redis`: BullMQ queue/cache backend.
  - `mailpit`: development email catcher.
  - `pgadmin`: local-only database inspection UI. Do not include it in production Compose.

The frontend and backend must be separate services in the same Compose project. They should communicate through environment-configured service URLs, not hardcoded localhost assumptions.

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
- Secure httpOnly cookie sessions for the web app, backed by server-side hashed session/refresh records.
- Argon2 for password hashing.

Rationale:

- We need business-specific role routing, invitations, email verification, password reset, and future permissions.
- Owning auth in the NestJS backend keeps authorization decisions close to the domain.

### Authorization

- Role-based access first: entrepreneur, trainer, admin.
- Policy-based checks inside services for business rules.
- Capability/permission table can be added later without rewriting every endpoint.

### Files

- DigitalOcean Spaces for non-video file storage.
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

- Resend for transactional email delivery.
- React Email for template rendering and reusable email components. Templates live with their owning feature module; the shared email module owns only reusable brand components, rendering, and transport. The recursive React Email preview server discovers module templates through `npm run email:dev`.
- Mailpit for local development email catching.
- BID email brand system to be created during backend implementation.

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
10. Audit logs are generated by shared lifecycle/audit infrastructure, not manually hand-written in every feature.
11. Never trust client-provided ownership, role, or status transitions.
12. Return API DTOs, not raw database rows.

## 5. Repository Shape

Required monorepo shape:

```text
apps/
  web/              # Next.js frontend
  api/              # NestJS backend
packages/
  shared/           # shared types, constants, API contracts, utilities when stable
prisma/
  schema.prisma
  migrations/
docker-compose.yml
docker-compose.prod.yml
```

Backend implementation should follow this shape from the start. The current frontend should be moved into `apps/web` as part of the backend foundation work, with `apps/api` introduced for NestJS. Do not create a separate root-level `backend/` app.

### Docker Compose Shape

The Compose setup should make the product runnable as a system, not as two unrelated apps.

Maintain two Compose paths:

- `docker-compose.yml`: local development setup.
- `docker-compose.prod.yml`: production setup, or a production override file if we later prefer `docker compose -f docker-compose.yml -f docker-compose.prod.yml`.

```text
services:
  web:
    # Next.js frontend
    depends_on:
      - api
  api:
    # NestJS backend
    depends_on:
      - postgres
      - redis
  postgres:
    # PostgreSQL
  redis:
    # BullMQ Redis
  mailpit:
    # Development email catcher
```

Local Compose rules:

- Mount source code for `web` and `api`.
- Run frontend/backend dev commands with hot reload.
- Include Postgres, Redis, and Mailpit.
- Use developer-safe default credentials in `.env.local` or `.env.docker.local`.
- Expose Mailpit UI for testing verification, reset, invite, and notification emails.

Production Compose rules:

- Use built images for `web` and `api`.
- Do not mount source code.
- Use production commands only.
- Configure restart policies and health checks.
- Use production secrets/environment variables.
- Point file storage to DigitalOcean Spaces.
- Do not run Mailpit in production.

The frontend should receive `NEXT_PUBLIC_API_URL` or an equivalent runtime variable pointing to the API service/public API URL.

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
  -> lifecycle helper emits audit/domain event
  -> audit_outbox row is stored in the same transaction
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
- `businesses`
- `business_memberships`
- `invitations`
- `refresh_tokens`
- `email_verification_tokens`
- `password_reset_tokens`
- `oauth_accounts`

### Role Rules

A user has exactly one active role at a time.

- Entrepreneurs can self-register.
- Entrepreneurs can sign up with Google.
- Admins are invited.
- Trainers are invited.
- Admins/trainers can connect Google Calendar after account creation.
- Role change is not supported for launch. If a person needs a different role, they should be invited/created through the correct role flow.
- Do not model multi-role users for launch.
- Do not create separate `admin_profiles`, `trainer_profiles`, or `entrepreneur_profiles` tables.
- Shared identity/profile fields belong on `users`, including the nullable personal IANA `timezone` preference.
- Role-specific business data belongs in domain tables, not duplicate profile tables.

### Auth Flows

- Email signup captures the browser-detected IANA timezone when available, then creates a user with role `entrepreneur`, creates/links a business through `business_memberships`, collects the required signup fields, and sends a verification email. It does not require onboarding.
- Google signup may redirect to `/auth/onboarding` only when required signup baseline details are missing. Onboarding stores the browser-detected IANA timezone when available. Provider-supplied name/email should prefill the form; onboarding collects the remaining business name, representative name, email, country, and phone fields as needed.
- Dashboard access requires email verification for email signup. For Google signup, dashboard access also requires any onboarding step to be complete.
- Login sets secure httpOnly session cookies.
- Session/refresh rotation should invalidate reused/stolen session records.
- Forgot password creates a short-lived token and sends email.
- Reset password validates token and updates password hash.
- Google auth links by verified email where safe, otherwise creates entrepreneur account.
- Invitations create an invitation token and role intent.
- Accept invitation creates a user with the invited role or completes an invited pending user. It should not create a separate role profile table row.

## 9. Domain Model Draft

This is the first schema plan. Exact Prisma names can change, but the relationships should stay stable.

### Lookup and Company Settings

- `company_settings`
  - periodic_update_overdue_after_days
  - module_completion_deliverable_due_days nullable
  - default_currency
  - default timezone (`Africa/Kigali` for new/seeded settings; administrators may change it)
  - default session provider
  - notification defaults: in-app enabled, email enabled, reminder notifications, weekly digest
- `sectors`
  - name
  - key unique
  - active
- `business_stages`
  - name
  - key unique
  - definition
  - active
- `programme_goal_types`
  - name
  - key unique
  - description nullable
  - requires_target_amount
  - active
- `tool_areas`
  - name
  - key unique
  - active
- `countries` can be static seed data initially

Rules:

- Sectors, stages, goal types, and tool areas are backend-managed lookup data because they drive autocomplete filters and forms.
- Company settings define platform-wide rules. Overdue periodic update logic must read `periodic_update_overdue_after_days`.
- Module-completion deliverable rules need a configurable due window before they can become concrete `deliverable_instances.due_date` values.

### Users and Single Role

- `users`
  - email
  - password_hash nullable for OAuth-only users
  - role: entrepreneur, admin, trainer
  - first_name
  - last_name
  - phone nullable
  - avatar_url nullable
  - status
  - email_verified_at
  - invited_by_id nullable
  - last_login_at nullable

Rules:

- `users.role` is the active role source of truth.
- One user has one role at a time.
- Common profile/contact fields live on `users`.
- Role changes are not supported for launch.
- Avoid role-specific profile tables. Add domain tables only when they represent real business concepts, not duplicate identity fields.

### Entrepreneurs and Businesses

- `businesses`
  - name
  - country
  - sector_id nullable
  - stage_id nullable
  - onboarding_completed_at nullable
  - status
  - source: self_registered, admin_invited
- `business_memberships`
  - user_id
  - business_id
  - relationship: owner, representative
  - is_primary
  - joined_at
- `business_contacts` can come later if multiple contacts are needed.

Rules:

- Entrepreneur user details come from `users`.
- Business details come from `businesses`.
- The relationship between a user and business comes from `business_memberships`.
- One entrepreneur user belongs to one business at launch. Keep `business_memberships` for a clean relational model, but enforce one active business membership per entrepreneur user until a real multi-business workflow exists.
- Do not create an `entrepreneur_profiles` table for duplicate representative fields.
- Entrepreneur dashboard access requires `businesses.onboarding_completed_at`.

### Trainer Capabilities

- `trainer_capabilities`
  - user_id unique
  - role_label: Mentor, Trainer, Guest Expert, Investment Analyst
  - access_level: full, guest
  - access_expires_on nullable
  - status: active, inactive
- `trainer_specialisms`
  - user_id
  - sector_id

Rules:

- Trainer identity/contact fields remain on `users`.
- Trainer capability fields come from the admin trainer create/edit UI and trainer settings.
- Trainers are not assigned directly to entrepreneurs. The trainer's entrepreneur scope is inferred through programme content ownership.
- Trainer workload and learner reach are derived from content ownership, programme access, learner activity, sessions, and deliverable review queues.
- Trainers are read-only across programme, content, entrepreneur, and settings data. Trainer mutations are limited to session workflows and deliverable reviews.

### Programme Operations

- `programmes`
  - name
  - description
  - access_type: free, assigned
  - start_date
  - end_date
  - max_entrepreneurs
  - published_at
  - published_by_id nullable
  - archived_at
  - archived_by_id
  - archive_reason
- `programme_modules`
  - programme_id
  - module_id
  - position
- `programme_access_grants`
  - programme_id
  - entrepreneur_user_id
  - granted_by_id
  - granted_at
  - revoked_at
  - revoke_reason

Rules:

- Free programmes/resources do not need per-entrepreneur grants.
- Assigned programmes use `programme_access_grants` per entrepreneur user.
- Business-level programme views are derived through the entrepreneur users attached to that business, not by granting programmes to the business record.
- Programme lifecycle is derived, not blindly stored as a manual status. The UI `publishState` maps to the initial publishing action.
- `publishState = draft` means the programme is not visible to entrepreneurs and `published_at` is null.
- `publishState = published` sets `published_at`/`published_by_id`. After publication, the visible badge becomes Scheduled, Active, or Completed from the programme dates.
- Published programmes do not move back to draft. Use archive when a programme should leave default operational lists.
- Completed is not manually set. It is derived only when the programme end date has passed.
- Dashboard fields such as enrolled count, learner progress, left entrepreneurs, content count, and readiness are derived from entrepreneur programme access, module/content links, deliverable rules, and learner activity. Do not store them as the primary truth unless we deliberately add reporting snapshots.
- `max_entrepreneurs` is required capacity metadata for the programme. It is not an access-control substitute; actual access still comes from free access or grants.

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
  - source: library, custom
- `content_ratings`
  - content_item_id
  - entrepreneur_user_id
  - trainer_id copied from content item at rating time
  - rating
  - comment
- `learner_content_progress`
  - entrepreneur_user_id
  - programme_id nullable for standalone/free resources outside a programme path
  - module_id nullable for standalone/free resources outside a module path
  - content_item_id
  - status: not_started, in_progress, completed
  - progress_percent
  - last_position_seconds nullable for video
  - duration_seconds nullable snapshot
  - started_at nullable
  - completed_at nullable
  - last_opened_at nullable
  - last_synced_at
  - source: player, explicit_action, system
- `learner_module_progress`
  - entrepreneur_user_id
  - programme_id
  - module_id
  - status: not_started, in_progress, completed
  - progress_percent
  - completed_content_count
  - total_content_count
  - started_at nullable
  - completed_at nullable
  - last_synced_at
- `learner_programme_progress`
  - entrepreneur_user_id
  - programme_id
  - status: not_started, in_progress, completed
  - progress_percent
  - completed_module_count
  - total_module_count
  - completed_content_count
  - total_content_count
  - started_at nullable
  - completed_at nullable
  - last_synced_at

Rules:

- A module can be reused across programmes.
- Reordering must update `position` safely inside a transaction.
- Trainer attribution comes from content item ownership at the time of rating.
- Business-level rating reports are derived through the entrepreneur user's business membership, not stored directly on `content_ratings`.
- Learner progress is tracked only for entrepreneur users. Admins and trainers can read scoped progress summaries, but they do not have learner progress rows.
- Content progress is tracked in the learning context: entrepreneur + programme + module + content item. This matters because modules and content can be reused across programmes.
- Standalone/free resources that are not opened through a programme/module path can use nullable `programme_id` and `module_id`, but programme progress must only aggregate rows with a programme context.
- Module and programme progress are materialized summaries maintained by the progress service, not manually edited fields on `modules` or `programmes`.
- Completing content should update the relevant module/programme summaries in the same transaction or via an idempotent progress aggregation job.
- Module-completion deliverable rules must listen to `learner_module_progress.completed_at`, not a client-only UI flag.
- Video progress should not be written every second. The client should batch/throttle progress and sync only on meaningful changes: start, pause, close/pagehide, ended, or coarse milestones such as 25/50/75/90 percent, with a minimum time/percentage delta between writes.
- PDF and embedded tool progress should not be inferred as completed just because the item was opened. Opening sets `in_progress`; completion requires an explicit learner action or a future tool-specific completion event.
- Progress sync endpoints must be idempotent and accept batched updates so the UI can queue local progress and flush without spamming the backend.
- Backend writes should ignore stale progress events when an older client event arrives after a newer one.
- Content item create UI supports exactly three asset families: video upload, PDF upload, and embedded tool. Video upload creates Mux upload metadata. PDF upload creates a DigitalOcean Spaces `file_asset`. Embedded tool either links to a published entrepreneur tool or stores a custom external URL.
- Content preview should be powered by the content type: Mux playback for video, signed file URL for PDFs, and embedded/sandboxed URL for tools.
- If we need chapter labels later, they should be stored as content item metadata or computed from item order. Current UI labels such as "Chapter 1" must not become hardcoded backend truth.

### Deliverables

- `programme_deliverable_rules`
  - programme_id
  - name
  - due_type: fixed_date, module_completion, recurring
  - due_date nullable
  - due_after_module_id nullable
  - recurring_cadence nullable: monthly, quarterly, six_monthly
  - required_for_scope: all, stage
  - required_stage_id nullable
- `deliverable_instances`
  - rule_id
  - entrepreneur_user_id
  - programme_id
  - due_date
  - period_start nullable
  - period_end nullable
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
- Deliverable instances define what one entrepreneur owes for a programme.
- Due dates in review queues come from concrete `deliverable_instances.due_date`, which is calculated from the programme deliverable rule and the entrepreneur/programme context.
- Business-level display in review queues is derived from the entrepreneur user's business membership, not stored on the deliverable instance.
- Fixed-date rules copy `due_date` directly into each applicable instance.
- Module-completion rules create or activate an instance when the learner completes the configured module; the concrete due date should come from company configuration, for example "due N days after module completion".
- Recurring rules generate instances per reporting cadence and period.
- New recurring periods are calendar-aligned: monthly, calendar-quarterly, or January-June/July-December. Generation starts no earlier than programme/access eligibility, stops at the programme end date, and uses the period end as the concrete due date.
- Recurring generation is database-set-based and idempotent. One-time rules have one instance per rule/entrepreneur/programme; recurring rules have one instance per rule/entrepreneur/programme/period start.
- Legacy recurring instances created before period tracking retain their due date and derive one cadence window backward because their original calendar anchor cannot be recovered safely.
- Reviews are history. Do not overwrite feedback.
- `changes_required` is a status, not just a note.
- Entrepreneurs need unread feedback tracking.
- Trainers can review deliverables in their trainer scope.

### Sessions

Feature 12 uses one durable `sessions` lifecycle aggregate for both requests and confirmed sessions. This avoids duplicate request/session rows and keeps every role on one state machine.

- `sessions`
  - entrepreneur_user_id
  - programme_id nullable
  - created_by_id
  - owner_user_id nullable until accepted
  - target_type: specific_user, open_team
  - target_user_id nullable; a specific target must be an active trainer
  - type: mentor_checkin, office_hours, investor_prep
  - topic and optional notes
  - source: entrepreneur_request, team_created
  - status: requested, confirmed, declined, cancelled, completed
  - starts_at, ends_at, timezone
  - meeting_provider
  - meeting_url nullable
  - calendar_event_id nullable
  - declined_reason, cancelled_reason, completed_at
- `session_request_declines`
  - session_id
  - user_id
  - reason
  - one row per user/request
  - an individual decline from an open-team request opts that user out without closing the request
- `session_reschedules`
  - session_id
  - requested_by_id
  - previous_starts_at
  - previous_ends_at
  - new_starts_at
  - new_ends_at
  - reason
- `session_notes`
  - session_id
  - author_id
  - note
  - visibility: internal, participant
- `calendar_connections`
  - user_id
  - provider
  - provider_account_email
  - encrypted_access_token
  - encrypted_refresh_token
  - scopes
  - status
  - last_synced_at
- `company_settings` session policy
  - session_working_days
  - session_workday_start_minutes
  - session_workday_end_minutes
  - session_slot_interval_minutes
  - default_session_duration_minutes

Rules:

- Session records are linked to the entrepreneur user, not the business record.
- Business names shown in session calendars and queues are derived through the entrepreneur user's primary business membership.
- Specific-trainer availability is computed only from that active trainer's connected calendar.
- Open-team slots are returned only when at least one eligible connected admin/trainer is free.
- Availability combines Google free/busy data with confirmed BID Hub sessions and is rechecked during create, accept, and reschedule.
- Open-team requests remain requested until the first eligible user accepts atomically.
- Only users with a connected supported calendar can own a Google Meet session.
- A real Google Calendar event and Meet link are created during confirmation; placeholder links are never generated.
- Rescheduling updates the same Google event, records immutable previous/new times and reason, and rolls Calendar back if the database transition loses a race.
- Internal notes are never returned to entrepreneurs.

### Tools

- `tools`
  - name
  - description
  - type: pdf, embedded_tool
  - tool_area_id
  - icon_key
  - visibility: all_entrepreneurs, programmes, entrepreneurs
  - status: draft, published, archived
  - pdf_asset_id nullable
  - embedded_url nullable
  - created_by_id
  - updated_by_id nullable
  - published_at nullable
  - archived_at nullable
- `tool_programme_access`
  - tool_id
  - programme_id
- `tool_entrepreneur_access`
  - tool_id
  - entrepreneur_user_id
  - granted_by_id
  - granted_at
- `tool_hidden_entrepreneurs`
  - tool_id
  - entrepreneur_user_id
  - hidden_by_id
  - hidden_at
  - reason nullable
- `tool_requests`
  - entrepreneur_user_id
  - title
  - business_need
  - tool_area_id
  - needed_by nullable
  - status: under_review, in_development, built, declined
  - linked_tool_id nullable
  - admin_decision_note nullable
  - decided_by_id nullable
  - decided_at nullable

Rules:

- Tool area is required when an admin creates a tool. It powers filtering, reporting, and request triage.
- PDF tools use uploaded file assets stored in DigitalOcean Spaces. Do not store PDF URLs entered by admins as the primary source.
- Embedded tools store a validated `embedded_url` and should be rendered in a sandboxed iframe where possible.
- `all_entrepreneurs` tools are visible to every entrepreneur unless that entrepreneur has a hidden override.
- Programme tools are visible to entrepreneurs with access to one of the selected programmes.
- Entrepreneur tools are visible only to selected entrepreneur users.
- Hidden overrides are per entrepreneur user and can remove inherited global or programme tool access for exceptions.
- Tool request records are linked to the entrepreneur user, not the business record. Business context is derived through membership.
- Tool requests do not need `requested_by_id`; the requesting actor is the `entrepreneur_user_id`. If admins later create requests on behalf of entrepreneurs, capture that actor through audit logs instead of duplicating ownership fields.
- When a requested tool is built, link the request to `linked_tool_id` so the entrepreneur can see the admin decision and open the created tool.
- Admin decisions on requests must be visible to the entrepreneur.

### Reporting

- `periodic_updates`
  - entrepreneur_user_id
  - reporting_period_start
  - reporting_period_end
  - submitted_at
  - jobs_total
  - jobs_women
  - jobs_men
  - programme_id nullable when explicitly programme-scoped
  - notes
- `fundraising_rounds`
  - entrepreneur_user_id
  - round_name
  - amount
  - currency
  - date
  - source
  - programme_goal_id nullable
  - programme_id nullable only if explicitly attributed
- `programme_goals`
  - entrepreneur_user_id
  - programme_id nullable depending on goal type scope
  - goal_type_id
  - target_amount nullable
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
- Periodic updates are linked to the entrepreneur user, not the business record. Business-level update history is derived through business membership.
- Periodic updates collect jobs and narrative reporting only. Funding belongs in `fundraising_rounds`, not `periodic_updates`.
- Fundraising rounds are linked to the entrepreneur user, not the business record. Business-level funding history is derived through business membership.
- If attribution is missing, report as company-wide/unattributed, not under a programme.
- Report exports should generate CSV/Excel files in the first backend release. Do not build branded PDF generation yet.

### Notifications and Audit

- `notifications`
  - recipient_user_id
  - category: account, sessions, deliverables, reporting, tools, programmes, system
  - event_type
  - title
  - body
  - entity_type
  - entity_id
  - actor_user_id nullable
  - metadata json
  - read_at
  - created_at
- `notification_preferences`
  - user_id nullable
  - company_default boolean
  - category
  - channel: in_app, email
  - enabled
  - created_at
  - updated_at
- `notification_deliveries`
  - notification_id
  - channel: in_app, email
  - status: pending, sent, failed, skipped
  - provider_message_id nullable
  - error nullable
  - sent_at nullable
  - created_at
- `audit_logs`
  - actor_id
  - action
  - entity_type
  - entity_id
  - before json
  - after json
  - metadata json
  - request_id
  - correlation_id
  - created_at
- `audit_outbox`
  - id
  - actor_id
  - action
  - entity_type
  - entity_id
  - payload json
  - request_id
  - correlation_id
  - status: pending, processed, failed
  - attempts
  - processed_at nullable
  - created_at

Rules:

- Notifications are first-class records, not transient toasts.
- Create one durable notification for a business event, then fan out delivery by channel through jobs.
- Company notification defaults seed the initial preference shape. User-level preferences can override them later.
- Delivery status belongs in `notification_deliveries` so email failures, skipped preferences, and future retries are visible.
- In-app notification UI is shared across roles and should read from the same notification model.
- Email notifications must use React Email templates through Resend in production and Mailpit in development.

Rules:

- Feature services should not manually insert into `audit_logs`.
- Business lifecycle helpers emit audit/domain events inside the same transaction as the business change.
- `audit_outbox` is the durable handoff point.
- A background job processes outbox rows into immutable `audit_logs`.
- If audit processing fails, the business transaction should already be committed and the outbox row can retry safely.
- For sensitive low-level model changes, a Prisma extension or repository hook can emit generic audit events as a safety net, but business lifecycle events remain the preferred source because they capture intent.

## 10. UI Form to Backend Model Reconciliation

Before writing Prisma models or NestJS DTOs for a feature, compare the backend contract against the live UI forms in `lib/forms/schemas.ts` and the corresponding modal/page. Every UI field must be classified as persisted, derived, request-only, or intentionally removed from the UI.

### Settings Forms

Current UI fields:

- sector create/edit: label
- business stage create/edit: label, definition
- goal type create/edit: label, description, requires target amount
- company settings: periodic report overdue threshold in days

Backend mapping:

- Sectors map to `sectors`.
- Business stages map to `business_stages`.
- Goal types map to `programme_goal_types`.
- Company-wide reporting rules map to `company_settings`.
- These settings should feed autocomplete/filter endpoints across admin, trainer, and entrepreneur workspaces.

### Programme Create/Edit

Current UI fields:

- `name` -> `programmes.name`
- `accessType` -> `programmes.access_type`
- `startDate` -> `programmes.start_date`
- `endDate` -> `programmes.end_date`
- `maxEntrepreneurs` -> `programmes.max_entrepreneurs`
- `publishState` -> action-level field with two UI options: `draft` and `published`
- `description` -> `programmes.description`

Derived programme fields:

- status/lifecycle: Draft, Scheduled, Active, Completed, Archived
- enrolled entrepreneur count
- left entrepreneur count
- content asset count
- learner progress
- readiness percentage

These derived values should come from query services, not from manually edited columns.

Publishing behavior:

- Draft is the editable pre-publication state.
- Published is the action selected in the form; it is not the same as the displayed lifecycle badge.
- Published programmes stay published. They are archived when they should leave default operational lists.
- A published programme with a future `start_date` displays as Scheduled.
- A published programme inside its date window displays as Active.
- A published programme with an `end_date` before today displays as Completed.
- Archived overrides every other state and removes the programme from default operational lists.

### Module and Curriculum Management

Current UI fields:

- Create module: `title`, `description`
- Reuse module: `moduleId`
- Reorder modules: target order/position
- Reorder content inside module: target order/position

Backend mapping:

- Module identity lives in `modules`.
- Programme-specific order lives in `programme_modules.position`.
- Content-specific order lives in `module_content_items.position`.
- Reuse is represented by the same `module_id` appearing in multiple `programme_modules` rows.

### Content Item Create/Edit

Current UI fields:

- `title`
- `type`: video, pdf, tool
- `trainerId`
- video upload file name / pending upload reference
- PDF upload file name / pending file asset reference
- `toolSource`: library or custom
- `linkedToolId`
- `toolUrl`

Backend mapping:

- `title`, `type`, and `trainerId` go to `content_items`.
- Video upload state goes to `video_assets` and Mux direct-upload records.
- PDF upload state goes to `file_assets` backed by DigitalOcean Spaces.
- Embedded tool state goes to `content_tool_links`.
- Trainer rating attribution must copy the content item's `trainer_id` into `content_ratings` at rating time.

### Learner Progress

Current UI surfaces:

- training library programme cards: programme progress percentage and next content
- programme detail: module accordions, module progress, content status badges, continue module/content
- module detail: module progress, content list, previous/next navigation, content player
- content player: video playback, PDF preview, embedded tool, next/previous content, content rating
- admin/trainer dashboards: aggregated learner progress and programme coverage

Backend mapping:

- Programme cards and dashboards read from `learner_programme_progress`.
- Module accordions and module detail read from `learner_module_progress`.
- Content badges and resume position read from `learner_content_progress`.
- Content ratings remain separate in `content_ratings`; rating a content item does not automatically mark it completed.

Progress write strategy:

- The UI should use one batched endpoint: `POST /learning/progress/sync`.
- Payload should include the programme/module/content context, client event time, status, percent, optional video position, and source.
- The client should keep a small local queue while the player is open and flush on meaningful moments only:
  - content opened
  - video pause
  - video ended
  - modal close/pagehide
  - coarse video milestones such as 25/50/75/90 percent
  - explicit "mark complete" action for PDF/tool/manual completion
- The backend should upsert progress rows, ignore stale events, clamp percent to 0-100, and recompute affected module/programme summaries.
- The UI should not send progress writes on every video `timeupdate` event.
- Do not write audit log rows for every progress update. Use progress tables and optional aggregate events; only business-significant transitions such as module completion should emit downstream domain events for deliverable rules or notifications.
- When backend work starts, update the player UI to include a clear content-level completion action for PDF/tool content rather than relying only on "Mark module complete".

### Programme Deliverable Rule

Current UI fields:

- `name`
- `dueType`: fixed-date, module-completion, recurring
- `dueDate`
- `moduleRule`
- `recurringCadence`
- `requiredFor`

Backend mapping:

- `name` -> `programme_deliverable_rules.name`
- `dueType` -> `programme_deliverable_rules.due_type`
- `dueDate` -> `programme_deliverable_rules.due_date`
- `moduleRule` -> `programme_deliverable_rules.due_after_module_id`
- `recurringCadence` -> `programme_deliverable_rules.recurring_cadence`
- `requiredFor` -> `required_for_scope` plus a stage/segment reference when not all entrepreneurs

Review queues must not invent due dates. They read from generated `deliverable_instances.due_date`.

### Admin Entrepreneur Create/Edit and Onboarding

Current UI fields:

- business name
- representative name
- email
- phone
- country
- sector in admin/profile forms
- stage in admin/profile forms
- initial goal type and optional amount during admin create
- initial programme during admin create
- onboarding: business name, representative name, email, country, phone

Backend mapping:

- Shared representative identity/contact fields go to `users`.
- Business fields go to `businesses`.
- The user-to-business relationship goes to `business_memberships`.
- Goal fields create `programme_goals` linked to the entrepreneur user, not columns on `businesses`.
- Initial programme creates `programme_access_grants` for the entrepreneur user only when a programme is selected.
- Email signup writes the required baseline fields during signup. Google onboarding writes any missing signup baseline fields and sets `businesses.onboarding_completed_at`.

### Trainer/Admin Invite and Settings

Current UI fields:

- invite/create: first name, last name, email
- trainer capability fields: role label, access level, access expiry, specialisms
- settings: limited profile details and Google Calendar connection

Backend mapping:

- Identity fields go to `users`.
- Trainer capability data should live in trainer domain tables such as `trainer_capabilities` and `trainer_specialisms`, not in a duplicate profile table.
- Calendar OAuth state lives in `calendar_connections` for admins and trainers.

### Reporting, Funding, and Goals

Current UI fields:

- funding round: name, amount, date, source, optional programme, optional goal
- periodic update: programme scope, period start/end, jobs by gender, notes
- programme goal: optional programme depending on goal type, goal type, optional target amount, description, milestone-achieved flag

Backend mapping:

- Funds by programme are only valid when `fundraising_rounds.programme_id` or linked `programme_goal.programme_id` exists.
- Jobs by programme are only valid when `periodic_updates.programme_id` exists.
- Periodic updates are linked to `entrepreneur_user_id`; business display/reporting is derived through membership.
- Company-wide/unattributed records must stay company-wide in analytics.

### Sessions and Tools

Current UI fields:

- booking/session: session type, target recipient, trainer/team target, topic, date, time, notes
- admin session create/reschedule: owner, entrepreneur, session type, topic, date/time, reschedule reason, notes
- tool: name, description, type, tool area, icon, visibility/audience, PDF upload or embedded tool URL
- tool request: name, category/tool area, optional needed-by date, business need/reason, admin decision state

Backend mapping:

- Requests and confirmed meetings share one durable session lifecycle aggregate so every role reads the same state and no request/session reconciliation is required.
- Sessions store `entrepreneur_user_id`; business display/reporting is derived through the entrepreneur user's business membership.
- Google Meet links and Calendar event IDs are created only after ownership confirmation.
- Tool visibility uses global, programme, and entrepreneur-level access/hidden-override tables. Do not store a giant selected-audience array on `tools`.
- Tool request admin decisions are persisted and visible to the entrepreneur.

### Tool Runtime Contract

- GET /tools is restricted to admins and entrepreneurs. Admin responses include management audience metadata; entrepreneur responses contain only usable tool data and redact creator emails and other audience IDs.
- Tool lists use cursor pagination with backend search, type, tool area, status, and visibility filters. Backend totals and status/visibility aggregates drive the admin metrics.
- PDF tools attach a verified private tool_pdf file asset. A PDF cannot publish without an asset. Embedded tools cannot publish without a valid URL.
- Programme and entrepreneur audiences are normalized through access tables. Global/programme tools may also store per-entrepreneur hidden overrides.
- Tool create, update, status, visibility, and access changes use the audit outbox lifecycle.
- Tool request reads are restricted to admins and the owning entrepreneur. Request queues use cursor pagination, backend search/filtering, total counts, and status aggregates.
- Request transitions are under_review -> in_development | built | declined, in_development -> under_review | built | declined, and built | declined -> under_review.
- Declining requires a decision note. Marking Built requires a linked published, non-archived library tool. The API returns only valid next transitions and the UI renders actions from that response.

## 11. State Machines

### Programme Lifecycle

```text
Draft -> Scheduled -> Active -> Completed -> Archived
Draft -> Archived
Scheduled -> Archived
Active -> Archived
Completed -> Archived
Archived -> previous derived state (restore)
```

Derived order:

1. `archived_at` means Archived.
2. no `published_at` means Draft.
3. future `start_date` means Scheduled.
4. passed `end_date` means Completed.
5. otherwise Active.

Rules:

- Completed is a timeline state only. Do not create a manual `completed_at` field for programmes.
- If a completed programme needs to become active again, the admin edits the programme end date into the future.
- Published programmes do not move back to draft. Archive them when they should leave default operations.

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

### Session Lifecycle

```text
Requested -> Confirmed -> Completed
Requested (specific trainer) -> Declined
Requested -> Cancelled
Confirmed -> Cancelled
Confirmed --reschedule event--> Confirmed
Requested (open team) --member opt-out--> Requested
```

A specific-trainer request is visible and actionable only to that trainer. An open-team request remains `requested` until the first eligible connected admin/trainer accepts it atomically; an individual opt-out does not change the shared request status. Rescheduling is immutable history, not a temporary session status.

## 12. API Design

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

Settings and lookup data:

- `GET /settings/company`
- `PATCH /settings/company`
- `GET /settings/sectors`
- `POST /settings/sectors`
- `PATCH /settings/sectors/:id`
- `GET /settings/business-stages`
- `POST /settings/business-stages`
- `PATCH /settings/business-stages/:id`
- `GET /settings/programme-goal-types`
- `POST /settings/programme-goal-types`
- `PATCH /settings/programme-goal-types/:id`
- `GET /settings/tool-areas`
- `POST /settings/tool-areas`
- `PATCH /settings/tool-areas/:id`

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
- `GET /learning/progress`
- `GET /programmes/:id/learning-progress`
- `POST /learning/progress/sync`

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
- `GET /sessions/:id`
- `GET /sessions/team-members`
- `GET /sessions/availability`
- `POST /sessions`
- `POST /sessions/:id/accept`
- `POST /sessions/:id/decline`
- `POST /sessions/:id/cancel`
- `PATCH /sessions/:id/reschedule`
- `POST /sessions/:id/complete`
- `POST /sessions/:id/notes`

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

## 13. Search, Filtering, and Pagination

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

## 14. Storage Design

DigitalOcean Spaces is the chosen non-video storage provider. It is S3-compatible, so backend storage code should use an adapter that can speak S3 APIs while naming the provider clearly in config.

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
- Use DigitalOcean Spaces bucket/key naming conventions that separate environments, entity types, and owners.
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

## 15. Video Design

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

Use private/signed Mux playback from day one. Training content is restricted to authorised entrepreneurs, so public playback IDs should not be the default.

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

## 16. Background Jobs

### Queues

- `emails`
- `notifications`
- `sessions`
- `calendar-sync`
- `deliverables`
- `periodic-updates`
- `reports`
- `video`
- `learning-progress`

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
- Learner progress aggregation repair job for any stale module/programme summaries.

## 17. Calendar and Meeting Design

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
- Company working days and working-hour bounds are interpreted in `company_settings.default_timezone`.
- Availability is returned in the requesting user’s effective timezone: personal user timezone, then company default, then `Africa/Kigali` as the defensive platform fallback.
- Each session stores the effective timezone as a historical snapshot for calendar creation and display.

### Meeting Link Creation

- Confirmed Google Meet sessions should be backed by a Google Calendar event.
- Store provider, event ID, meeting URL, and owner.
- Reschedule updates the calendar event.
- Cancel/decline cancels or marks the event based on state.

## 18. Email and Notification Design

Use in-app notifications for immediate product context and email for important external prompts.

Notifications should be a full system:

- one notification record per meaningful business event
- role-neutral categories that work across admin, trainer, and entrepreneur workspaces
- read/unread state per recipient
- actor and entity references so the UI can link to the right business object
- per-channel delivery records for in-app and email fanout
- company defaults plus per-event user overrides exposed through role-scoped preference groups
- atomic grouped preference updates with explicit mixed-channel state
- BullMQ jobs for delivery, reminders, retries, and weekly digests

Email delivery stack:

- Production delivery: Resend.
- Template system: React Email.
- Development inbox: Mailpit running as a Docker Compose service.

We do not currently have final email designs, so backend implementation must create a clean BID email brand system. This should include:

- shared branded layout
- BID logo/header treatment
- consistent typography and spacing
- primary CTA button component
- secondary text/link component
- footer with support/contact/legal-safe text
- preview text conventions
- reusable components for details cards, status badges, and action summaries

Email templates should be treated as product surfaces, not raw text dumps.

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

Initial React Email templates:

- email verification
- password reset
- entrepreneur signup welcome
- admin invitation
- trainer invitation
- session requested
- session confirmed
- session declined
- session rescheduled
- session reminder
- deliverable submitted
- deliverable feedback received
- deliverable changes requested
- tool request decision
- periodic update reminder
- report export ready

## 19. Authorization Details

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

## 20. Audit Architecture

Audit logging must be automatic at the right business lifecycle points. We do not want every service developer manually creating audit rows.

### Audit Flow

```text
Controller
  -> service
  -> lifecycle/workflow helper
  -> transaction starts
  -> business record changes
  -> audit/domain event is added to audit_outbox in the same transaction
  -> transaction commits
  -> BullMQ audit processor reads pending outbox events
  -> immutable audit_logs row is created
  -> outbox row is marked processed
```

### Audit Event Sources

Preferred sources:

- workflow services: session accept/decline/reschedule/complete
- lifecycle services: programme publish/archive/restore
- review services: deliverable review/change request/approval
- access services: programme access grants/revokes, tool access changes
- settings services: company settings, sectors, stages, goal types
- identity services: invitations and calendar connection changes

Safety-net sources:

- Prisma extension or repository hook for selected sensitive model updates.
- This should capture generic before/after diffs when a model changes outside a named lifecycle helper.
- The safety net is not a replacement for business events, because raw diffs do not explain intent.

### Implementation Rules

- Feature code should call the right workflow/lifecycle method, not `auditLogs.create`.
- `audit_logs` should be append-only.
- `audit_outbox` events should be idempotent and retryable.
- Each event should include actor, action, entity, request ID, correlation ID, before/after summary, and business metadata.
- If audit processing fails, it should not roll back the already-committed business action; the outbox row retries.
- Admin-facing audit screens should read from `audit_logs`, not from mutable operational tables.
- Avoid logging secrets, tokens, passwords, signed URLs, OAuth tokens, or raw uploaded file contents.

### Actions That Must Be Audited

- user invitation accepted/revoked
- role/profile access changes
- programme publish/archive/restore
- programme access grant/revoke
- module/content create/update/reorder/archive
- trainer ownership changes on content
- deliverable rule changes
- deliverable review decisions
- due date overrides
- tool create/publish/archive and access changes
- tool request decision changes
- session accept/decline/reschedule/complete
- calendar connect/disconnect
- company setting changes

## 21. Error Handling

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

## 22. Observability

Minimum production setup:

- structured JSON logging with request and correlation IDs
- query-free inbound request lifecycle logs for received, completed, aborted, and failed requests
- sanitized outbound-integration lifecycle logs for Google, Mux, email, and object storage
- Sentry for backend exceptions
- health endpoint
- readiness endpoint
- queue dashboard or admin observability for BullMQ
- provider webhook logs after signature and payload validation
- audit log table for business actions
- audit outbox backlog and failures

Track:

- API error rate
- auth failures
- upload failures
- Mux webhook failures
- calendar sync failures
- job retry/dead-letter counts
- email send failures
- audit outbox failures

## 23. Environment Variables

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
EMAIL_TRANSPORT=
MAILPIT_SMTP_HOST=
MAILPIT_SMTP_PORT=
DO_SPACES_ENDPOINT=
DO_SPACES_REGION=
DO_SPACES_BUCKET=
DO_SPACES_ACCESS_KEY_ID=
DO_SPACES_SECRET_ACCESS_KEY=
DO_SPACES_CDN_URL=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
ENCRYPTION_KEY=
SENTRY_DSN=
```

## 24. Testing Strategy

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
- audit outbox processing and retries

### Audit Tests

- lifecycle helpers emit audit outbox events in the same transaction as business changes
- failed business transactions do not leave audit outbox rows behind
- audit processor creates immutable audit logs idempotently
- sensitive values are redacted from audit payloads
- safety-net model audit does not duplicate explicit business lifecycle events

### Contract Tests

The frontend depends on stable DTOs. Add OpenAPI generation and consider generated frontend API types once core endpoints settle.

## 25. Backend Implementation Phases

### Phase 0: Planning Lock

- Confirm stack.
- Confirm monorepo migration steps for `apps/web`, `apps/api`, `packages/shared`, and root `prisma`.
- Confirm auth ownership.
- Confirm local and production Docker Compose layout for `web`, `api`, `postgres`, and `redis`.
- Confirm DigitalOcean deployment shape and Spaces bucket strategy.

### Phase 1: NestJS Foundation

- Move current Next.js frontend into `apps/web`.
- Create `apps/api` for the NestJS backend.
- Create `packages/shared` for stable shared contracts/types/utilities.
- Create root `prisma` for schema and migrations.
- Add Dockerfiles for frontend and API.
- Add local Docker Compose services for frontend, API, Postgres, Redis, and Mailpit.
- Add production Docker Compose file/override for built frontend/API images, production environment, restart policies, and health checks.
- Scaffold NestJS app.
- Add config validation.
- Add Prisma/Postgres.
- Add global validation pipe.
- Add global exception filter.
- Add logging/request ID.
- Add audit context, audit outbox table, and audit processor foundation.
- Add health endpoints.
- Add OpenAPI setup.

### Phase 2: Identity and Access

- Users with one active role.
- Business memberships for entrepreneur-business relationships.
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
- Ensure lifecycle/workflow services emit audit events automatically.

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

- DigitalOcean Spaces file uploads.
- Mux direct uploads.
- Mux webhooks.
- BullMQ processors.
- Email notifications.
- React Email branded template system.
- Mailpit development email flow.

### Phase 8: Reporting and Hardening

- Reporting queries.
- Overdue periodic updates.
- Exports.
- Audit logs.
- Audit outbox monitoring and retry visibility.
- Rate limiting.
- Security review.
- Load/performance checks.

## 26. Resolved Planning Decisions

These decisions remove the remaining backend ambiguity before implementation:

1. Hosting topology: the first production deploy will run the frontend, API, Postgres, Redis, workers, and supporting services through Docker Compose on one DigitalOcean Droplet.
2. Auth sessions: the web app will use secure httpOnly cookie sessions. Do not use client-managed bearer tokens for normal browser authentication.
3. Multi-business users: not supported for launch. One entrepreneur user belongs to one business.
4. Admin permissions: all admins have full access at launch. Keep the model extensible, but do not build permission groups now.
5. Trainer permissions: trainers are mostly read-only. Trainers can act on sessions and deliverable reviews; content, programme, entrepreneur, and settings management stays admin-owned unless explicitly opened later.
6. Video playback: use signed Mux playback from day one because training content is restricted to authorised entrepreneurs.
7. Calendar ownership: admins can accept/own sessions as long as they have the required Google Calendar connection.
8. Report exports: CSV/Excel exports are enough for the first backend release. Branded PDF reports can come later.
9. Data import: no spreadsheet or legacy-system import is required for launch.

## 27. Decision Log

| Date       | Decision                                                                                    | Rationale                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-10 | Use NestJS for the backend.                                                                 | The product now needs a dedicated backend with clear modules, services, jobs, auth, files, calendar, and video workflows.                                                                                                            |
| 2026-07-11 | Use the recommended monorepo shape.                                                         | Backend work should organize the repo into `apps/web`, `apps/api`, `packages/shared`, and root `prisma` instead of adding a root-level `backend/` app.                                                                               |
| 2026-07-10 | Use PostgreSQL with Prisma.                                                                 | Relational domain, strong migrations, typed access, and good NestJS fit.                                                                                                                                                             |
| 2026-07-10 | Own auth in NestJS.                                                                         | Invitations, roles, verification, reset, Google signup, and future permissions should live near backend policies.                                                                                                                    |
| 2026-07-11 | Users have one active role, no role changes at launch, and no role-specific profile tables. | Keeps auth/routing simple and avoids duplicate `admin_profiles`, `trainer_profiles`, and `entrepreneur_profiles` tables. Users must be created/invited through the correct role flow; business-specific data lives in domain tables. |
| 2026-07-10 | Use BullMQ with Redis for jobs.                                                             | Reliable local/production queue model with retries, scheduling, and NestJS processors.                                                                                                                                               |
| 2026-07-10 | Use Mux for video.                                                                          | Training video needs upload, transcoding, adaptive playback, thumbnails, and analytics.                                                                                                                                              |
| 2026-07-11 | Use separate local and production Docker Compose setup.                                     | Local Compose supports development with Mailpit and hot reload; production Compose uses built frontend/API images, production env, restart policies, and health checks.                                                              |
| 2026-07-11 | Use DigitalOcean Spaces for non-video files.                                                | Deployment target is DigitalOcean, and Spaces provides S3-compatible storage for PDFs, deliverables, tools, and exports.                                                                                                             |
| 2026-07-11 | Use Resend with React Email and Mailpit.                                                    | Resend handles production delivery, React Email gives reusable branded templates, and Mailpit catches local development email.                                                                                                       |
| 2026-07-10 | Google Calendar/Meet first, provider-agnostic model.                                        | Current product focuses on Google Meet, but future providers should not require schema redesign.                                                                                                                                     |
| 2026-07-12 | Run the first production deployment on one DigitalOcean Droplet with Docker Compose.        | The initial operations model should stay simple: frontend, API, database, Redis, workers, and supporting services run as separate Compose services on one server.                                                                    |
| 2026-07-12 | Use httpOnly cookie sessions for browser auth.                                              | Keeps tokens out of client JavaScript and fits the web-first app.                                                                                                                                                                    |
| 2026-07-12 | Do not support multi-business entrepreneur users at launch.                                 | The product flow treats one entrepreneur account as belonging to one business; business switching would add complexity without a current requirement.                                                                                |
| 2026-07-12 | Give admins full access at launch.                                                          | Permission groups can be designed later; current admin workflows need broad operational access.                                                                                                                                      |
| 2026-07-12 | Keep trainers read-only except sessions and deliverable reviews.                            | Trainers support learning and feedback, but admins remain the owners of programme, content, entrepreneur, and settings management.                                                                                                   |
| 2026-07-12 | Use signed Mux playback from day one.                                                       | Training content is restricted, so private playback is the safer default.                                                                                                                                                            |
| 2026-07-12 | Allow admins to accept and own sessions.                                                    | Admins may handle open BID team requests when their Google Calendar connection is available.                                                                                                                                         |
| 2026-07-12 | Start reporting exports with CSV/Excel only.                                                | This covers operational needs without adding branded PDF generation to the first backend release.                                                                                                                                    |
| 2026-07-12 | Do not build data import for launch.                                                        | There is no current migration/import requirement, so implementation should focus on first-class product workflows.                                                                                                                   |

## 28. References

- NestJS documentation: https://docs.nestjs.com/
- Prisma documentation: https://www.prisma.io/docs
- BullMQ documentation: https://docs.bullmq.io/
- Docker Compose documentation: https://docs.docker.com/compose/
- DigitalOcean Spaces documentation: https://docs.digitalocean.com/products/spaces/
- Mux Video documentation: https://docs.mux.com/guides/video
- Google Calendar API: https://developers.google.com/calendar/api/guides/overview
- Resend documentation: https://resend.com/docs
- React Email documentation: https://react.email/docs
- Mailpit documentation: https://mailpit.axllent.org/
