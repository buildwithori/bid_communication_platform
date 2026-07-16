# BID Hub Project Memory

This file is the persistent working memory for the BID Hub application. Read it before making product, UI, routing, or frontend architecture changes.

## Product Context

BID Hub is an entrepreneur support platform with two primary workspaces:

- Entrepreneur workspace: learning, deliverables, profile, funding updates, sessions, tools.
- Admin workspace: programme operations, entrepreneurs, trainers, content, deliverable reviews, sessions, reporting, tool requests.
- Trainer workspace: learners inferred from trainer-owned programme content, session work, feedback/review support, and programme context for the content they support.

The current phase is UI-first. Backend/auth/storage APIs are intentionally not wired yet. Build screens and flows so they are ready for backend integration later.

## Standing Direction

- Think like a senior frontend engineer and UI/UX engineer.
- Think business-first on every UI change. The app is currently UI-only, so screens must still model the real BID workflow, roles, data relationships, and growth paths instead of being decorative mockups.
- Every feature must be reviewed from entrepreneur, admin, and trainer perspectives when trainers are part of the workflow. If one side submits, requests, uploads, books, or changes something, define how the other side receives it, reviews it, tracks it, responds, and reports on it.
- Session booking backend rule: available time slots must be filtered by selected trainer/team member, selected date, session type duration, and existing calendar availability. The UI can show mock slots now, but backend implementation must not expose global static times after a trainer is selected.
- Confirmed virtual sessions need a meeting link. Google Meet is the first provider, but the data/UI must stay provider-agnostic (`meetingProvider`, `meetingUrl`) so Zoom/Teams/custom links can be supported later.
- Session requests can target a specific trainer or any available BID team member. Any-available requests should appear in admin and trainer queues; the first admin/trainer who accepts becomes the owner and the confirmed meeting gets a provider-agnostic meeting link.
- Session requests and confirmed sessions are linked to `entrepreneur_user_id`, not `business_id`. Business names in calendars, queues, and reports are derived through the entrepreneur user's business membership.
- Session queue topic/title should come from the entrepreneur booking form's required “Session topic / goal” field. Notes are supporting context, not the row title.
- Mock workflow records must connect across roles with the same entrepreneur, programme, deliverable/session/tool IDs, dates, and status meaning. Avoid isolated demo rows that make admin and entrepreneur screens tell different business stories.
- Fields shown in admin should come from entrepreneur input, admin action, or clear system-generated data. Do not invent admin-only fields without defining the source and the matching entrepreneur/admin workflow.
- Backend models and DTOs must be reconciled against the real UI forms before implementation. Each UI field must be persisted, derived, request-only, or intentionally removed; do not silently drop fields such as programme capacity, publish state, deliverable due rules, or content upload metadata.
- While building the backend, keep updating the UI when real backend models reveal missing, misleading, or incomplete screens. Ask focused questions when a business rule is genuinely unclear instead of guessing.
- Derive labels, statuses, categories, and visual states from business meaning first. Do not let colors, mock accents, or temporary UI styling become the source of product logic.
- Entrepreneur programme access is not one-to-one. Every entrepreneur automatically has free resource access, and may have zero, one, or many programme content-access paths. UI should say “programme access”, “programmes”, or “content access” when showing access, and should not use “not assigned to a programme” as if the entrepreneur has no learning access.
- Programme access grants are per entrepreneur user, not per business. Business-level views should derive programme access from the entrepreneurs attached to the business.
- Free resources are a global entrepreneur entitlement after signup. They are not assigned to entrepreneurs and should not be treated as programme content access in profile, trainer, admin, or reporting flows.
- Trainers are not assigned directly to entrepreneurs. Trainers are assigned to programme content items/modules. An entrepreneur's trainer context is inferred from the trainers attached to the content the entrepreneur can access.
- User-facing trainer/entrepreneur UI must not expose implementation wording like “content reach”, “content-linked learners”, “owned content”, or “content ownership”. Use business language such as “My entrepreneurs”, “entrepreneurs”, “programme portfolio”, “programme trainers”, and “learning assets”.
- Entrepreneur programme access is inferred from accessible content. If an entrepreneur has access to one or more content items inside a programme, the UI can show that programme as accessible. Do not make `entrepreneur.trainerId`, `programmeId`, or `programmeIds` the source of truth for new UI.
- Content ratings roll up to the trainer/content owner on that content item. Rating UI should make trainer attribution clear when possible.
- Never use “formal programme” or “formal program” in table labels, input labels, placeholders, filter labels, badges, helper text, or other user-facing UI. The distinction is internal; user-facing UI should simply say “programme”.
- Admin entrepreneur programme access must be manageable, not add-only. Admins need one flow to view current programme content access, add another programme's content, and remove existing programme content access.
- Deliverable instances are per entrepreneur user, not per business. Review tables can show the business name by deriving it from the entrepreneur's business membership.
- Programme goals are per entrepreneur user, not per business. Do not add `target_date` unless a real goal deadline workflow is introduced.
- Fundraising rounds are per entrepreneur user, not per business. Business-level funding history should be derived through the entrepreneur's business membership.
- Periodic updates are per entrepreneur user, not per business. They collect jobs and notes; funding belongs in fundraising rounds.
- Entrepreneur tools need a tool area, icon, visibility, status, and either a PDF upload or embedded URL. Tool visibility is global, programme-based, or entrepreneur-specific, with per-entrepreneur hidden overrides for exceptions.
- Do not show “primary programme” or “latest programme” in the UI unless the business explicitly adds a real primary-programme field and workflow. The current `programmeId` is a legacy/default pointer; `programmeIds` is the enrolment list.
- Do not show a “Graduated” KPI unless there is a real graduation workflow/status transition behind it. Until then, use computable programme-access metrics such as “With programmes”.
- Programme impact reporting needs explicit attribution. Jobs come from periodic job-impact updates with a reporting scope. Funds mobilised come from fundraising history with programme attribution or stay company-wide/unattributed. Do not force unattributed records into a programme chart.
- Reusability, system design, SOLID principles, and scalability matter on every change.
- Rebuild weak pages when needed instead of patching awkward UI.
- Do not assume small data. Lists, tables, programmes, modules, training content, requests, and users can grow quickly.
- Every table or table-like data surface should have search. Growing data surfaces also need filtering and pagination/page size where appropriate.
- Filters with growing or admin-managed option sets should use autocomplete, not plain selects. This includes countries, programmes, sectors, stages, trainers, tool areas, goal types, and other business taxonomies. Static tiny enums can remain compact selects when search would add no value.
- Sector and business stage fields should use autocomplete globally, including entrepreneur profile forms, admin entrepreneur forms, trainer sector specialisms, and programme rules that target stages.
- Dashboards should not become table-heavy by default. Use summary cards, capped preview lists, carousels/pagers, and clear links/actions for at-a-glance operational queues; reserve full tables for detailed management pages or sections where users truly need bulk scanning.
- Avoid dead-end actions. Buttons and row actions should open a modal, navigate to a real page, update local UI state, or clearly represent a backend-ready placeholder.
- Use shared components whenever possible before inventing page-specific UI.
- Entrepreneur programme goals are programme-linked records, not a single profile-wide form. Show them as a searchable table and use a modal for add/edit so entrepreneurs can have separate goals per programme.
- Programme goal types are admin-managed settings under `/admin/settings/goal-types`; forms should read from shared goal type definitions instead of hardcoding fundraising/programme-completion/milestone options.
- Goal type fields should use autocomplete everywhere, because admin-managed goal type settings can grow.
- Overdue periodic updates are company-configured, not manually listed. The company config defines how many days an active entrepreneur can go without a periodic report before they appear in the overdue list. Current UI mock rule: overdue after 30 days without a periodic report; for entrepreneurs who never submitted, count from their joined date.

## Routing Rules

- Root `/` redirects to `/auth/login`.
- All auth pages live under `/auth`.
- Entrepreneur pages live under `/entrepreneur`.
- Trainer pages live under `/trainer`.
- Admin pages live under `/admin`.
- There should not be multiple competing login pages.
- Entrepreneur signup is direct. Do not show copy saying admin/trainers cannot self-register or will be invited unless explicitly requested again.

## UI System Rules

- Prefer shared primitives in `components/shared`:
  - `Button`
  - `Card`, `CardHeader`
  - `DataTable`, `TableToolbar`, `TableFilterInput`, `TableFilterSelect`, `TablePagination`, `RowActions`
  - `TableFilterAutocomplete` for searchable table filters whose options can grow.
  - `FormField`, `FormInput`, `FormSelect`, `FormAutocomplete`, `FormRow2`
  - `Modal`
  - `Badge`
  - `MetricGrid`, `StatCard`
  - `ChartCard`
- Use Radix/shadcn primitives from `components/ui` underneath shared components when needed.
- Use `lucide-react` icons for buttons, metrics, actions, and visual affordances.
- Keep UI readable. Avoid tiny text classes for important content.
- Form inputs/selects/autocomplete controls should align consistently by using shared form primitives.
- Country fields should use `FormAutocomplete`/autocomplete globally, not plain inputs or standard selects, because the list can grow.
- Modal animations should stay smooth and centered via the shared `Modal` and global modal keyframes.
- Avoid UI that only works for a tiny dataset. Prefer search/filter/pagination from the start.
- Every fetching view needs a page-specific skeleton that matches the final layout closely enough to feel smooth. Use skeleton cards, rows, charts, and headers that fit the page instead of a generic centered spinner for full-page loading.
- Async buttons must show an inline loading spinner beside the label and disable duplicate submissions while pending.
- Autocomplete and scalable select controls should fetch lazily when opened or searched. Do not fetch all options on page load just to populate a closed control.
- Autocomplete, select, and lookup UIs must support pagination or infinite scrolling. Do not build UI around a hidden fixed result cap.

## Current Important Decisions

- Backend/API folders were removed for now. The app is UI/in-memory-state first. Backend implementation direction is now NestJS, not Next.js route handlers.
- Backend/frontend integration must be feature-sliced, not broad page rewiring. Preserve the existing UI while wiring backend data. Do not remove pages, modals, actions, filters, charts, or customer-facing flows just because the backend endpoint is not ready. For each feature, compare the current UI against the backend design, build that feature end to end, then commit it in reviewable chunks.
- Follow `docs/feature-build-plan.md` for backend integration order. Start from auth and invite/profile foundations before moving into programmes, content, deliverables, sessions, tools, notifications, and reporting.
- Seed data should stay minimal: one user per role and essential company/settings lookup data. Do not seed every entity for every feature. Use local scripts, API calls, or temporary commands when a feature needs test records during development.
- Backend repository direction: use the monorepo shape `apps/web`, `apps/api`, `packages/shared`, and root `prisma`. Do not create a root-level `backend/` app.
- Backend identity direction: each user has one active role at a time, and role change is not supported for launch. Do not create separate admin/trainer/entrepreneur profile tables; shared profile fields live on `users`, while role-specific business data belongs in real domain tables such as `businesses`, `business_memberships`, `trainer_specialisms`, and `calendar_connections`.
- Backend runtime/deployment direction: local and production Docker Compose setup with separate services for the Next.js frontend and NestJS API, plus Postgres and Redis services. Local Compose includes Mailpit for email catching and pgAdmin for local database inspection; pgAdmin should pre-register the local Postgres service as `BID Hub Local Postgres` using Docker hostname `postgres`; production Compose must not include pgAdmin. Production uses built images, production env, restart policies, health checks, and DigitalOcean Spaces for non-video file storage. First production deployment runs on one DigitalOcean Droplet.
- Docker environment convention: development Compose loads the ignored `.env.local`, created from the sole local template `.env.docker.example`; do not duplicate those values in service `environment` blocks. Production Compose will use a separately provisioned root `.env` and must never load `.env.local`.
- Backend auth uses secure httpOnly cookie sessions for the browser app, not client-managed bearer tokens.
- Backend product endpoints should require authentication by default. Public endpoints must be explicit exceptions, such as auth entry points or health checks; role checks are layered on only when needed.
- Backend endpoints must be designed for scale from the start. Lists, lookups, autocomplete sources, dashboards, and reports need backend-side search/filter/sort/pagination or server-side aggregation. The frontend should not fetch large datasets and compute business summaries in React.
- One entrepreneur user belongs to one business at launch.
- Admins have full permissions at launch.
- Trainers are read-only except for sessions and deliverable reviews.
- Use signed Mux playback from day one.
- Reporting exports start with CSV/Excel only; no data import is required for launch.
- Backend email direction: Resend for production delivery, React Email for reusable branded templates, and Mailpit as the Docker Compose development email catcher. Build a consistent BID email brand system even before final email designs exist.
- Backend audit direction: audit logs should be generated by lifecycle/workflow infrastructure, not manually created in every feature. Business actions emit audit events into an `audit_outbox` inside the same transaction, then a background processor writes immutable `audit_logs`.
- TanStack Query is installed and wired through `app/providers.tsx`; current mock stores still own data until backend integration begins.
- Auth includes separate `/auth/login` and `/auth/signup` pages with shared tabs that navigate between URLs, plus forgot password, reset password, and email verification.
- Regular email entrepreneur signup does not require onboarding because it already collects the signup baseline. Google signup may use `/auth/onboarding` only when required baseline details are missing. Onboarding should use the signup form fields as the baseline: business name, representative name, email, country, and phone. Google signup should prefill provider name/email and ask only for the missing baseline details.
- Admin dashboard and entrepreneur dashboard include charts via Recharts.
- Tables use a leading `Action` column with `RowActions` dropdowns. The primary entity column (name/request/programme/business/deliverable) should also be clickable to open the main detail/view flow when one exists, so users do not have to use the action menu for the common view action.
- Programmes and Training Library are core content surfaces and must be robust:
  - Admin Programs should support growing programme portfolios with search, status filters, pagination, and module search/pagination.
  - Entrepreneur Training Library should feel learner-facing, with featured programme cards, searchable catalogue, standalone resources, and detailed programme learning paths.
- Learner progress is tracked only for entrepreneurs. The UI should not send progress updates on every player tick; use a batched/throttled sync model and flush only on meaningful events such as open, pause, milestones, ended, close/pagehide, or explicit completion.
- Training library content can grow fast, so avoid pure card grids without search/pagination.
- Programme lifecycle is derived from business fields, not a loose mock status. Archive wins over every other status: `archivedAt` -> Archived, no `publishedAt` -> Draft, future start date -> Scheduled, passed end date -> Completed, otherwise Active.
- Archived programmes are hidden from default admin/entrepreneur/trainer operational lists, but remain viewable through explicit admin filters or direct URLs for audit/reporting. Archived programme workspaces are read-only until restored.
- Completed is derived from the programme end date only. Do not add manual complete/reopen/unpublish UI. If a completed programme should become active again, admins edit the end date into the future. Published programmes stay published; archive them when they should leave default operational lists.

## Business Flow Notes

Admin should be able to:

- See platform health from dashboard.
- Manage entrepreneurs by granting/removing programme content access; trainer relationships are inferred from content ownership.
- Manage trainers, content ownership, calendar readiness, and content-linked learner reach.
- Build programmes from modules and modules from content.
- Reuse modules/content across programmes.
- Define required deliverables per programme.
- Review submitted deliverables.
- Manage content library.
- Manage sessions and tool requests.
- Review reporting and overdue updates.
- Create internal sessions for entrepreneurs, accept open session requests, decline requests with a reason, and reschedule sessions with history.

Entrepreneurs should be able to:

- View dashboard progress, upcoming sessions, and deliverables.
- Browse training programmes and resources.
- Open a programme and continue through modules/content.
- Submit deliverables.
- Maintain business profile, funding history, and periodic updates.
- Book sessions.
- Use/download tools and request new tools.

Session workflow rules:

- Entrepreneur booking creates a request with a required topic/goal and optional notes.
- If an entrepreneur selects any available BID team member, the request is open to admins/trainers; the first person who accepts becomes the owner.
- Once an open BID team request is accepted, the UI must stop showing "Any available BID team member" and show the actual accepting admin/trainer as the session owner.
- Only a team member with calendar support for the meeting provider can accept/confirm a session. For Google Meet, this currently requires a Google-connected calendar.
- In the entrepreneur "Book a session" modal, the "specific trainer" autocomplete must only list trainers who have calendar support for the current meeting provider. Since only Google Meet is enabled for now, this means only trainers with `calendarProvider: 'google'` should appear.
- Admins and trainers can create confirmed sessions directly.
- Confirmed virtual sessions must show a provider-agnostic meeting link. Google Meet is the first provider, but UI/data should not be hard-coded to Google only.
- Rescheduling must record previous date/time, actor, date requested, and reason so the UI can explain what changed.
- Admin session actions should follow a state machine:
  - Awaiting team member: message entrepreneur, accept/confirm when calendar support allows, decline with reason, reschedule, add note.
  - Confirmed: message entrepreneur, open meeting link, mark completed, reschedule, add note.
  - Completed: message entrepreneur and add note; no reschedule or completion action.
  - Declined: message entrepreneur only unless a future reopen flow is deliberately added.
- Admin "Nudge trainer" is distinct from entrepreneur messaging. It should target the assigned trainer and eventually send both an in-app notification and an email.
- Trainer workspace needs a notification bell and notification modal for nudges, session requests, deliverable review reminders, and upcoming sessions.
- Trainer calendar connection belongs in trainer settings, not the admin trainer create/edit modal. Admin manages trainer identity/access; trainers connect their own Google Calendar via an OAuth-style flow and update limited profile details.
- Google Calendar connection is not a plain email field. It should represent permissions to read availability, create Google Meet events, update/reschedule events, and cancel/manage session events.
- Admin workspace needs a notification bell and notification modal for open session requests, deliverable reviews, overdue updates, tool request changes, trainer nudges, and other operational work queues.
- Notification modals are shared across roles via `components/shared/NotificationsModal` and should use the neutral title "Notifications"; do not create role-specific duplicate notification modals.
- Notifications are a first-class product system, not one-off UI messages. Keep event categories, read state, actor/entity references, in-app delivery, email delivery, and user/company preferences reusable across admin, trainer, and entrepreneur roles.
- Admin trainer management should scale as a table-first directory. Workload metrics belong in a separate tab/management view, not as a card grid preview on the main trainer list.
- Trainer directory and trainer workload are different admin jobs. Directory columns should focus on identity, access, specialisms, calendar readiness, and status. Workload views should focus on capacity pressure, pending session responses, confirmed sessions, deliverable feedback work, learner progress, and next scheduled work.
- Admin team management should live on its own admin directory page with table search, filters, pagination, and invite actions. Do not hide admin invitations as a one-off dashboard button.
- Admins can also connect Google Calendar from admin settings so they can own/accept Google Meet session work. Reuse the shared calendar connection component for admin and trainer settings.

## Verification Expectations

- Run `npm run build` after meaningful changes.
- The existing Browserslist warning is known and not currently blocking.
- When changing pages with responsive UI, check that text does not overlap, controls align, and dense data has a growth path.

## Known Cleanup

- README may lag behind current product decisions. Prefer this memory file when there is a conflict, then update README when doing documentation work.
- Data is still mocked/in-memory under `lib/mock-data` and `lib/stores`.

## Next.js 16 Foundation (2026-07-15)

- The web app runs Next.js 16.2 with React 19.2. Turbopack is the default development/build engine and its root is pinned to the repository so unrelated lockfiles outside the project are ignored.
- Use `apps/web/proxy.ts`, not the legacy `middleware.ts` convention. Proxy performs only an optimistic `bid_session` cookie-presence redirect for protected workspace routes; the NestJS session guard and client `WorkspaceGuard` remain authoritative for identity and role authorization.
- Typed routes and React Compiler are enabled. Shared navigation accepts Next's `Route` type, and dynamic URL construction stays centralized in `lib/routes.ts`.
- ESLint uses the Next 16 flat configuration. React Compiler migration diagnostics remain visible as warnings so older UI can be improved incrementally without flattening or removing flows.
- Client pages that read `useSearchParams()` must render beneath a page-specific Suspense fallback so static generation remains valid.

## Auth And Workspace Entry Completion (2026-07-15)

- Feature 2 is complete. Every admin, trainer, and entrepreneur layout is wrapped once by `WorkspaceGuard`; Proxy only performs the early cookie-presence redirect while `/auth/me` remains authoritative for session, verification, onboarding, and role routing.
- Login may honor a `next` path only when it belongs to the authenticated users own workspace prefix. Cross-role and non-workspace destinations fall back to that roles dashboard.
- Sidebar sign-out calls the logout API, shows an inline pending spinner, prevents duplicate clicks, clears the auth query, and then replaces the route with login.
- Google login and Google signup are distinct: login may link an existing entrepreneur email but must not silently create a new account. New Google identities are created only through signup and go to onboarding when required fields are missing.

## Frontend API Integration Boundary (2026-07-15)

- Pages and components must never call `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueryClient`, `apiRequest`, or raw feature request functions directly. `app/providers.tsx` is the only TanStack infrastructure exception.
- Every integrated feature uses `apps/web/lib/api/<feature>/` with `types.ts`, `requests.ts`, `keys.ts`, `hooks.ts`, and `index.ts`; optional URL builders may live in `urls.ts`.
- The public feature barrel exports consumer-safe hooks and shared types. Raw requests and query keys remain private to the feature integration layer.
- Feature hooks own server-state behavior: queries, mutations, lazy enablement, cursor/infinite pagination, invalidation, optimistic updates, and cache cleanup. Pages/components own rendering, local UI state, form-to-payload mapping, navigation, and user feedback.
- API payload, response, and shared domain types must live in feature `types.ts` files, not pages. A page/component may define a type locally only when it is private presentation state for that file, such as its tab union, modal draft, or table-only view row.
- ESLint enforces the page/component import boundary. See `docs/frontend-api-integration.md` for the canonical structure.

## UI Form And Backend Design Reconciliation (2026-07-15)

- Every form input exposed in the UI must map to the backend design specification as a persisted field, derived value, or documented request-only field.
- When integrating a feature, compare its live forms with `docs/backend-design.md`. Remove inputs that are clearly outside the approved design instead of silently creating unsupported payload properties.
- If a UI property is missing from or ambiguous in the backend design and removing it could change the intended product flow, stop and flag the exact property to the user for a product decision before changing the backend contract.
- Shared API/domain types belong in the feature integration `types.ts`; only private presentation-state types may remain local to a page or component.

## Audit Lifecycle Foundation Completion (2026-07-15)

- Business auditing is lifecycle-based, not a generic after-query side effect. Raw Prisma hooks cannot reliably express business intent or guarantee that an outbox insert shares the business transaction.
- Use `AuditService.capture(definition, mutation)` from workflow/lifecycle helpers. It owns the transaction and writes the business change plus the audit outbox event atomically while attaching request actor, request ID, correlation ID, IP address, and user agent.
- Feature code declares the meaningful action, entity mapping, summary, and safe metadata. It must not call `auditLog.create` or repeat transaction/outbox plumbing.
- Audit payload redaction is centralized and strips passwords, tokens, secrets, cookies, authorization values, signed URLs, signatures, and private keys recursively.
- The audit worker processes pending/failed outbox rows automatically, prevents overlapping local runs, caps retries at ten attempts, and creates logs idempotently.
- `audit_logs` are append-only at the database layer. The processor uses insert-only idempotency through the unique outbox relationship.
- Generic Prisma/repository hooks may be added later only as a selected-model safety net. They must not replace named business lifecycle events or duplicate them.

## Asset Infrastructure Completion (2026-07-15)

- Non-video files are uploaded directly to private S3-compatible storage. Local Docker uses private MinIO; production uses DigitalOcean Spaces. The API verifies object size, MIME metadata, and supported file signatures before marking an asset ready.
- File consumers pass an explicit usage and internal `fileAssetId`; storage keys and private provider URLs stay server-only. Reads use short-lived signed URLs after role/domain access checks.
- Video consumers pass an internal `videoAssetId`, never a user-entered Mux upload, asset, or playback ID. Mux callbacks use the explicit public `POST /webhooks/mux` exception, raw-body HMAC verification, and durable event IDs for idempotency.
- Ready videos use short-lived RS256 Mux playback tokens after programme/content authorization. Frontend file/video feature hooks own direct-upload progress, cancellation, status polling, failures, and TanStack calls.

## Programmes And Content Library Completion (2026-07-16)

- Feature 8 is complete. Admin programme lifecycle, curriculum/module management, content library, module content sequencing, and trainer attribution use authenticated NestJS APIs and feature-owned frontend hooks.
- Trainer programme visibility is inferred from trainer-attributed learning assets. Trainer programme lists, summaries, detail, curriculum, readiness, programme entrepreneurs, and content metadata must remain server-scoped; React must not reconstruct trainer scope from broad datasets.
- Within a programme a trainer is authorized to support, the trainer may preview the full curriculum, including content attributed to other trainers. Signed PDF and Mux access checks must verify shared programme scope and must not expose unrelated programme content.
- Programme and module lists use cursor pagination and backend search. Module content is fetched only when its modal opens, and signed file/video access is requested only when a preview opens.
