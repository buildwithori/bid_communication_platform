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
- Compose services: Next.js frontend, NestJS HTTP API, a separate NestJS BullMQ worker, PostgreSQL, internal-only Redis, Mailpit for development email catching, and supporting local tooling.
- File storage: DigitalOcean Spaces for PDFs, deliverables, images, downloadable tool files, and report exports.
- Background jobs: BullMQ with Redis.
- Video platform: Mux Video.
- Video player: `@mux/mux-player-react`.
- Email: Resend for delivery, React Email for templates/components, and Mailpit as the local development email catcher. Each feature module owns its email templates and a small module-specific email orchestrator; the global email infrastructure service only renders and delivers generic messages. Run `npm run email:dev` to preview all module-owned templates on port 3001.
- Calendar provider: Google Calendar first, but keep session fields provider-agnostic.
- First production deployment runs all Compose services on one DigitalOcean Droplet.
- Browser auth uses secure httpOnly cookie sessions backed by server-side hashed session/refresh records; do not use client-managed bearer tokens for normal web auth.
- Use signed Mux playback from day one.
- Report exports are CSV/Excel first; branded PDF generation can come later.
- No spreadsheet/legacy data import for launch.

NestJS is now the backend direction. Do not design new backend work around Next.js route handlers.

Repository shape is a required monorepo:

- `apps/web` for the Next.js frontend.
- `apps/api` for the NestJS backend.
- `packages/shared` for stable shared contracts/types/utilities.
- root `prisma` for schema and migrations.

Do not create a separate root-level `backend/` app.

Frontend and backend should run as separate Docker Compose services. The frontend should call the API service through environment-configured URLs, not hardcoded localhost assumptions.

As backend work begins, keep the UI and backend in conversation. If the real data model exposes missing, misleading, or incomplete UI, update the UI as part of the implementation. Ask focused questions when a business rule is genuinely unclear instead of guessing.

Backend/frontend integration must happen one complete business feature at a time. Do not broadly replace mock UI with partial API wiring across many pages. Preserve the existing UI, wire the feature being built, and leave unrelated screens on their current mock/store flow until their feature slice is started.

Default seed data should be minimal: one admin user, one trainer user, one entrepreneur user, and essential company/settings lookup data. Do not keep adding entity-heavy seed data for every feature; use local scripts, API requests, or temporary commands when endpoint testing needs records.

Maintain both local and production Docker setup:

- Local: `docker-compose.yml` for development, source mounts, hot reload, Postgres, Redis, Mailpit, and developer-friendly defaults.
- Production: `docker-compose.prod.yml` or a production override for built images, no source mounts, production commands, restart policies, health checks, and production environment variables.

Email templates should be built as a reusable BID email brand system with React Email. Even if final email designs are not provided, the backend implementation should define consistent branded layouts, typography, footer/legal text, CTA buttons, and reusable templates for auth, invitations, sessions, deliverables, tools, and reporting.

## Standing Backend Rules

- Keep backend concerns out of React components.
- Every mutation must have server-side validation.
- Product API endpoints are authenticated by default. Only explicit auth/bootstrap/health endpoints may be public, and any public exception must be intentional and documented. Role guards are added on top only where a role-specific permission is required.
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
- Do not delete business records casually. Prefer soft delete or status transitions for important records. Permanent programme, module, and content deletion is the explicit admin-only exception: require exact-name confirmation, use a transactional dependency-aware deletion service, preserve assets still referenced elsewhere, audit the action, and queue external provider cleanup durably. Removing a reused module from one programme preserves it; deleting its final programme link deletes the module and its exclusively owned content.
- Design every list endpoint for search, filters, sorting, pagination, and future backend-backed tables.
- Design every autocomplete/lookup endpoint for scale too. No hidden hard caps. Use cursor pagination or infinite-scroll friendly pagination, and return enough metadata for the UI to request the next page.
- Use cursor pagination for large or growing datasets. Offset pagination is acceptable only for small lookup data, and only when it still exposes explicit page size/page metadata.
- Push filtering, searching, counts, dashboard metrics, reporting summaries, and business aggregations into database-backed query services. The frontend should not fetch large datasets and compute aggregates in React.
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
- Learning content: modules, content items, trainers attached to content, ratings, programme module order, learner progress.
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

Admins have full access at launch. Do not build permission groups now, but avoid designing admin code in a way that blocks future permissions.

Initial access rules:

- Entrepreneurs can read and update only their own business profile and submitted data.
- One entrepreneur user belongs to one business at launch.
- Entrepreneurs automatically get free resource access after signup.
- Entrepreneurs can read programmes/content they have access to through programme content access.
- Entrepreneurs can submit deliverables for their own business.
- Trainers can read entrepreneurs inferred from the programme content they own.
- Trainers can review deliverables attached to programmes/content in their trainer scope.
- Trainers can act on sessions in their scope.
- Trainers are read-only for programme, content, entrepreneur, and settings management.
- Trainers are not directly assigned to entrepreneurs.
- Admins can manage operational data across the platform.

## Critical Business Rules

- Trainer scope is inferred from content ownership, not direct entrepreneur assignment.
- Content ratings roll up to the trainer attached to that content item and are stored per entrepreneur/programme/module/content placement, so reused assets do not share a learner rating across contexts.
- Learner progress is tracked only for entrepreneur users. Track content progress in programme/module/content context and maintain module/programme summaries server-side. Video clients keep user-scoped local recovery checkpoints about every four seconds, send coalesced server checkpoints about every twenty seconds, and use keepalive flushes for pause/navigation/page lifecycle events. Reconcile local data against `lastSyncedAt`; server completion wins, while a newer local unfinished position may resume. Progress sync is newest-event-wins, bounds position/duration to 24 hours, permits an explicit rewind, and skips aggregate recomputation for position-only updates; status or quantized percentage changes recompute summaries.
- Materialized learner module/programme progress is curriculum-aware. Module/content attachment, module reuse, content/module deletion, and video ready/failed transitions reconcile all affected tracked learners. New ready learning work clears stale completion and lowers the aggregate until completed; a timestamp-gated player read repairs summaries written before this invariant without recomputing on every request.
- `GET /programmes/:id/player` is the authenticated, role-scoped course-player contract. It returns the complete ordered module/content tree without pagination because the curriculum is one bounded programme document. Entrepreneurs receive ready content plus their contextual progress; trainers receive ready content without learner progress; only admins may preview processing, failed, or otherwise non-ready content.
- Programme-module summaries expose `processingContentCount` and a four-state readiness value: `needs_content` for an empty module, `processing` while any item is processing, `ready` only when every linked item is ready, and `needs_attention` when content exists but is draft, failed, archived, or otherwise unavailable.
- Programme access is many-to-many. An entrepreneur can have zero, one, or many programme access grants, plus automatic free resources.
- Programme access grants are per entrepreneur user, not per business. Business-level programme context is derived through the entrepreneur users attached to the business.
- Free resources are globally available and should not be stored as per-entrepreneur assignments.
- Regular email entrepreneur signup collects the required signup baseline and does not require onboarding. Google entrepreneur signup uses `/auth/onboarding` only when provider data is missing required baseline details. Google onboarding should collect or confirm business name, representative name, email, country, and phone, with provider name/email prefilled when available.
- Admin-managed lookup data such as sectors, business stages, programme goal types, and tool areas must be backend models because they power autocomplete filters and form options across roles.
- Entrepreneur tools require `tool_area_id`, icon key, visibility, status, and either a DigitalOcean Spaces PDF asset or an embedded tool URL. Tool access is global, programme-based, or entrepreneur-specific, with per-entrepreneur hidden overrides for exceptions.
- Tool requests link to `entrepreneur_user_id` only; do not add a duplicate `requested_by_id` unless a future proxy workflow needs actor tracking, and then use audit logs for that actor.
- Programme lifecycle is derived from dates and archive fields: draft, scheduled, active, completed, archived. Completed is derived from `end_date`; do not add manual programme completion fields.
- Programme create/edit must persist the current UI fields, including `max_entrepreneurs`. UI `publishState` maps to the initial publish action, not to publish/unpublish workflow fields or a loose status column.
- Archived programmes are hidden from default operational lists and become read-only unless restored.
- Deliverable due dates come from programme deliverable rules, then become concrete `deliverable_instances.due_date` values per entrepreneur/programme submission context. Review queues must read due dates from instances, not invent them.
- Fixed-date deliverable rules accept today or a future date only. The API compares date-only values in the acting admin's timezone and falls back to `Africa/Kigali`; frontend calendar disabling is complementary validation, not the security boundary.
- Session availability rejects date windows beginning before today in the authenticated viewer's effective timezone. Session creation and rescheduling independently reject start instants that have already passed; frontend calendar disabling is complementary UX, not the enforcement boundary.
- Recurring deliverables use nullable `deliverable_instances.period_start`/`period_end`. New periods are calendar-aligned, begin no earlier than programme/access eligibility, end no later than the programme end date, and are unique per rule/entrepreneur/programme/period. Generation must remain set-based and idempotent.
- Deliverable instances link to `entrepreneur_user_id`, not `business_id`. Business context for display/reporting is derived through business membership.
- Programme goals link to `entrepreneur_user_id`, not `business_id`, and should not include `target_date` unless a real deadline workflow is designed.
- Fundraising rounds link to `entrepreneur_user_id`, not `business_id`. Business funding history/reporting is derived through business membership.
- Periodic updates link to `entrepreneur_user_id`, not `business_id`, and should not include funds mobilised; funding belongs in fundraising rounds.
- Periodic update overdue status comes from company configuration, not a manually maintained list.
- Impact reporting needs attribution: jobs/funds should only be charted by programme when the source record is programme-scoped or explicitly attributed.
- Sessions can be specific-person requests or open BID team requests. The first eligible admin/trainer who accepts an open request owns it.
- Session requests and confirmed sessions link to `entrepreneur_user_id`, not `business_id`. Business context for display/reporting is derived through business membership.
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
- For dashboard cards and charts, prefer dedicated aggregate endpoints or query-service methods that return exactly the shaped metrics the UI needs, with clear filters and authorization scope.

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

Jobs must be idempotent. Store job records or idempotency keys when a job can be triggered more than once. Notification automation uses a dedicated BullMQ queue, cursor-paged database scans, user-timezone digest windows, and unique durable dedupe keys. Nullable user preferences inherit current company channel and reminder/digest defaults; explicit user choices override them. Scheduled generation and per-event channel delivery are separate gates and both must allow a notice.

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

## Email Brand And Preview Runtime (2026-07-15)

- Feature modules own their email templates; shared email infrastructure only renders and delivers the supplied React element.
- Auth email templates share `email/components/bid-action-email.tsx`, using the canonical web palette (`#842751`, `#5c1a38`, `#f5e8ef`, `#f7f6f3`, `#f1efe8`) and the public `/bid-logo.png` asset.
- `AuthEmailService` builds an absolute logo URL from `APP_WEB_URL`, which is required because email clients cannot resolve application-relative image URLs.
- Keep the API/email runtime on React 18 while the React Email 6.8 renderer is React 18-based. The Next.js web runtime independently uses React 19; TypeScript packages use React 19 definitions consistently across the monorepo to avoid duplicate ReactNode identities.
- Docker email preview remains available at `http://localhost:3001`; Mailpit remains at `http://localhost:8025`. Every template must include complete default preview props so preview/export output never contains missing names, actions, or logo URLs.

## Auth Completion And Docker Build Isolation (2026-07-15)

- Logout is an explicit public auth entry point so it can always expire an invalid or stale browser cookie; valid tokens are revoked when present.
- Google OAuth mode is stored with state and enforced in the callback. Unknown identities cannot be created by login, OAuth failures return to the matching branded auth page, and onboarding endpoints reject non-entrepreneur roles.
- Local Nest watch output uses `apps/api/tsconfig.docker.json` and the Compose `api_build` named volume at `apps/api/.docker`. Host production builds continue using `apps/api/dist`, preventing Docker from creating root-owned host build artifacts.

## File And Video Infrastructure Completion (2026-07-15)

- `files` owns presigned private object writes/reads, upload ownership and usage, provider metadata verification, file-signature validation, and audited ready transitions. Local Docker uses private MinIO; production uses DigitalOcean Spaces.
- Provider credentials, storage keys, private URLs, and raw Mux identifiers never enter UI forms. Content creation attaches only internal `fileAssetId` or `videoAssetId` values.
- `video` owns Mux direct uploads, cancellation, status polling, webhook transitions, and signed playback. The only public video route is `POST /webhooks/mux`; all upload and playback routes remain authenticated.
- Mux callbacks require HMAC verification against the exact raw body, enforce a five-minute replay window, and record event IDs transactionally so duplicate deliveries are safe.
- Ready/errored events update both `video_assets` and attached `content_items`. Signed-policy playback IDs remain backend metadata; authorized clients receive short-lived RS256 playback tokens.
- A dedicated BullMQ reconciliation scheduler checks only stale pending/processing video rows at a bounded interval. It retrieves direct-upload state until an asset exists, then retrieves asset state to recover missed webhook transitions. Provider errors, upload timeouts, missing assets, and records that cannot be verified within the configured processing timeout become terminal `failed` rows with an administrator-facing retry/delete reason.

## Entrepreneur Tools Completion (2026-07-16)

- Feature 11 is complete. Tools use scalable authenticated catalogue APIs, backend filters/counts, private PDF assets or embedded URLs, normalized global/programme/entrepreneur audiences, and per-entrepreneur hidden overrides.
- Admin tool management uses feature-sliced frontend hooks, lazy paginated tool-area/programme/entrepreneur selectors, protected direct uploads, backend aggregate cards, tailored skeletons, guarded async actions, and automatic lifecycle audit events.
- Entrepreneur tool reads are effective-access scoped and redact admin creator metadata and other audience identities. Trainers are explicitly forbidden from tool catalogue and request endpoints.
- Tool requests belong to the entrepreneur user. Queues use cursor pagination and backend status aggregates. Declines require a decision note; Built requires a linked published library tool; the backend returns valid next transitions. Marking a request Built clears its active decision note, preserves the previous note in the audit payload, and sends the entrepreneur a completion update centred on the available resource rather than a stale development note.

## Session Calendar Runtime (2026-07-16)

- `CalendarService` owns encrypted Google OAuth credentials, free/busy reads, event insert/patch/delete, refreshed access-token persistence, and asynchronous Meet conference readiness polling.
- `SessionAvailabilityService` combines Google busy intervals with confirmed local sessions. Availability windows are explicitly limited to 14 calendar days per request and support date-window infinite loading without hidden dataset caps.
- Email signup and Google onboarding capture the browser-detected IANA timezone when available; users can change it later from profile settings. Browser detection falls back to `Africa/Kigali` when the runtime cannot resolve an IANA timezone; users can still change the saved preference later.
- Company-configured session policy supplies working days, workday bounds, and slot step. Admin-managed session type definitions supply the duration used for availability and new bookings; clients submit the stable type key, never an arbitrary duration. Sessions snapshot the booking timezone and booked duration so later settings changes do not rewrite historical or future confirmed bookings. Working days and bounds are interpreted in the company default IANA timezone. Entrepreneurs may save a personal IANA timezone for availability display; precedence is personal preference, company default, then `Africa/Kigali`. Session notification fanout formats the UTC schedule independently in every recipient's effective timezone instead of copying the booking user's formatted time to all recipients.
- Personal timezone belongs to `User` for admin, trainer, and entrepreneur roles. Admin/trainer invitation acceptance and the first password login may initialize a missing value from a validated browser-detected IANA identifier; profile updates make the saved preference explicit. Authenticated availability, creation, and rescheduling resolve the acting user's saved timezone server-side, then company default, then `Africa/Kigali`; a client-supplied timezone is never authoritative.
- Calendar ownership is exclusive per verified Google identity. Persist Google’s stable provider account ID and enforce provider/account-ID plus provider/normalized-email unique constraints. Migration retains the earliest owner of a pre-existing duplicate and removes later connections. Map uniqueness races to a conflict without replacing the existing owner’s credentials.
- Session acceptance performs a final availability check, then creates the Calendar event and uses a status-constrained audited update to prevent two users claiming an open request. A lost race deletes the extra Calendar event.
- Session reschedules store `session_reschedules` history and update the same Calendar event. Existing confirmed rows without Calendar event IDs are repaired by creating a real event on first reschedule; legacy placeholder URLs are not exposed.
- `session_request_declines` records per-user opt-out from open-team requests. Trainer query scope excludes opted-out requests while leaving them open to other eligible users.
- Participant note visibility is enforced in the response mapper; entrepreneurs cannot read internal notes.

## Notification Delivery Runtime (2026-07-16)

- Notifications are recipient-scoped durable records with separate per-channel delivery rows. In-app visibility requires a sent in-app delivery; skipped channels do not leak into the notification centre.
- Multi-recipient lifecycle fanout uses NotificationsService.createNotifications so company defaults and exact user/type preferences are fetched in batches and the event fanout is created transactionally.
- Preference persistence remains per notification type, while authenticated grouped preference endpoints expose only groups relevant to the user role. Group channel updates are transactionally applied to all member types; grouped reads return null for mixed channel state.
- The email worker atomically claims pending/failed delivery rows, recovers stale processing rows, caps attempts, applies exponential retry delay, and persists sent/failed timestamps and safe failure reasons. A fixed worker batch is processing backpressure, not a hidden API-list cap.
- Notification actionUrl accepts only application-relative paths beginning with one slash. Frontend routing ignores unsafe values and exact-detail routes refetch the resource through a role-scoped endpoint.
- Session, deliverable, and tool-request lifecycles currently emit in-app and email notifications. Auth and invitation messages remain direct module-owned transactional email where the recipient may not have an active user record; reporting and system producers should reuse the notification service when their owning features are built.
- Every runtime email URL, including CTA and logo URLs, must use EmailService.appUrl()/logoUrl(), which read APP_WEB_URL. Do not assemble roots inside feature email services.
- Notification delivery selects a module-owned session, deliverable, tool-request, or automation template by event type, with the generic notification template reserved as a fallback. Domain producers own concise role-aware context; templates own presentation and next-step guidance.

## BullMQ Worker Topology (2026-07-16)

- `JobsModule` owns the Redis connection and named queue registrations. `JobSchedulingModule` belongs only to the HTTP API and upserts BullMQ Job Schedulers. `WorkerModule`, started from `worker.ts`, belongs only to the dedicated worker process and registers processors.
- Do not import processors into `AppModule` or add `setInterval` polling back to feature services. API replicas may safely upsert the same scheduler IDs; database claims and unique constraints remain the final idempotency boundary.
- Current queues are `bid-audit`, `bid-notification-delivery`, `bid-recurring-deliverables`, `bid-transactional-email`, and `bid-report-exports`, under the `bid-hub` Redis prefix. Processor concurrency is intentionally bounded; periodic processors drain at most twenty database batches per job so they make progress without unbounded work.
- Auth verification, password reset, role-specific welcome, and admin/trainer/entrepreneur invitations enqueue typed jobs. Verified entrepreneur signup, completed Google onboarding, and accepted admin/trainer/entrepreneur invitations each queue the matching module-owned welcome email after first activation. The worker builds all absolute links through `EmailService.appUrl()/logoUrl()` and sends through SMTP/Mailpit or Resend.
- Queue defaults are five attempts with exponential backoff and capped retention. Secret-bearing transactional email jobs override successful retention to immediate removal and terminal-failure retention to one day.
- Audit outbox processing recovers five-minute stale locks, uses atomic claims, creates logs idempotently, stores safe failure text, and schedules database-level retry time. Notification delivery retains its own claim/attempt/delivery status model beneath BullMQ.
- The worker refreshes a Redis heartbeat with a TTL. Public API health returns unhealthy when Redis is unavailable or the heartbeat is stale, and exposes bounded queue state counts for operations.
- Local Compose keeps Redis internal, shares the API development image, isolates API/worker watch output into separate named volumes, and runs migrations only from the API container. Production Compose loads the provisioned root `.env` and runs API and worker as separate services from the same production image.

## Dashboard Aggregate Contracts (2026-07-16)

- `DashboardsModule` owns authenticated role endpoints for admin, trainer, and entrepreneur dashboard shapes. Controllers enforce the role; services enforce user and inferred programme scope.
- Dashboard responses are deliberately shaped read models: metric cards, bounded chart windows, capped previews, and action counts. Preview caps must never accidentally cap the underlying aggregate population.
- Admin fundraising totals, leaderboards, and six-month trends include only rounds matching the company default currency and return that currency alongside the values. Cross-currency arithmetic is forbidden without an explicit conversion model.
- Admin recent entrepreneurs is a separate backend-searched and filtered cursor endpoint with lookahead pagination. Visual preview limits do not become hidden dataset limits.
- Trainer scope is inferred from content attribution and programme access. Entrepreneur scope always begins with the authenticated entrepreneur user ID, including progress, sessions, deliverables, and notification activity.
- Six-week and six-month series are calculated in the database/query service from authoritative timestamps. Missing periods are returned as zero-value buckets so React only renders the series.
- Dashboard query paths have compound indexes for membership chronology, active programme grants, fundraising currency/date, and learner completion windows.

## Reporting Aggregate And Export Contracts (2026-07-16)

- `ReportingModule` is admin-only. `GET /reporting/overview` owns jobs, funding, reporting coverage, training progress, and overdue aggregates; `GET /reporting/overdue-updates` owns search, filters, totals, and cursor pagination.
- Report ranges default to the current UTC calendar year. A date-only end value includes the complete UTC day, invalid/reversed ranges are rejected, and ranges are bounded to ten years.
- Jobs count periodic-update periods that overlap the report range. Funding counts fundraising-round dates in range and only values matching the company default currency. Do not sum unlike currencies.
- Programme scope respects access type: assigned programmes require an active entrepreneur grant, while free programmes include all eligible active entrepreneurs. Unattributed jobs/funding remain visible in all-programme reports.
- Overdue eligibility uses the company `periodicUpdateOverdueAfterDays` setting, primary active-business membership, and the latest submitted update or join date. Reminder submission revalidates this predicate before creating a `system` notification with an internal action URL.
- `ReportExport` is the durable requester-scoped export aggregate with queued/processing/ready/failed states, attempt/failure metadata, private `FileAsset`, completion time, and expiry. Status and download endpoints always include `requestedById` scope.
- `bid-report-exports` runs only in the dedicated worker with bounded concurrency and retry. It builds CSV/XLSX from backend aggregates, iterates the complete cursor-paged overdue queue in fixed batches, writes to private S3-compatible storage, and marks the record ready only after the file asset exists.
- Export downloads use short-lived signed reads after requester ownership and ready-state checks. Redis job state is operational coordination; the database export record is the durable business source of truth.

## Operational Health And Trace Contracts (2026-07-16)

- Request IDs and correlation IDs accept only 1–128 safe trace characters. Reject header arrays, control characters, whitespace inside IDs, and oversized values; invalid request IDs become UUIDs and invalid correlations inherit the request ID.
- Responses echo `x-request-id` and `x-correlation-id`. Audit metadata, HTTP lifecycle events, failure events, webhook events, and outbound-integration events carry both, so operations can follow work across API and worker boundaries.
- Every non-health HTTP request emits structured received and completed/aborted events. Every exception emits `http.request.failed`, including expected 4xx responses. Paths never include query strings, and logs exclude headers, bodies, validation values, emails, tokens, signed URLs, provider responses, exception messages, and HTTP-boundary stacks.
- Outbound Google OAuth/Calendar, Mux, Resend/SMTP, and non-health object-storage operations emit started/completed/failed events containing provider, operation, safe method, duration, correlation context, and error class only. Validated Mux callbacks additionally emit webhook received/processed/failed events; background work without request context uses the `background` correlation marker.
- `OperationalHealthService` treats PostgreSQL, BullMQ/Redis worker and queue state, object storage, and email transport as required dependencies. Calendar and Mux configuration are reported separately because Calendar can be intentionally unconfigured in local environments.
- Storage readiness signs a non-mutating HEAD request and accepts a missing sentinel object as proof of authenticated connectivity. SMTP readiness verifies the connection without sending mail; Resend readiness validates required configuration.
- The global Redis rate-limit guard runs after authentication and role guards, uses one atomic `INCR`/`PEXPIRE` script, and applies only to configured sensitive or expensive method/path pairs. Auth uses both trusted proxy-aware IP and normalized account/token buckets; authenticated uploads, report exports, and reminder sends use verified user IDs.
- Rate-limit identities are SHA-256 hashed before entering Redis. Malformed auth bodies still continue to DTO validation, successful requests expose limit/remaining headers, exhausted requests expose `Retry-After`, and Redis failures return a safe `503` on protected routes.
- The mandatory lifecycle review covers invitation acceptance/replacement, role/profile access, programme lifecycle/access, module/content creation/ownership/order, deliverable rules/reviews/due dates, tool lifecycle/access/request decisions, session transitions, calendar connections, and company settings/taxonomies. High-frequency learning progress, notification reads, cookie rotation, and temporary upload creation are deliberately excluded from business audit noise.
- Feature 16 is complete. The production API build, live Docker dependency health, live 10-then-429 authentication check, API typecheck, and all 41 focused backend tests pass.

## Production Runtime Hardening (2026-07-18)

- Sending email is a worker-only capability. `EmailModule` is not global and is imported only by `WorkerModule`; the HTTP API uses the separate `EmailHealthModule` for readiness without gaining access to `EmailService.send()`. Auth and invitation services enqueue typed transactional jobs, while notification email remains a durable worker-claimed delivery.
- Production configuration fails closed unless PostgreSQL, Redis, Resend, Google, Calendar encryption, DigitalOcean Spaces, and Mux credentials are present. Public application URLs and storage endpoints must use HTTPS, production email must use a verified non-local sender, and the single-Droplet Caddy proxy uses one origin for web and `/api/*`.
- Production Compose runs a one-shot migration service followed by a one-shot production bootstrap before API/worker startup, plus Caddy-managed TLS, Redis AOF with `noeviction`, health-gated dependencies, bounded JSON logs, graceful shutdown periods, persistent volumes, and non-root API/web containers. The bootstrap uses a PostgreSQL advisory transaction lock and a `deployment_task_runs` key so it creates only the initial admin and core settings once; it checks the run key before requiring removable first-deploy admin credentials. Never run the local demo seed in production or move migrations/bootstrap into concurrent API/worker entrypoints. Local and production web images use distinct names so building one stack cannot overwrite the other.
- Swagger is development-only. Helmet, no-store API responses, Next security headers, shutdown hooks, and bounded provider request timeouts are production defaults.
- Host Prisma commands load `.env.local` and replace the Docker-only `DATABASE_URL` with `DATABASE_HOST_URL`. Production migrations use the provisioned root `.env` directly and must run `prisma migrate deploy`, never development migration or seed commands.
- The deployment, smoke-check, backup, and rollback procedure is maintained in `docs/production-deployment.md`.
- NestJS runtime, platform, configuration, Swagger, CLI, and schematics packages are aligned on major version 11. The clean lockfile and both production image installs audit with zero vulnerabilities; retain the scoped root overrides for patched transitive PostCSS, UUID, Babel runtime, and brace-expansion versions until their direct parents adopt those releases.

## Schedule Window And Runtime Identity Contracts (2026-07-16)

- Workspace shells use authenticated admin, trainer, and entrepreneur profile endpoints; seed users and in-memory business stores are not runtime identity sources.
- `GET /deliverable-instances` supports optional ISO `dateFrom` and `dateTo` filters. Date filters are composed with existing role scope, search/status/programme filters, cursor ordering, counts, and aggregates; reversed ranges return a safe validation error.
- The entrepreneur month calendar fetches sessions and deliverables only for its visible six-week window. Feature hooks automatically drain every cursor page before the calendar leaves its tailored skeleton.
- Fixed `take` values in the calendar are transport batch sizes, not product limits. Do not replace cursor draining with one oversized request or React-side access filtering.
- The static country definition list is reference data; business users, programmes, sessions, deliverables, tools, settings, and summaries must remain backend-backed.
