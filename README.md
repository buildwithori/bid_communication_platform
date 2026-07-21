# BID Hub

BID Hub is a full-stack application for managing entrepreneur support programmes. It gives entrepreneurs a workspace for learning, deliverables, profile updates, sessions, and tools, while giving programme teams and trainers an operational workspace for programme delivery, content, reporting, sessions, and reviews.

The product flows are integrated with the NestJS API. PostgreSQL owns business state, BullMQ workers handle background work, and the web application consumes role-scoped API modules through its frontend integration layer.

> Before making product, UI, routing, or frontend architecture changes, read [PROJECT_MEMORY.md](./PROJECT_MEMORY.md). It captures the standing decisions and long-running context for this application.
>
> Before backend design or implementation work, read [BACKEND_MEMORY.md](./BACKEND_MEMORY.md) and the collaborative backend design doc at [docs/backend-design.md](./docs/backend-design.md).

## Tech Stack

- Monorepo: `apps/web`, `apps/api`, `packages/shared`, root `prisma`
- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Radix UI/shadcn primitives
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

`DATABASE_URL` uses the Docker hostname `postgres`. Host-run Prisma commands use `DATABASE_HOST_URL` from the same file so migrations, seed, and Studio connect through the published Postgres port.

Local pgAdmin account:

- Email: `admin@example.com`
- Password: `admin123`

The local Postgres server is pre-registered as `BID Hub Local Postgres`. If you ever need to add it manually, use:

- Host: `postgres`
- Port: `5432`
- Database: `bid_hub`
- Username/password: `bid` / `bid`

Production Compose is intentionally separate and includes Caddy-managed HTTPS, automatic migrations, durable Redis queues, bounded logs, non-root application containers, and health-gated startup:

```bash
npm run docker:prod
```

Use `.env.docker.example` as the local environment template. For deployment, copy `.env.production.example` to the ignored root `.env`; production Compose never loads `.env.local`.

Read [docs/production-deployment.md](./docs/production-deployment.md) before a production deployment. It documents required secrets and integrations, DNS/TLS, deployment, verification, backups, and rollback.

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

Login and signup are separate routes with shared auth tabs, so switching tabs updates the URL. Regular email signup collects the required details directly and moves to email verification. `/auth/onboarding` is only for Google signup when required details are missing. Email/password auth uses httpOnly cookie sessions, and Google OAuth supports entrepreneur login and signup.

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
    lib/                API modules, stores, routes, and helpers
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

Application business data is persisted through Prisma/PostgreSQL. Static reference datasets may remain in the web application only where they are intentionally code-owned rather than server-managed.

## Current Scope

Implemented:

- Email/password and Google authentication with role-based workspace protection
- Entrepreneur, trainer, and admin workspaces backed by role-scoped APIs
- Programme, content, learning, deliverable, tool, session, and reporting workflows
- Private object storage, Mux video, Google Calendar/Meet, and linked notifications
- Cursor-paginated operational lists and backend-computed dashboards/aggregates
- BullMQ workers for transactional email, notification delivery, audit processing, recurring deliverables, and report exports

## Development Guidelines

- Read `PROJECT_MEMORY.md` before substantial work.
- Keep routes under the current namespaces: `/auth`, `/entrepreneur`, `/admin`.
- Keep reusable UI in `components/shared`.
- Prefer shared form, table, modal, and card primitives.
- Avoid one-off layouts that will fail when data grows.
- Avoid dead-end actions; actions must open real UI, navigate, or persist a real state change.
- Keep text readable and controls aligned.
- Use Lucide icons for common UI actions.
- Run `npm run build` after meaningful changes.

## Frontend API Integration

Frontend requests, query keys, hooks, and API types live in domain folders under `apps/web/lib/api`. Routed pages and visual components consume those hooks rather than importing TanStack Query or calling the API client directly. See [docs/frontend-api-integration.md](./docs/frontend-api-integration.md).
