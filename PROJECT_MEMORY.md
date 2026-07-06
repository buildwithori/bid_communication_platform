# BID Hub Project Memory

This file is the persistent working memory for the BID Hub application. Read it before making product, UI, routing, or frontend architecture changes.

## Product Context

BID Hub is an entrepreneur support platform with two primary workspaces:

- Entrepreneur workspace: learning, deliverables, profile, funding updates, sessions, tools.
- Admin workspace: programme operations, entrepreneurs, trainers, content, deliverable reviews, sessions, reporting, tool requests.

The current phase is UI-first. Backend/auth/storage APIs are intentionally not wired yet. Build screens and flows so they are ready for backend integration later.

## Standing Direction

- Think like a senior frontend engineer and UI/UX engineer.
- Think business-first on every UI change. The app is currently UI-only, so screens must still model the real BID workflow, roles, data relationships, and growth paths instead of being decorative mockups.
- Derive labels, statuses, categories, and visual states from business meaning first. Do not let colors, mock accents, or temporary UI styling become the source of product logic.
- Reusability, system design, SOLID principles, and scalability matter on every change.
- Rebuild weak pages when needed instead of patching awkward UI.
- Do not assume small data. Lists, tables, programmes, modules, training content, requests, and users can grow quickly.
- Every table or table-like data surface should have search. Growing data surfaces also need filtering and pagination/page size where appropriate.
- Avoid dead-end actions. Buttons and row actions should open a modal, navigate to a real page, update local UI state, or clearly represent a backend-ready placeholder.
- Use shared components whenever possible before inventing page-specific UI.

## Routing Rules

- Root `/` redirects to `/auth/login`.
- All auth pages live under `/auth`.
- Entrepreneur pages live under `/entrepreneur`.
- Admin pages live under `/admin`.
- There should not be multiple competing login pages.
- Entrepreneur signup is direct. Do not show copy saying admin/trainers cannot self-register or will be invited unless explicitly requested again.

## UI System Rules

- Prefer shared primitives in `components/shared`:
  - `Button`
  - `Card`, `CardHeader`
  - `DataTable`, `TableToolbar`, `TableFilterInput`, `TableFilterSelect`, `TablePagination`, `RowActions`
  - `FormField`, `FormInput`, `FormSelect`, `FormAutocomplete`, `FormRow2`
  - `Modal`
  - `Badge`
  - `MetricGrid`, `StatCard`
  - `ChartCard`
- Use Radix/shadcn primitives from `components/ui` underneath shared components when needed.
- Use `lucide-react` icons for buttons, metrics, actions, and visual affordances.
- Keep UI readable. Avoid tiny text classes for important content.
- Form inputs/selects/autocomplete controls should align consistently by using shared form primitives.
- Modal animations should stay smooth and centered via the shared `Modal` and global modal keyframes.
- Avoid UI that only works for a tiny dataset. Prefer search/filter/pagination from the start.

## Current Important Decisions

- Backend/API folders were removed for now. The app is UI/in-memory-state first.
- TanStack Query is installed and wired through `app/providers.tsx`; current mock stores still own data until backend integration begins.
- Auth includes separate `/auth/login` and `/auth/signup` pages with shared tabs that navigate between URLs, plus forgot password, reset password, and email verification.
- Admin dashboard and entrepreneur dashboard include charts via Recharts.
- Tables use a leading `Action` column with `RowActions` dropdowns.
- Programmes and Training Library are core content surfaces and must be robust:
  - Admin Programs should support growing programme portfolios with search, status filters, pagination, and module search/pagination.
  - Entrepreneur Training Library should feel learner-facing, with featured programme cards, searchable catalogue, standalone resources, and detailed programme learning paths.
- Training library content can grow fast, so avoid pure card grids without search/pagination.

## Business Flow Notes

Admin should be able to:

- See platform health from dashboard.
- Manage entrepreneurs and assign them to programmes/trainers.
- Manage trainers and their assignments.
- Build programmes from modules and modules from content.
- Reuse modules/content across programmes.
- Define required deliverables per programme.
- Review submitted deliverables.
- Manage content library.
- Manage sessions and tool requests.
- Review reporting and overdue updates.

Entrepreneurs should be able to:

- View dashboard progress, upcoming sessions, and deliverables.
- Browse training programmes and resources.
- Open a programme and continue through modules/content.
- Submit deliverables.
- Maintain business profile, funding history, and periodic updates.
- Book sessions.
- Use/download tools and request new tools.

## Verification Expectations

- Run `npm run build` after meaningful changes.
- The existing Browserslist warning is known and not currently blocking.
- When changing pages with responsive UI, check that text does not overlap, controls align, and dense data has a growth path.

## Known Cleanup

- README may lag behind current product decisions. Prefer this memory file when there is a conflict, then update README when doing documentation work.
- Data is still mocked/in-memory under `lib/mock-data` and `lib/stores`.
