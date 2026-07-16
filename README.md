# BID Hub

BID Hub is a full-stack application for managing entrepreneur support programmes. It gives entrepreneurs a workspace for learning, deliverables, profile updates, sessions, and tools, while giving programme teams and trainers an operational workspace for programme delivery, content, reporting, sessions, and reviews.

The project started UI-first and is now entering backend integration. The frontend still uses mock data in many areas while the NestJS backend, database, jobs, files, email, and calendar integrations are introduced behind the product flows.

> Before making product, UI, routing, or frontend architecture changes, read [PROJECT_MEMORY.md](./PROJECT_MEMORY.md). It captures the standing decisions and long-running context for this application.
>
> Before backend design or implementation work, read [BACKEND_MEMORY.md](./BACKEND_MEMORY.md) and the collaborative backend design doc at [docs/backend-design.md](./docs/backend-design.md).

## Tech Stack

- Monorepo: `apps/web`, `apps/api`, `packages/shared`, root `prisma`
- Frontend: Next.js 13 App Router, React 18, TypeScript, Tailwind CSS, Radix UI/shadcn primitives
- Forms/data UI: React Hook Form, Zod, TanStack Query, Recharts, Lucide React icons, Sonner
- Backend: NestJS, PostgreSQL, Prisma
- Jobs/cache: BullMQ + Redis
- Runtime: local and production Docker Compose with separate frontend and backend services
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

## Docker

Local Docker runs the application as a small system:

- `web`: Next.js frontend on `http://localhost:3000`
- `api`: NestJS HTTP backend on `http://localhost:4000/api`
- `worker`: dedicated NestJS BullMQ consumer for email, notifications, audit, and scheduled workflows
- `postgres`: PostgreSQL on `localhost:5433` by default
- `redis`: internal-only Redis queue backend
- `email-preview`: React Email template preview on `http://localhost:3001`
- `mailpit`: local email catcher on `http://localhost:8025`
- `minio`: private local object storage on `http://localhost:9001`
- `pgadmin`: local PostgreSQL admin UI on `http://localhost:5050`

Create the ignored local environment file once, then start the stack:

```bash
cp .env.docker.example .env.local
npm run docker:dev
```

The development Compose file injects `.env.local` into the relevant containers. The API registers BullMQ Job Schedulers while the separate worker consumes jobs; Redis is intentionally not published to the host. API health includes Redis connectivity, queue counts, and a TTL-backed worker heartbeat.

Local pgAdmin account:

- Email: `admin@example.com`
- Password: `admin123`

The local Postgres server is pre-registered as `BID Hub Local Postgres`. If you ever need to add it manually, use:

- Host: `postgres`
- Port: `5432`
- Database: `bid_hub`
- Username/password: `bid` / `bid`

Production compose is intentionally separate:

```bash
npm run docker:prod
```

Use `.env.docker.example` as the only local environment template. Production Compose intentionally reads the root `.env` that will be provisioned for deployment; it does not use `.env.local`.

Seed local data after the database is running:

```bash
npm run prisma:seed
```

Local seeded admin account:

```text
Email: admin@bid.org
Password: Password123!
```

## Main Workspaces

### Auth

Auth pages live under `/auth`.

- `/auth/login`
- `/auth/signup`
- `/auth/onboarding`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/verify-email`

Login and signup are separate routes with shared auth tabs, so switching tabs updates the URL. Regular email signup collects the required details directly and moves to email verification. `/auth/onboarding` is only for Google signup when required details are missing. Email/password auth is connected to the NestJS API with httpOnly cookie sessions. Google OAuth is still pending backend implementation.

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
apps/
  web/
    app/                Auth, entrepreneur, admin, and trainer routes
    components/         UI system, role-specific components, Radix primitives
    lib/                mock data, stores, routes, helpers
    types/              frontend domain types
  api/
    src/                NestJS backend source

packages/
  shared/
    src/                shared constants, types, and contracts once stable

prisma/
  schema.prisma         database schema and migrations

docker-compose.yml      local development stack
docker-compose.prod.yml production stack

PROJECT_MEMORY.md       Long-running product and engineering context
BACKEND_MEMORY.md       Long-running backend architecture and implementation rules
docs/backend-design.md  Collaborative backend architecture design document
```

## UI System

The app uses shared components in `apps/web/components/shared` as the primary UI layer. Prefer these before creating page-specific UI.

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
apps/web/lib/mock-data/
```

State and mutation logic live in:

```text
apps/web/lib/stores/
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

- Google OAuth backend flow
- Most domain API routes
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
