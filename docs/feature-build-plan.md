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
- Autocomplete/select data should be fetched lazily when the control opens or when the user searches, not eagerly for every page load.
- Frontend screens must show a page-specific skeleton whenever server-side or client-side data is loading. Do not leave blank pages or generic spinners for full-page fetches.
- Buttons that trigger async work must show an inline loading spinner beside the button label and prevent duplicate submission while pending.
- Backend APIs should do the heavy lifting: filtering, searching, aggregation, counts, dashboard metrics, and report summaries should be computed in the database/query layer, not assembled with large client-side datasets.

## Seed Policy

Default seed data should stay small:

- One admin user.
- One trainer user.
- One entrepreneur user.
- Core company settings and lookup settings required for the app to boot.

Do not seed every entity just to test a feature. For feature development, create temporary records with scripts, API calls, or local commands, then document the command if it is useful.

## Feature Order

### 1. Platform Foundation

Scope:
- Docker local/prod setup.
- NestJS app shell, Prisma, health checks, global validation, auth guard defaults.
- Shared API client setup in the frontend without changing feature UIs.
- Company settings required by app boot.

Done when:
- `docker compose up` starts web, api, postgres, redis, Mailpit, and pgAdmin locally.
- Web and API health routes are reachable.
- Protected endpoints reject unauthenticated requests.
- pgAdmin can connect to the local Postgres database.

### 2. Auth And Account Entry

Scope:
- Regular entrepreneur signup, login, logout, email verification, forgot password, reset password.
- Google signup/login.
- Onboarding only for Google signup or accounts missing required signup fields.
- HTTP-only cookie sessions.

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

### 3. Admin Invites And Admin Settings

Scope:
- Admin directory.
- Invite admin.
- Admin profile/settings.
- Google Calendar connection for admins.
- Admin notifications entry point.

Done when:
- Admins can be invited and listed.
- Admin detail view is implemented, not a dead action.
- Calendar connection state is visible.
- Admin notification modal uses the shared notification component.

### 4. Trainer Invites And Trainer Settings

Scope:
- Trainer directory.
- Invite trainer.
- Trainer profile/settings.
- Google Calendar connection.
- Trainer notification entry point.

Business rule:
- Trainers can only accept Google Meet session requests when their supported calendar is connected.
- Trainers are not assigned directly to entrepreneurs.

Done when:
- Trainer directory and workload views use content ownership language internally but simple user-facing labels.
- Trainer calendar connection is clear and authenticated.
- Trainer actions are limited to sessions and deliverable reviews.

### 5. Entrepreneur Profile And Access

Scope:
- Entrepreneur directory.
- Entrepreneur profile.
- Business details.
- Programme access.
- Tool access.
- Programme goals.
- Fundraising rounds.
- Periodic updates.

Business rules:
- Programme access is per entrepreneur user.
- Fundraising rounds and periodic updates are per entrepreneur user.
- Programme goals are per entrepreneur user and may be linked to a programme depending on goal type.
- Tool access can come from global rules, programme rules, direct grants, or hidden overrides.

Done when:
- Profile pages support multiple programmes cleanly.
- Programme and tool lists use capped `+n more` display.
- Profile modals do not contain stale "primary programme" assumptions.
- Filters are autocomplete where data can grow.

### 6. Programmes, Modules, And Content

Scope:
- Programme directory.
- Programme create/edit/archive.
- Programme detail workspace.
- Free programme support.
- Modules.
- Module reorder.
- Content items: video, PDF, embedded tool.
- Trainer attribution on content items.

Business rules:
- Programme status is derived from publishing and date window.
- Completed is derived from the end date. Archive is only available after timeline completion.
- Max entrepreneurs is required.
- Video upload uses Mux.
- PDF/file upload uses DigitalOcean Spaces.
- Embedded tools can select from entrepreneur tools or use a direct URL.

Done when:
- Admin programme detail is fully functional.
- Trainer programme detail is readonly but can view curriculum/content.
- Module and content lists paginate or cap safely when they grow.
- Drag and drop reorder exists where order matters.

### 7. Learner Progress

Scope:
- Programme progress.
- Module progress.
- Content completion.
- Content ratings.

Business rules:
- Progress is tracked only for entrepreneurs.
- Content ratings are attributed to the trainer attached to that content item.
- Progress syncing must avoid spamming the backend. Use batched sync, debounce, completion checkpoints, or explicit save events depending on the content type.

Done when:
- Entrepreneur training library shows real programme/module/content progress.
- Progress APIs are efficient and idempotent.
- Trainer dashboards infer learner impact from content ownership.

### 8. Deliverables

Scope:
- Programme deliverable rules.
- Entrepreneur deliverable instances.
- Upload/resubmit deliverable.
- Admin review queue.
- Trainer review queue.
- Feedback history and unread feedback state.
- Due date override.

Business rules:
- Due dates come from programme deliverable rules unless manually overridden.
- Deliverable instances are linked to entrepreneur user, not business.
- Trainers can review deliverables in their content/programme scope.

Done when:
- Entrepreneur deliverables clearly show required work, due dates, feedback history, and resubmit flow.
- Admin and trainer review queues expose due date, submitted file, review action, and feedback trail.
- Due-date updates are audited.

### 9. Entrepreneur Tools

Scope:
- Admin tool library.
- Tool upload/create.
- Tool areas.
- Tool visibility rules.
- Entrepreneur tools page.
- Tool requests.

Business rules:
- Tools can be globally visible, programme-scoped, entrepreneur-scoped, or hidden for specific entrepreneurs.
- PDF tools use file upload.
- Embedded tools use a URL.
- Tool requests have admin decisions and state transitions.

Done when:
- Admin can create and manage tools.
- Entrepreneurs see only tools they should access.
- Tool requests have complete admin and entrepreneur views.

### 10. Sessions

Scope:
- Book session.
- Admin session queue.
- Trainer session queue.
- Accept/decline/reschedule/complete.
- Session notes.
- Google Meet link generation.

Business rules:
- If an entrepreneur selects "any available BID team member", the request stays open until an eligible admin/trainer accepts it.
- Only users with supported calendar connection can accept Google Meet requests.
- For now the only provider is Google Meet, but the model should not be hardcoded to prevent future providers.

Done when:
- Entrepreneur, trainer, and admin views show the same session state machine.
- Meeting links appear only after confirmation.
- Reschedule and completion flows are implemented.

### 11. Notifications

Scope:
- In-app notifications.
- Email notifications with Resend and React Email.
- Notification preferences.
- Mailpit for local development.

Business rules:
- Notification preferences should be general and user-facing.
- Product events decide whether to send in-app, email, or both.

Done when:
- Shared notification modal works across roles.
- Important events are emitted from lifecycle services.
- Dev emails are visible in Mailpit.

### 12. Reporting And Analytics

Scope:
- Programme reporting.
- Jobs created.
- Funds mobilised.
- Overdue updates.
- Exports.

Business rules:
- Jobs created by programme are derived from periodic updates linked to a programme.
- Funds mobilised by programme are derived from fundraising rounds linked to programme goals/programmes where available.
- Overdue updates are computed from company settings.

Done when:
- Reports explain their data source.
- Filters are autocomplete for growing lists.
- CSV/Excel export works before PDF complexity.

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
