# BID Hub

BID Hub is a frontend application for managing entrepreneur support programmes. It gives entrepreneurs a workspace for learning, deliverables, profile updates, sessions, and tools, while giving programme teams an admin workspace for operations, content, reporting, and reviews.

The project is currently in a UI-first phase. Backend authentication, persistence, and storage are not wired yet. The application uses mock data and in-memory stores so the product flows can be designed, tested, and refined before backend integration.

> Before making product, UI, routing, or frontend architecture changes, read [PROJECT_MEMORY.md](./PROJECT_MEMORY.md). It captures the standing decisions and long-running context for this application.
>
> Before backend design or implementation work, read [BACKEND_MEMORY.md](./BACKEND_MEMORY.md) and the collaborative backend design doc at [docs/backend-design.md](./docs/backend-design.md).

## Tech Stack

- Next.js 13 App Router
- React 18
- TypeScript
- Tailwind CSS
- Radix UI / shadcn primitives
- React Hook Form + Zod
- TanStack Query
- Recharts
- Lucide React icons
- Sonner toasts

Planned backend stack:

- NestJS API
- PostgreSQL + Prisma
- BullMQ + Redis for background jobs
- Required monorepo shape: `apps/web`, `apps/api`, `packages/shared`, root `prisma`
- Local and production Docker Compose runtime with separate frontend and backend services
- DigitalOcean Spaces for non-video file storage
- Mux Video
- Resend + React Email for branded email templates
- Mailpit development email catcher
- Google Calendar / Google Meet integration first

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The root route redirects to:

```text
/auth/login
```

Build for production:

```bash
npm run build
```

Known note: the build may show an outdated Browserslist warning. It is not currently blocking.

## Main Workspaces

### Auth

Auth pages live under `/auth`.

- `/auth/login`
- `/auth/signup`
- `/auth/onboarding`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/verify-email`

Login and signup are separate routes with shared auth tabs, so switching tabs updates the URL. Regular email signup collects the required details directly and moves to email verification. `/auth/onboarding` is only for Google signup when required details are missing. Backend auth is not connected yet.

### Entrepreneur Workspace

Entrepreneur pages live under `/entrepreneur`.

- `/entrepreneur/dashboard`
- `/entrepreneur/training`
- `/entrepreneur/training/[programmeId]`
- `/entrepreneur/training/[programmeId]/[moduleId]`
- `/entrepreneur/profile`
- `/entrepreneur/deliverables`
- `/entrepreneur/deliverables/[groupId]`
- `/entrepreneur/schedule`
- `/entrepreneur/tools`

Entrepreneurs can view dashboard progress, browse training, continue modules, submit deliverables, maintain profile and funding history, submit periodic updates, book sessions, and request or use tools.

### Admin Workspace

Admin pages live under `/admin`.

- `/admin/dashboard`
- `/admin/entrepreneurs`
- `/admin/trainers`
- `/admin/programs`
- `/admin/content`
- `/admin/deliverable-reviews`
- `/admin/sessions`
- `/admin/tool-requests`
- `/admin/settings/stages`
- `/admin/settings/sectors`
- `/admin/reporting`

Admins can manage entrepreneurs, trainers, programmes, content, deliverable reviews, sessions, tool requests, business stages, sectors, and reporting.

## Project Structure

```text
app/
  auth/                 Auth screens
  entrepreneur/         Entrepreneur workspace routes
  admin/                Admin workspace routes
  globals.css           Global styles, tokens, modal animations
  layout.tsx            Root layout
  page.tsx              Redirects to /auth/login

components/
  admin/                Admin-specific modals and flows
  auth/                 Shared auth primitives used by auth route views
  entrepreneur/         Entrepreneur-specific modals and content
  layout/               App shell, sidebar, top bar
  shared/               Reusable BID UI system
  ui/                   Radix/shadcn primitives

lib/
  forms/                Zod schemas and form types
  mock-data/            Seed data shaped like future backend tables
  nav/                  Sidebar navigation definitions
  stores/               In-memory admin and entrepreneur stores
  training/             Training progress helpers
  routes.ts             Route constants
  utils.ts              Shared utilities

types/
  index.ts              Core domain types

PROJECT_MEMORY.md       Long-running product and engineering context
BACKEND_MEMORY.md       Long-running backend architecture and implementation rules
docs/backend-design.md  Collaborative backend architecture design document
```

## UI System

The app uses shared components in `components/shared` as the primary UI layer. Prefer these before creating page-specific UI.

Important shared components:

- `Button`
- `Card`, `CardHeader`
- `DataTable`, `TableToolbar`, `TableFilterInput`, `TableFilterSelect`, `TablePagination`, `RowActions`
- `FormField`, `FormInput`, `FormSelect`, `FormAutocomplete`, `FormRow2`
- `Modal`
- `Badge`
- `MetricGrid`, `StatCard`
- `ChartCard`
- `ProgressBar`
- `Tabs`

Data-heavy surfaces should be designed for growth. Tables and table-like views should include search, and larger lists should include filtering, pagination, and page-size controls.

## Current Data Model

The current app uses mock data and in-memory React context stores.

Mock data lives in:

```text
lib/mock-data/
```

State and mutation logic live in:

```text
lib/stores/
```

The mock data is intentionally shaped close to backend tables, including:

- entrepreneurs
- trainers
- programmes
- modules
- content items
- deliverables
- sessions
- tools
- reporting data
- sectors and stages

When backend work starts, the store methods are the main swap points for API/database calls.

## Current Scope

Implemented:

- Auth UI scaffold
- Entrepreneur workspace
- Admin workspace
- In-memory CRUD-style flows
- Modal forms with validation
- Searchable/filterable/paginated operational tables
- Dashboard charts
- Programme builder UI
- Training library and learning path UI
- Content, deliverable, sessions, tools, and reporting flows

Not implemented yet:

- Real authentication
- API routes
- Persistent database writes
- File storage
- Real notifications
- Real top-bar global search
- Role-based route protection

## Development Guidelines

- Read `PROJECT_MEMORY.md` before substantial work.
- Keep routes under the current namespaces: `/auth`, `/entrepreneur`, `/admin`.
- Keep reusable UI in `components/shared`.
- Prefer shared form, table, modal, and card primitives.
- Avoid one-off layouts that will fail when data grows.
- Avoid dead-end actions; actions should open real UI, navigate, update local state, or clearly represent a backend-ready placeholder.
- Keep text readable and controls aligned.
- Use Lucide icons for common UI actions.
- Run `npm run build` after meaningful changes.

## Backend Integration Notes

Future backend work will be implemented as a NestJS API. It should connect around the current boundaries:

- Auth: replace UI-only auth with a real auth provider and role-based routing.
- Data: replace `lib/stores` in-memory mutations with backend calls.
- Storage: wire upload controls to file storage.
- Notifications: connect bell/activity updates to real events.
- Search: replace local filtering with backend-backed search where needed.

The component layer should not need major rewrites if backend integration keeps these boundaries.
