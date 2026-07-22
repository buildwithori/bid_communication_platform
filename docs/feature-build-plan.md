# BID Hub Feature Build Plan

This document is the working plan for backend and frontend integration. The goal is to build the product feature by feature without flattening the UI work that already exists.

## Build Rules

- Preserve the existing frontend experience while wiring data. Do not remove pages, modals, table actions, filters, charts, or customer-facing flows just because the backend is not ready yet.
- Touch one business feature at a time. A feature is not done until the backend model, API, frontend integration, validation, empty/loading/error states, and role permissions all work together.
- All non-public endpoints must be authenticated by default. Only health checks and explicit auth entry points are public.
- Users have one role at a time. The product does not support role switching for now.
- Trainers are linked to programme content, not directly to entrepreneurs. Trainer learner scope is inferred from the entrepreneurs who can access the trainer-owned content.
- Entrepreneurs may have zero, one, or many assigned programmes. All entrepreneurs automatically access free programmes and free resources.
- Do not use the phrase "formal programme" in UI labels. A programme is a programme; access type is only a filter/business rule.
- Audit logs should be emitted by lifecycle hooks/services in the background. Feature code should not manually create audit rows in every controller action.
- Keep local and production Docker separate. Local includes developer tools like Mailpit and pgAdmin; production does not.
- Every list, lookup, autocomplete, and table endpoint must be designed for growth. Do not hard-cap results as a hidden product limit. Use cursor pagination or infinite-scroll friendly pagination everywhere, including autocomplete sources.
- Backend-backed autocomplete/select data should preload when its containing page/view becomes active or its modal opens; dependent lookups wait for required parent values. Clicking the control must not initiate the first request. Search remains backend-driven and cursor-paginated, with no eager full-dataset fetch.
- All search inputs must use the shared 300 ms debounce boundary. Remote autocomplete search is debounced by the shared control, so consumers must avoid adding a second delay.
- Frontend screens must show a page-specific skeleton whenever server-side or client-side data is loading. Do not leave blank pages or generic spinners for full-page fetches.
- Buttons that trigger async work must show an inline loading spinner beside the button label and prevent duplicate submission while pending.
- Backend APIs should do the heavy lifting: filtering, searching, aggregation, counts, dashboard metrics, and report summaries should be computed in the database/query layer, not assembled with large client-side datasets.

- Frontend pages and components must never import TanStack Query, `apiRequest`, raw request modules, or query keys. They consume feature integration hooks from `apps/web/lib/api/<feature>/index.ts`; the feature hook layer owns queries, mutations, pagination, invalidation, and cache behavior.
- API payload, response, and shared domain types belong in the feature integration `types.ts`. Types may stay in a page or component only when they are private presentation types used solely by that page or component.
- Every UI form input must reconcile with `docs/backend-design.md` as persisted, derived, or documented request-only data. Remove clearly unsupported inputs; flag ambiguous properties to the user before changing the backend contract or product flow.

## Seed Policy

Default seed data should stay small:

- One admin user.
- One trainer user.
- One entrepreneur user.
- Core company settings and lookup settings required for the app to boot.

Do not seed every entity just to test a feature. For feature development, create temporary records with scripts, API calls, or local commands, then document the command if it is useful.

## Feature Order

### 1. Platform Foundation And Loading System

Scope:

- Docker local/prod setup.
- NestJS app shell, Prisma, health checks, global validation, auth guard defaults.
- Shared API client setup in the frontend without changing feature UIs.
- Shared request/response envelope and error handling.
- Cursor pagination helpers for lists, tables, lookup endpoints, and autocomplete endpoints.
- Shared frontend loading primitives: page skeletons, table skeletons, chart skeletons, modal skeletons, autocomplete loading rows, and inline button spinner states.
- Company settings required by app boot.
- Audit context and audit outbox foundation.

Done when:

- `docker compose up` starts web, api, the dedicated BullMQ worker, the React Email preview service, postgres, internal-only redis, Mailpit, MinIO, and pgAdmin locally.
- Web and API health routes are reachable.
- Protected endpoints reject unauthenticated requests.
- pgAdmin can connect to the local Postgres database.
- A feature can use shared API pagination and loading primitives without inventing one-off patterns.
- Default guards make product endpoints authenticated unless explicitly marked public.

Implementation status (2026-07-15): Complete. Audit request and correlation context, atomic lifecycle capture, durable outbox writes, automatic background processing with bounded retries, centralized sensitive-value redaction, idempotent log creation, and database-enforced append-only audit logs are implemented. Named workflow/lifecycle helpers remain responsible for business intent; raw Prisma hooks are only a future safety net for selected models. See `docs/audit-lifecycle.md` for the feature implementation contract.

### 2. Auth And Account Entry

Scope:

- Regular entrepreneur signup, login, logout, email verification, forgot password, reset password.
- Google signup/login.
- Onboarding only for Google signup or accounts missing required signup fields.
- HTTP-only cookie sessions.
- Workspace route guards and role redirects.
- Auth email templates through React Email and Resend/Mailpit.

Frontend routes:

- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/verify-email`
- `/auth/onboarding`

Done when:

- Regular signup does not require onboarding.
- Google signup routes missing required business/contact fields to onboarding.
- Role redirects are correct after login.
- Auth UI remains visually consistent with the existing design.
- Auth forms have validation, inline pending button states, and page-specific loading states.

Implementation status (2026-07-15): Complete. Cookie sessions, regular and Google account entry, conditional Google onboarding, role-aware workspace guards, safe post-login return paths, real logout, branded auth email delivery, and page-specific pending states are wired and verified.

### 3. Company Settings, Lookups, And Taxonomies

Scope:

- Company settings.
- Sectors.
- Business stages.
- Programme goal types.
- Tool areas.
- Default currency, timezone, session provider, notification defaults, and periodic update overdue rule.
- Autocomplete/list endpoints for all growing lookup data.

Frontend routes:

- `/admin/settings`
- `/admin/settings/company`
- `/admin/settings/sectors`
- `/admin/settings/stages`
- `/admin/settings/goal-types`
- `/admin/settings/tool-areas`
- Any legacy settings route should redirect or be intentionally removed when this slice is touched.

Done when:

- Admin settings pages are backed by authenticated APIs.
- Lookup endpoints are paginated/searchable and can power lazy autocomplete controls.
- Mutations validate uniqueness and active/inactive state.
- Settings changes emit audit events.

Implementation status (2026-07-15): Complete. Company settings and all four backend-managed taxonomies use authenticated APIs, cursor pagination, server-side search and filtered totals, uniqueness and active-state validation, page-specific skeletons, guarded mutation buttons, and transactional audit outbox events. Lazy infinite-query hooks are available for autocomplete consumers. The legacy stages/sectors route redirects to the canonical settings area; admin profile and calendar settings remain scoped to Feature 4.

### 4. Admin Team Invites And Admin Settings

Scope:

- Admin directory.
- Invite admin.
- Admin detail view.
- Admin profile/settings.
- Google Calendar connection for admins.
- Admin notification entry point.

Frontend routes:

- `/admin/admins`

Done when:

- Admins can be invited and listed.
- Admin detail view is implemented, not a dead action.
- Calendar connection state is visible.
- Admin notification modal uses the shared notification component.
- List/search/filter endpoints are paginated and scoped.

Implementation status (2026-07-15): Complete. The admin directory, backend-filtered metrics, cursor pagination, search and filters, detail view, invitation/resend/acceptance lifecycle, status controls, and profile settings are backed by authenticated APIs with page-specific skeletons and guarded mutations. Invitation, acceptance, status, profile, and calendar lifecycle changes emit transactional audit events. Admin Google Calendar connection state uses a reusable admin/trainer OAuth module with encrypted token storage and an authenticated callback; completing a live Google connection requires deployment Google OAuth credentials. The existing admin shell continues to use the shared notification modal.

### 5. Trainer Invites And Trainer Settings

Scope:

- Trainer directory.
- Invite trainer.
- Trainer profile/settings.
- Trainer specialisms.
- Google Calendar connection.
- Trainer notification entry point.

Frontend routes:

- `/admin/trainers`
- `/trainer/settings`

Business rule:

- Trainers can only accept Google Meet session requests when their supported calendar is connected.
- Trainers are not assigned directly to entrepreneurs.

Done when:

- Trainer directory and workload views use content ownership language internally but simple user-facing labels.
- Trainer calendar connection is clear and authenticated.
- Trainer actions are limited to sessions and deliverable reviews.
- Trainer lookup/autocomplete endpoints are lazy, searchable, and paginated.

Implementation status (2026-07-15): Complete. The authenticated trainer directory uses backend search, filters, cursor pagination, totals, summary metrics, content-derived portfolio and workload aggregates, lazy specialism lookup, detail, invitation/resend/acceptance, status, and capability editing. Trainer self-settings use the shared profile identity fields and reusable encrypted Google Calendar OAuth connection; the unsupported bio and maximum-entrepreneur inputs were removed. Trainer invitations and lifecycle changes are audited and use module-owned branded email templates. The shared trainer notification entry point remains in the trainer shell. Google Meet session acceptance now requires a connected Google Calendar; full calendar event creation, availability, rescheduling, and the cross-role session state machine remain scoped to Feature 12.

### 6. Entrepreneur Profile And Access

Scope:

- Entrepreneur directory.
- Entrepreneur profile.
- Business details.
- Programme access.
- Tool access.
- Programme goals.
- Fundraising rounds.
- Periodic updates.
- Admin-created entrepreneur records and entrepreneur self-service profile updates.

Frontend routes:

- `/admin/entrepreneurs`
- `/entrepreneur/profile`

Business rules:

- Programme access is per entrepreneur user.
- Fundraising rounds and periodic updates are per entrepreneur user.
- Programme goals are per entrepreneur user and may be linked to a programme depending on goal type.
- Tool access can come from global rules, programme rules, direct grants, or hidden overrides.

Done when:

- Profile pages support multiple programmes cleanly.
- Programme and tool lists use capped visual display while full data remains paginated/viewable.
- Profile modals do not contain stale "primary programme" assumptions.
- Filters are autocomplete where data can grow.
- Profile dashboard/detail metrics are returned by aggregate endpoints where needed.

Implementation status (2026-07-15): Complete. The admin directory and entrepreneur self-profile are backed by authenticated APIs with backend search, filters, cursor pagination, summary metrics, multiple-programme access, and lazy taxonomy/programme lookups. Admin invitation, status, profile, programme access, tool access, programme goals, fundraising rounds, and periodic updates use guarded mutations with transactional audit events. Tool access resolves global rules, programme inheritance, direct grants, and hidden overrides on the backend; the admin management modal searches and paginates the full published catalogue while showing each effective state. The self-profile keeps business details and all programme-linked records in paginated views with page-specific loading states and no primary-programme assumption.

### 7. File, Video, And Asset Infrastructure

Scope:

- DigitalOcean Spaces file upload flow for PDFs, deliverables, downloadable tools, report exports, and other non-video files.
- Mux direct upload flow for videos.
- Mux webhook handling.
- Signed file access and signed Mux playback.
- File preview/download metadata.
- Upload progress and failure states.

Done when:

- Admins can request direct uploads without exposing secrets.
- File records store metadata and storage keys, not raw binaries.
- Video records store Mux asset/playback state and become ready through webhook processing.
- UI upload controls use loading/progress states and never ask users for raw storage/playback IDs.

Implementation status (2026-07-15): Complete. Non-video uploads use private S3-compatible object storage with presigned writes, ownership/usage metadata, server-side object and signature verification, signed reads, and local MinIO parity with DigitalOcean Spaces. Video uploads use server-created Mux direct-upload URLs, internal BID Hub video asset IDs, authenticated status/cancel/playback APIs, verified raw-body webhooks at `POST /webhooks/mux`, idempotent event records, webhook-driven content readiness, and separate short-lived RS256 signed video and thumbnail tokens so Mux Player can securely render generated posters for protected assets. Frontend file/video feature boundaries own XHR progress, cancellation, failure handling, polling, and TanStack behavior; content forms consume internal asset IDs rather than storage keys or Mux playback IDs.

### 8. Programmes, Modules, And Content Library

Scope:

- Programme directory.
- Programme create/edit/archive.
- Programme detail workspace.
- Free programme support.
- Module create/edit/reuse/reorder.
- Content library.
- Content items: video, PDF, Excel workbook, embedded tool.
- Trainer attribution on content items.
- Trainer readonly programme context and curriculum/content preview.

Frontend routes:

- `/admin/programs`
- `/admin/programs/[programId]`
- `/admin/content`
- `/trainer/programmes`
- `/trainer/programmes/[programId]`

Business rules:

- Programme status is derived from publishing and date window.
- Completed is derived from the end date. Archive is only available after timeline completion.
- Max entrepreneurs is required.
- Video upload uses Mux.
- PDF and Excel file upload uses DigitalOcean Spaces.
- Learning tool content can reuse any published entrepreneur tool, including PDF resources, Excel workbooks, and online tools. A custom online tool may use a direct URL.

Done when:

- Admin programme detail is fully functional.
- Trainer programme detail is readonly but can view curriculum/content.
- Module and content lists paginate or cap visually with full pagination/infinite scrolling available.
- Drag and drop reorder exists where order matters, with a fallback move-to-position action for paginated lists.

Implementation status (2026-07-22): Complete. Admin programme directory, lifecycle, detail workspace, module create/edit/reuse/reorder, content library, module content management, direct asset-backed content creation, and reusable content attachment use authenticated APIs with backend search, cursor pagination, aggregate metrics, tailored skeletons, and guarded mutations. Reuse destinations exclude programmes and shared modules that would duplicate the content within any programme, with a transactionally locked backend recheck before attachment. Published entrepreneur tools are also unique within each module; module-aware tool and reusable-content lookups exclude existing tool links, and transactionally locked create/attach guards prevent bypasses and concurrent duplicates. Entrepreneur learning and authorized admin/trainer preview now share one robust in-page course player with an expandable complete curriculum, video resume/checkpoints, signed PDF, authenticated Excel worksheet rendering, and Mux playback, embedded tools, previous/next navigation, completion progress, and completion-driven rating prompts. `GET /programmes/:id/player` returns the full ordered curriculum as a deliberate bounded programme-view contract: entrepreneurs receive ready content and their own progress, trainers receive ready content without learner progress, and only admins see processing, failed, or otherwise non-ready content. Management directories remain cursor-paginated. Permanent programme, module, and global content deletion is admin-only, exact-name confirmed in both UI and API, transactionally cascades scoped database records, deletes orphaned modules/content while preserving assets still used elsewhere, and queues Mux, private-storage, and Google Calendar cleanup through a durable retrying outbox worker.

### 9. Learner Progress And Training Library

Scope:

- Entrepreneur training library.
- Programme detail learning path.
- Module content player.
- Programme progress.
- Module progress.
- Content completion.
- Content ratings.
- Trainer learner impact derived from content ownership.

Frontend routes:

- `/entrepreneur/training`
- `/entrepreneur/training/[programmeId]`
- `/trainer/entrepreneurs`

Business rules:

- Progress is tracked only for entrepreneurs.
- Content ratings are attributed to the trainer attached to that content item.
- Progress syncing must avoid spamming the backend. Use batched sync, debounce, completion checkpoints, or explicit save events depending on the content type.

Done when:

- Entrepreneur training library shows real programme/module/content progress.
- Content player supports video, PDF, and embedded tools with customer-grade loading states.
- Progress APIs are efficient and idempotent.
- Trainer learner views are inferred from content ownership and are paginated/searchable.

Implementation status (2026-07-16): Complete. The entrepreneur catalogue, programme path, module route, and in-page content player use authenticated backend read models with personal programme/module/content progress, cursor pagination, server-side search and filters, lazy module content loading, page-specific skeletons, signed PDF and Mux access, checkpointed idempotent progress syncing, explicit completion, and trainer-attributed ratings. Free resources are represented as backend-managed free programmes using the standard module/content model; unsupported mock-only topic, chapter, durationMin, and accent data were removed. Trainer learner impact is inferred from trainer-owned content, scopes free-programme learners by actual engagement, keeps programme lookups lazy, and returns backend-computed progress, completion, and rating aggregates.

### 10. Deliverables

Scope:

- Programme deliverable rules.
- Entrepreneur deliverable instances.
- Upload/resubmit deliverable.
- Admin review queue.
- Trainer review queue.
- Feedback history and unread feedback state.
- Due date override.

Frontend routes:

- `/admin/deliverable-reviews`
- `/trainer/deliverable-reviews`
- `/entrepreneur/deliverables`
- `/entrepreneur/deliverables/[groupId]`

Business rules:

- Due dates come from programme deliverable rules unless manually overridden.
- Deliverable instances are linked to entrepreneur user, not business.
- Trainers can review deliverables in their content/programme scope.

Done when:

- Entrepreneur deliverables clearly show required work, due dates, feedback history, and resubmit flow.
- Admin and trainer review queues expose due date, submitted file, review action, and feedback trail.
- Due-date updates are audited.

Implementation status (2026-07-16): Complete. Programme deliverable rules use authenticated, cursor-paginated backend search with backend submission/assignment counts, lazy module and business-stage lookups, audited guarded mutations, and immediate fixed or recurring instance generation. Fixed-date instances synchronize across signup, Google onboarding, invitations, programme grants, and business-stage changes; module-completion instances are created from backend completion events using the configured due window. Recurring instances use explicit reporting periods, partial uniqueness guarantees, eligibility-aware calendar cadence generation, a periodic lifecycle worker, read-time freshness checks, and idempotent historical backfills. Entrepreneur workspaces and admin/trainer review queues use cursor pagination, backend aggregates, secure file access, reporting-period labels, upload/resubmit, immutable review history, unread feedback, audited due overrides, tailored skeletons, and protected async actions.

### 11. Entrepreneur Tools And Tool Requests

Scope:

- Admin tool library.
- Tool upload/create.
- Tool areas.
- Tool visibility rules.
- Entrepreneur tools page.
- Tool requests.
- Admin decisions and state transitions.

Frontend routes:

- `/admin/entrepreneur-tools`
- `/admin/tool-requests`
- `/entrepreneur/tools`

Business rules:

- Tools can be globally visible, programme-scoped, entrepreneur-scoped, or hidden for specific entrepreneurs.
- PDF and Excel tools use private file uploads.
- Embedded tools use a URL.
- Tool requests have admin decisions and state transitions.

Done when:

- Admin can create and manage tools.
- Entrepreneurs see only tools they should access.
- Tool requests have complete admin and entrepreneur views.
- Tool request states expose only valid next actions.

Implementation status (2026-07-20): Complete. The admin library uses authenticated cursor pagination, backend search/filtering and aggregate metrics, lazy tool-area/programme/entrepreneur lookups, private PDF and Excel direct uploads, embedded URLs, global/programme/entrepreneur visibility, hidden entrepreneur exceptions, audited mutations, guarded publish/archive transitions, and page-specific loading states. Draft and archive transitions allow incomplete configuration, while publishing validates the complete effective asset and persisted audience even for status-only updates. Entrepreneur tools are server-scoped to effective access with management metadata redacted, searchable and paginated by type, and retain PDF, Excel worksheet, and embedded preview flows. Entrepreneur requests and the admin review queue use scoped cursor pagination, backend status counts, required business-need validation, audited valid transitions, decision notes, and published-library-tool linking before Built.

### 12. Sessions And Calendar

Scope:

- Book session.
- Admin session queue.
- Trainer session queue.
- Entrepreneur schedule.
- Accept/decline/reschedule/complete.
- Session notes.
- Google Calendar connection and availability.
- Google Meet link generation.

Frontend routes:

- `/admin/sessions`
- `/trainer/sessions`
- `/entrepreneur/schedule`

Business rules:

- If an entrepreneur selects "any available BID team member", the request stays open until an eligible admin/trainer accepts it.
- Only users with supported calendar connection can accept Google Meet requests.
- For now the only provider is Google Meet, but the model should not be hardcoded to prevent future providers.

Done when:

- Entrepreneur, trainer, and admin views show the same session state machine.
- Meeting links appear only after confirmation.
- Reschedule and completion flows are implemented.
- Calendar availability and time-slot endpoints are backend-computed and scoped.

Implementation status (2026-07-16): Complete. Entrepreneur booking uses lazy cursor-paginated trainer lookup and backend-computed Google Calendar availability; specific requests are trainer-calendar scoped, while open-team slots require at least one available connected admin/trainer. Create, accept, decline/opt-out, cancel, reschedule, complete, and note transitions use one audited lifecycle aggregate. Acceptance rechecks the accepting user's local and Google availability, atomically claims open requests, creates the real Calendar event/Meet link, and cleans up race-lost events. Rescheduling rechecks company-configured booking policy and live availability, updates the same Google event, records immutable history, and rolls Calendar back on database conflicts. Company settings configure working days, hours, slot interval, and default duration. Admin, trainer, and entrepreneur views consume feature-sliced hooks, server search/counts/cursor pagination, lazy lookups, page skeletons, and guarded async actions. Internal notes are hidden from entrepreneurs, and legacy placeholder links are suppressed and repaired with a real event on first reschedule.

### 13. Notifications And Email

Scope:

- In-app notifications.
- Email notifications with Resend and React Email.
- Notification preferences.
- Mailpit for local development.
- Notification bell/modal for admin, trainer, and entrepreneur workspaces.
- Product event fanout for sessions, deliverables, tools, auth, invitations, reporting, and system notices.

Business rules:

- Notification preferences should be general, grouped, role-scoped, and user-facing. Admin, trainer, and entrepreneur settings expose a dedicated notification tab rather than one control per low-level event type.
- Product events decide whether to send in-app, email, or both.

Done when:

- Shared notification modal works across roles.
- Important events are emitted from lifecycle services.
- Dev emails are visible in Mailpit.
- Delivery status and read state are persisted.

Implementation status (2026-07-16): Complete. Durable recipient-scoped notifications now power the shared admin, trainer, and entrepreneur notification centre with cursor pagination, backend unread/total counts, persisted read state, lazy loading, and safe internal action URLs that open the exact session, deliverable, or tool-request detail context. Session, deliverable, and tool lifecycles emit batched in-app and email fanout with company defaults and user overrides. BullMQ now separates API producers/schedulers from a dedicated worker runtime. Notification delivery, audit outbox processing, recurring deliverable generation, auth email, and all role invitations run through named Redis queues with bounded concurrency, exponential retry, retained failures, scheduler deduplication, stale database-lock recovery, and idempotent persistence. Successful secret-bearing transactional email jobs are removed immediately. API health verifies Redis, queue counts, and a TTL-backed worker heartbeat. Module-owned React Email templates retain the shared BID brand and every runtime action/logo URL comes from APP_WEB_URL. Migration, scheduler/worker failure recovery, queue removal, and Mailpit delivery were verified in Docker. Reporting/system emitters will attach to this foundation when their owning lifecycle features are implemented. Role-scoped grouped preferences keep exact per-event delivery overrides underneath, represent mixed legacy state safely in the API, update group members atomically, and appear in dedicated admin, trainer, and entrepreneur notification tabs. Notification hardening gives every channel and scheduled preference true nullable inheritance from live company policy; company fallback details remain internal while users see clear themed on/off switches. A dedicated cursor-paged BullMQ automation queue creates 24-hour reminders plus Monday 08:00 user-timezone weekly summaries. The API exposes role scope explicitly: entrepreneurs receive session and deliverable content, while admins and trainers receive unread activity and sessions they own without entrepreneur deliverable messaging. Durable unique dedupe keys make recurring runs idempotent, personal automation opt-outs are enforced before creation, event-group channel preferences are enforced before delivery, and reminder action URLs open the exact scoped session or deliverable.

### 14. Dashboards And Operational Aggregates

Scope:

- Admin dashboard.
- Trainer dashboard.
- Entrepreneur dashboard.
- Dashboard cards, charts, queues, and next-action summaries.
- Dedicated aggregate endpoints for each role dashboard.

Frontend routes:

- `/admin/dashboard`
- `/trainer/dashboard`
- `/entrepreneur/dashboard`

Business rules:

- Dashboards should not fetch large raw lists and aggregate in React.
- Each dashboard metric must have a clear source table, filter, authorization scope, and date window when relevant.
- Dashboard queues can cap visually, but must link to full paginated management pages.

Done when:

- Each role dashboard uses backend aggregate/query endpoints.
- Charts and stats render with page-specific skeletons while loading.
- Empty dashboard states make sense for the minimal seed database.

Implementation status (2026-07-16): Complete. Authenticated, role-scoped dashboard endpoints now return database-backed cards, chart series, capped operational previews, and next-action counts for admin, trainer, and entrepreneur workspaces. Admin funding totals and trends use only the company default currency so unlike currencies are never combined; the recent-entrepreneur queue has backend search, filters, and cursor pagination. Trainer scope is derived from trainer-attributed programme content across the full eligible portfolio, while only presentation previews are capped. Entrepreneur metrics, sessions, deliverables, learning progress, and recent activity are restricted to the authenticated user. Each dashboard now uses its feature API hooks, tailored loading skeleton, explicit error and minimal-data empty states, and links preview actions to full management pages or exact resource context. Dashboard query indexes, role metadata, user-scope, cursor lookahead, live API, production build, and authenticated browser smoke tests are verified.

### 15. Reporting And Analytics

Scope:

- Programme reporting.
- Jobs created.
- Funds mobilised.
- Overdue updates.
- Report filters.
- CSV/Excel exports.

Frontend routes:

- `/admin/reporting`

Business rules:

- Jobs created by programme are derived from periodic updates linked to a programme.
- Funds mobilised by programme are derived from fundraising rounds linked to programme goals/programmes where available.
- Overdue updates are computed from company settings.

Done when:

- Reports explain their data source.
- Filters are autocomplete for growing lists.
- CSV/Excel export works before PDF complexity.
- Reporting queries are DB-backed aggregates, not frontend-heavy calculations.

Implementation status (2026-07-16): Complete. The admin reporting workspace now uses authenticated database aggregates for jobs, same-currency fundraising, submission coverage, training progress, and overdue periodic updates. Programme and date filters are server-applied; growing programme lookups load lazily, and the follow-up queue uses backend search, priority/programme filters, counts, and cursor pagination. Data-source notes and currency/date scope are explicit. CSV and XLSX exports are durable ReportExport records generated by a bounded BullMQ worker, stored privately, polled by status, and downloaded through short-lived signed URLs; export generation paginates the entire overdue dataset without a hidden cap. Excel output is a branded four-sheet operational workbook with filters, frozen headings, totals, typed date/currency/percentage formats, priority styling, print settings, and methodology; CSV mirrors the report context, includes an Excel-compatible UTF-8 BOM, and neutralizes formula-leading cells. Reporting reminders revalidate overdue eligibility and create recipient-scoped email or in-app notifications linked to the entrepreneur update/profile resource. The page retains a tailored skeleton, empty/error states, inline async loading, and duplicate-submit protection. Migration, role scope, date boundaries, cursor lookahead, reminder fanout, live CSV/XLSX downloads, typechecks, production builds, and authenticated browser smoke coverage are verified.

### 16. Audit, Observability, And Hardening

Scope:

- Audit outbox processor.
- Immutable audit log writes.
- Sensitive-field redaction.
- Request correlation IDs.
- Backend logging and health checks for jobs, storage, video, calendar, email, and notification queues.
- Security/error review across completed feature slices.

Done when:

- Important lifecycle actions emit audit events automatically.
- Audit processing retries safely and does not roll back completed business transactions.
- Operational failures are visible during local development and production deployment.
- Completed endpoints have tests around auth, validation, and scope.

Implementation status (2026-07-16): Complete. The immutable audit outbox has atomic lifecycle capture, recursive sensitive-field redaction, stale-lock recovery, idempotent log creation, bounded attempts, database retry timing, a dedicated BullMQ processor, and an append-only database trigger. The final lifecycle review confirms the required invitation, access/profile, programme, content/module, deliverable, tool, session, calendar, and company-setting actions are captured in the same transaction as their business mutation; high-frequency learning progress, notification reads, cookie rotation, and temporary upload creation remain intentionally outside the business audit stream. Request and correlation IDs are bounded to safe characters/length, echoed in response headers, attached to audit metadata, and included in structured 5xx logs without exception messages. Public readiness actively checks PostgreSQL, Redis/worker heartbeat and every queue, private object storage, and email transport, while reporting Calendar/Mux configuration readiness without exposing credentials. Redis-backed route policies now use an atomic expiring counter for auth, upload, Mux webhook, health, report-export, and reminder routes only. Auth attempts are limited by both trusted client IP and normalized account/token identity; identities are SHA-256 hashed in Redis, malformed payloads still reach DTO validation, exhausted requests return `429` with `Retry-After`, and protected routes fail closed when Redis is unavailable. The production API build, live Docker dependency health, live 10-then-429 login-limit check, typecheck, and all 41 focused backend tests pass.

## Integration Checklist For Every Feature

Before starting:

- Read the current UI for the feature.
- Identify all role perspectives affected.
- Confirm the backend model against the current UI fields.

During build:

- Add or adjust backend models and endpoints.
- Protect endpoints with authentication and role/scope checks.
- Keep the UI structure intact while replacing mock reads/writes with API calls.
- Use optimistic or local fallback state only when it improves UX and does not lie about persistence.

Before commit:

- Confirm list and autocomplete endpoints are paginated/infinite-scroll ready and do not rely on hidden caps.
- Confirm dashboards and summaries are backed by server-side aggregate queries, not frontend-heavy processing.
- Confirm every fetching view has a tailored skeleton and every async button has inline loading state.
- Run focused API and web typechecks.
- Manually test the primary route in Docker or local dev.
- Commit backend, frontend, and docs in reviewable chunks.
