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
- Entrepreneur tool drafts and archived tools may be incomplete. Enforce the required asset and audience only when publishing, and validate partial status updates against the tool's persisted audience instead of treating omitted relationship IDs as empty.
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
- Entrepreneur programme goals are programme-linked records, not a single profile-wide form. Show them as a searchable table and use a modal for add/edit so entrepreneurs can have separate goals per programme. Fundraising rounds may link only to unachieved goals that are not attached to archived programmes; enforce this in both the paginated lookup and mutation validation.
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
- Backend-backed autocomplete options preload with their containing UI: page filters when the page/view is active, modal fields when the modal opens, and dependent fields only after their required parent value exists. Opening the dropdown must never initiate its first request. Search remains server-driven and paginated; do not fetch an entire option set eagerly.
- Every user-entered search must use the shared 300 ms debounce boundary before triggering API queries or expensive local filtering. Typing stays visually immediate, clearing propagates immediately, and remote autocompletes inherit debounce from the shared `FormAutocomplete` rather than adding a second page-level delay.
- Shared autocomplete/select triggers must show an inline themed spinner while their options are loading, especially when a dependent field is repopulating after a parent selection changes.
- All user-facing calendar-date and date-range fields must use the shared themed `DatePicker` or `DateRangePicker`; do not use native browser `input type="date"`, `datetime-local`, `month`, or `week` controls.
- React Hook Form fields rendered through custom controlled primitives (`FormSelect`, `FormAutocomplete`, `DatePicker`, and `DateRangePicker`) must use `Controller`/`useWatch` when their state is consumed in a child form component. Do not rely on a child calling a parent form's `watch` plus `setValue`; dependent controls may not repaint reliably.
- Autocomplete command items must use the option's stable backend value as their internal identity. Labels and descriptions are searchable keywords only, because separate records may legitimately share the same display text and must never share hover or selection state.
- Autocomplete, select, and lookup UIs must support pagination or infinite scrolling. Do not build UI around a hidden fixed result cap.

## Current Important Decisions

- The backend is the NestJS application in `apps/api`; do not add business API route handlers to Next.js or restore the former UI-only/in-memory architecture.
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
  - Programme playback uses one reusable, in-page course player across entrepreneur learning and admin/trainer preview. Its curriculum sidebar receives the complete ordered module/content tree without pagination; this is a deliberate bounded programme-view contract, while management lists remain cursor-paginated.
  - Entrepreneurs see ready content only. Authorized admins/trainers can preview the full curriculum and see draft, processing, failed, or archived item state without creating learner progress.
  - Content rating is completion-driven: prompt entrepreneurs after a video ends, after manual completion, when Next is used on an already-completed video, or after continuing/finishing a PDF or tool lesson. Open the prompt only after completion sync succeeds; it must be dismissible and must never block navigation.
  - Video Start over must explicitly restart playback at zero instead of reusing the saved resume timestamp. It does not erase an already-earned completion record.
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
- Legacy prototype components and stores still exist under `lib/mock-data` and `lib/stores`, but active application routes no longer mount seed-backed business-data providers or import mock business records. The shared country list is static reference data and remains intentionally local.

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
- Forms whose initial values come from a query must mount their editable form only after the query succeeds and initialize local state from that response. Do not hydrate every field through a synchronous effect, because it adds a blank/fallback render and can overwrite user edits during cache updates.
- Workspace tabs that represent distinct views must be URL-backed so reload, direct links, and browser back/forward preserve the active tab. Each tab must render its own relevant loading state rather than being blocked by queries required only by another tab.

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
- Ready videos use separate short-lived RS256 Mux video and thumbnail tokens after programme/content authorization. Signed thumbnails use the same authorised playback ID and expiry with Mux image audience `t`, allowing Mux Player to render its generated poster without making protected media public. Frontend file/video feature hooks own direct-upload progress, cancellation, status polling, failures, and TanStack calls.

## Programmes And Content Library Completion (2026-07-16)

- Feature 8 is complete. Admin programme lifecycle, curriculum/module management, content library, module content sequencing, and trainer attribution use authenticated NestJS APIs and feature-owned frontend hooks.
- Trainer programme visibility is inferred from trainer-attributed learning assets. Trainer programme lists, summaries, detail, curriculum, readiness, programme entrepreneurs, and content metadata must remain server-scoped; React must not reconstruct trainer scope from broad datasets.
- Within a programme a trainer is authorized to support, the trainer may preview the full curriculum, including content attributed to other trainers. Signed PDF and Mux access checks must verify shared programme scope and must not expose unrelated programme content.
- Programme and module management lists use cursor pagination and backend search. A content item may appear at most once within a programme, even when modules are shared across programmes; reuse lookups exclude invalid programmes/modules and the transactional attach guard locks every affected context before rechecking. The shared programme player intentionally loads the complete ordered curriculum after role-scoped authorization, then requests signed file/video access only for the active lesson.
- Admin permanent deletion uses exact-name confirmation in both UI and API. Programme deletion removes programme-scoped entrepreneur data but preserves reusable library content; module deletion removes programme-specific progress and dependent deliverables while preserving content; global content deletion removes all module links, learner progress, ratings, and queues Mux/storage cleanup. External cleanup records are committed with the database deletion and drained idempotently by BullMQ.

## Entrepreneur Tools Integration Completion (2026-07-16)

- Feature 11 is complete across /admin/entrepreneur-tools, /admin/tool-requests, and /entrepreneur/tools.
- Tool and request pages consume only feature integration hooks. Tool areas and growing audience/tool selectors load lazily with infinite pagination; catalogue and request lists use backend search, filtering, counts, and cursor pagination.
- Admins retain create/edit/details/preview/status/audience flows. PDF resources use the shared private direct-upload flow; embedded tools use validated URLs; hidden entrepreneur exceptions remain supported.
- Entrepreneur requests require a real business need. Admin actions follow backend-provided transitions, and Built requires selecting the published library tool that fulfills the request.

## Sessions And Calendar Completion (2026-07-16)

- Feature 12 uses one durable session lifecycle aggregate across entrepreneur, trainer, and admin views. Requests are `requested` sessions with nullable owner and explicit open-team or specific-trainer targeting.
- Specific-trainer booking slots come only from that active trainer's connected Google Calendar. Open-team slots exist only when at least one eligible connected admin/trainer is free, and acceptance rechecks the accepting user's Google and local availability before an atomic claim.
- An open-team decline opts only that user out; it does not close the entrepreneur's request. A targeted-trainer decline closes the targeted request.
- Confirmation creates a real Google Calendar event and Meet link. Reschedule updates that event, writes immutable previous/new time history and reason, and performs compensating Calendar rollback on a database race. Cancellation removes the Calendar event.
- Company settings own session working days, start/end minutes, slot interval, default duration, and the configurable IANA timezone. New and seeded settings use `Africa/Kigali`; personal timezone, company timezone, and platform fallback precedence is enforced consistently across profile and session flows.
- The sessions frontend integration lives under `lib/api/sessions/`. Booking trainer/owner/entrepreneur lookups are lazy and cursor-paginated; schedule windows use infinite cursor loading; queue search, filters, totals, and status metrics remain backend-owned.
- Meeting links are exposed only for real confirmed/completed Calendar-backed sessions. Internal session notes are never returned to entrepreneurs.

## Notifications And Email Completion (2026-07-16)

- Feature 13 uses one durable, recipient-scoped notification system across admin, trainer, and entrepreneur workspaces. Lists are cursor-paginated, unread/total counts are backend-computed, read state is persisted, and the shared notification centre loads lazily.
- Notification action URLs must be safe internal application paths and should identify the exact resource with a query ID when the destination opens a detail modal. Session, deliverable, and tool-request destinations resolve that scoped resource from the backend rather than relying on the currently loaded list page.
- Lifecycle fanout resolves company defaults and user preferences in batches, creates per-channel delivery rows, and never performs business summaries in React. User notification preferences live in a dedicated tab in each role settings/profile experience.
- Store notification overrides per event type for exact delivery enforcement, but expose role-scoped groups to users. Admin, trainer, and entrepreneur receive only operationally relevant groups; a group update must atomically upsert every event type in that group and mixed legacy values must be represented explicitly.
- All runtime email action links and brand assets must derive their absolute root from APP_WEB_URL through the shared EmailService helpers. Feature modules own their templates and orchestration; preview props may use illustrative local values only for the React Email preview runtime.
- Client-facing email uses the shared branded shell, while sessions, deliverables, tools, auth, and invitations retain module-owned templates. Lifecycle messages must concisely state what changed, the relevant resource and timing or reason when available, and the recipient next action; long user-entered notes are excerpted rather than copied wholesale.
- Session booking, reschedule, and cancellation notifications follow both sides of the lifecycle: BID-team actions notify the entrepreneur, while entrepreneur actions notify the owning or targeted team member, or the open team for an unclaimed request. Corresponding preference types remain visible only to roles that can actually receive them.
- Notification email delivery is asynchronous and retryable, with atomic claims, stale-processing recovery, capped exponential backoff, attempt metadata, and persisted pending/processing/sent/failed/skipped states.
- Notification channel and automation preferences use nullable inheritance: company policy remains a live fallback, while explicit user on/off choices remain stable. Reminder and digest generation runs in a cursor-paged BullMQ workflow; unique database dedupe keys prevent repeated session, deliverable, and weekly notices. A generated notice is still filtered through its role-scoped event-group channel preference before delivery. Scheduled scope is explicit in the API: entrepreneurs receive session and deliverable reminders/digest sections, while admins and trainers receive owned-session reminders and digests without entrepreneur deliverable counts.

## BullMQ Background Job Runtime (2026-07-16)

- Background execution is split from the HTTP API. `AppModule` registers BullMQ queues and idempotent Job Schedulers; `WorkerModule` is bootstrapped through `src/worker.ts` as a separate local and production Compose service and owns all processors. Never reintroduce processor providers or polling timers into the API process.
- Redis is an internal-only Compose dependency. `REDIS_URL` is required and supports authenticated `redis://` and TLS `rediss://` URLs. The shared queue prefix is `bid-hub`.
- Named queues currently cover audit outbox processing, notification email delivery, recurring deliverable synchronization, transactional auth/invitation email, report export generation, and durable external resource cleanup for Mux, object storage, and Google Calendar. Scheduled scan jobs use BullMQ Job Schedulers; processors drain bounded batches and rely on database claims/unique constraints for idempotency.
- BullMQ jobs use bounded attempts, exponential backoff, and capped completed/failed retention. Transactional email jobs containing short-lived tokens are deleted immediately after success and retained for at most one day on terminal failure. Templates remain owned by their feature modules and are rendered only in the worker.
- Audit and notification database rows remain the durable business source of truth. Both recover stale processing locks; audit failures now persist `nextAttemptAt` and bounded delayed retries. BullMQ controls execution but does not replace transactional outbox guarantees.
- API health must validate Redis connectivity and the TTL-backed worker heartbeat. A reachable Redis server without a live consumer is unhealthy. Local and production Compose both run a dedicated worker; local API and worker watch output use separate named volumes.

## Role Dashboard Completion (2026-07-16)

- Feature 14 dashboards consume role-specific aggregate endpoints through `lib/api/dashboards/`; dashboard pages must not fetch broad domain lists or calculate business summaries in React.
- Admin funding cards and trends aggregate only fundraising rounds in the company default currency. Never add unlike currencies together or show a period comparison unless the backend returns a real comparable window.
- Trainer dashboard scope is inferred from trainer-attributed content across every eligible programme and its entrepreneurs. Full aggregate scope must not inherit a visual preview cap; only returned preview collections may be capped.
- Entrepreneur dashboard data is authenticated-user scoped. Recent activity comes from durable notifications with safe resource action URLs, not invented client-side activity.
- Dashboard operational lists remain compact previews and link to full management views. Any growing queue embedded in a dashboard uses backend search/filter/cursor pagination.
- Admin, trainer, and entrepreneur dashboards each retain a page-specific skeleton plus explicit error and minimal-data empty states.

## Reporting And Analytics Completion (2026-07-16)

- Feature 15 is complete. The admin reporting page consumes only `lib/api/reporting/` hooks; all aggregates, filtering, searching, counts, attribution, and overdue rules remain backend-owned.
- Jobs use periodic updates whose periods overlap the selected range. Fundraising uses rounds dated in range and only the company default currency; unlike currencies are never combined. Programme-linked and company-wide/unattributed contributions remain explicit.
- Overdue periodic updates derive from the company overdue-days setting and the latest submission, or membership join date when none exists. The queue supports server search, programme/priority filters, total counts, and cursor lookahead without hidden caps.
- Report exports are durable requester-owned records. A dedicated bounded BullMQ processor pages through all overdue rows, stores the result privately, and exposes it only through an expiring signed download URL. XLSX output is a branded decision workbook with executive summary, programme performance, current overdue follow-up, and methodology sheets; filters, frozen headings, typed dates, currency/percentage formats, totals, and printable page settings are preserved. CSV contains the same scope, summary, programme, follow-up, and methodology context, includes an Excel-compatible UTF-8 BOM, and neutralizes formula-leading cells.
- Reporting reminder actions recheck current overdue eligibility before creating a recipient-scoped notification. The reporting flow supports email or in-app delivery and links to `/entrepreneur/profile`; it does not expose the unsupported generic message-priority field.
- The reporting view has a page-specific skeleton, explicit source/range/currency notes, error and empty states, lazy programme autocompletes, inline export/reminder spinners, polling, and duplicate-submit protection.

## Operational Hardening Foundation (2026-07-16)

- Inbound request/correlation IDs must match the bounded trace-ID character set; invalid or injection-shaped request IDs are replaced with UUIDs and invalid correlation IDs fall back to the request ID. Both IDs are returned as headers and flow into audit context.
- Every failed HTTP request, including expected 4xx responses, emits a structured `http.request.failed` event with method, query-free path, status, error code, authentication state, request ID, correlation ID, and exception class. Do not log exception messages, validation values, query strings, headers, bodies, or stacks at the HTTP boundary because they can contain sensitive values.
- Successful and failed outbound Google OAuth/Calendar, Mux, email, and non-health object-storage operations emit correlated start/completion/failure events with provider, operation, method, duration, and error class only. Validated Mux webhooks emit correlated received/processed/failed events; health probes are suppressed to avoid log noise.
- Public API readiness actively checks PostgreSQL, BullMQ/Redis plus the worker heartbeat and every named queue, private object storage, and email delivery. Calendar and video report configuration readiness without revealing which credential is missing.
- Report-export creation is an audited lifecycle mutation; the export record and audit outbox event share one transaction before the BullMQ job is enqueued.
- Distributed rate limiting reuses the shared Redis runtime and atomic expiring counters. It applies only to auth, upload, Mux webhook, health, report-export, and reporting-reminder routes; ordinary product reads and writes are not broadly throttled.
- Authentication is limited by both trusted client IP and normalized account/token identity. Redis keys contain only SHA-256 identities. Rejections return `429` plus `Retry-After`; limiter storage failures fail protected routes closed with a safe `503`.
- The final lifecycle review confirms all mandatory invitation, access/profile, programme, content/module, deliverable, tool, session, calendar, and company-setting actions are transactionally audited. High-volume progress, notification reads, session-cookie rotation, and temporary upload creation remain intentionally outside the business audit stream.
- Feature 16 is complete. The production API build, live Docker health, live authentication throttle, typecheck, and all 41 focused backend tests pass.

## Post-Integration Runtime Cleanup (2026-07-16)

- Admin, trainer, and entrepreneur workspace chrome must derive identity and role/business context from their authenticated profile feature hooks. Never restore hard-coded seed people in layouts.
- The entrepreneur schedule combines sessions and deliverable deadlines from authenticated backend date-window queries. Calendar hooks automatically follow every cursor before rendering the complete window, so a batch size never becomes a hidden event cap.
- Deliverable instance queries accept validated `dateFrom`/`dateTo` filters, preserve role scope, reject reversed ranges, and remain cursor-paginated.
- Active-route mock and direct-API boundary audits, changed-file lint, monorepo typechecks, both production builds, focused hardening tests, and live Docker profile/window/health responses pass.

## Production Runtime Completion (2026-07-18)

- Production deployment is a single-origin HTTPS stack behind Caddy: the public domain serves Next.js and proxies `/api/*` to NestJS. Production Compose automatically applies migrations before API/worker startup, keeps PostgreSQL and Redis internal, persists Redis with AOF/no-eviction, bounds logs, and runs application containers as non-root.
- Local and production web images must keep distinct tags (`bid-hub-web-dev` and `bid-hub-web`) so production builds never replace the local development runtime.
- Email delivery is always background work. The HTTP API may enqueue transactional or notification delivery but cannot resolve the send-capable `EmailService`; only the dedicated BullMQ worker imports `EmailModule`. API readiness uses a separate email-health service.
- Production environment validation requires secure HTTPS roots and complete Resend, Google, Spaces, Mux, database, Redis, and encryption configuration. Deployment and rollback operations follow `docs/production-deployment.md`.
- The production dependency baseline uses one aligned NestJS 11 family and a reproducible `npm ci` lockfile. Targeted root overrides keep transitive PostCSS, UUID, Babel runtime, and brace-expansion releases on audited patched versions while their parent packages lag; the full development and production dependency audit must remain at zero findings.
