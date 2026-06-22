# BID Hub

A production-grade Next.js (App Router, TypeScript, Tailwind CSS) conversion of the
**BID Entrepreneur Hub** and **BID Admin Console** static HTML mockups.

The visual design — layout, spacing, typography, the `#842751` brand palette and its
light/dark/mid variants, card styles, badges, tables, and SVG icons — is preserved
exactly from the mockups. Every interactive element that faked a toast in the mockup
now performs a real action against in-memory state.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

The landing page (`/`) lets you enter either side:

- **Entrepreneur Hub** → `/dashboard`, `/training`, `/profile`, `/deliverables`,
  `/schedule`, `/tools`
- **Admin Console** → `/admin/dashboard`, `/admin/entrepreneurs`, `/admin/trainers`,
  `/admin/programs`, `/admin/assignments`, `/admin/content`, `/admin/stages-sectors`,
  `/admin/documents`, `/admin/reporting`

## Folder structure

```
/app
  /page.tsx                 # Landing — role selection
  /layout.tsx               # Root layout (Sora + DM Mono fonts, Toaster)
  /globals.css              # BID palette as Tailwind tokens
  /(entrepreneur)/          # Entrepreneur route group (shared layout)
    /layout.tsx             # EntrepreneurProvider + AppShell
    /dashboard …
    /training/[programmeId]/[moduleId]   # nested training routes
    /deliverables/[groupId]
    /profile | /schedule | /tools
  /admin/                   # Admin routes (real /admin segment)
    /layout.tsx             # AdminProvider + AppShell
    /dashboard | /entrepreneurs | /trainers | /programs
    /assignments | /content | /stages-sectors | /documents | /reporting

/components
  /layout   → AppShell, NavSidebar, TopBar
  /shared   → Badge, Card, StatCard, DataTable, Modal, FormField, Button,
              ProgressBar, Avatar, Tabs, Breadcrumb, EmptyStateCard, BarChartRow,
              PageHeader, BidLogo
  /ui       → shadcn/ui primitives (Dialog, Select, Input, Label, …)
  /entrepreneur  → page-specific modals (Booking, UploadDeliverable, …)
  /admin         → page-specific modals (EntrepreneurModal, TrainerModal,
                   ProgramModal, ModuleModal, AssignEntrepreneurModal, …)

/lib
  /mock-data   → entrepreneurs, trainers, programs (+modules+content),
                 deliverables, sessions, tools, documents, reporting,
                 definitions (sectors/stages). Each file is shaped like a DB table.
  /forms       → zod schemas + react-hook-form types
  /stores      → EntrepreneurStore, AdminStore (React context, in-memory CRUD)
  /nav         → entrepreneur-nav, admin-nav
  /training    → progress derivation helpers
  utils.ts     → cn() class merger

/types
  index.ts      → Entrepreneur, Trainer, Program, Module, ContentItem,
                  Deliverable, Session, Tool, PlatformDocument, … + unions

/tailwind.config.ts   → BID brand palette as custom theme colors
```

## What's real vs. mocked

### Real (functional)

- **Routing** — every section has its own URL; tab-switching JS is gone. Nested
  routes for training (`/training/[programmeId]/[moduleId]`) and deliverables
  (`/deliverables/[groupId]`) are bookmarkable.
- **Forms with validation** — `react-hook-form` + `zod` power every modal
  (add/edit entrepreneur, add/edit trainer, add/edit program, add module, add
  content item, book session, upload deliverable, add funding round, submit
  periodic update, request tool, assign entrepreneur, generate document, …).
  Errors surface inline; invalid submissions don't close the modal.
- **State** — `EntrepreneurProvider` and `AdminProvider` (React context) own the
  in-memory state. "Add entrepreneur" actually prepends a row to the list; "Assign"
  actually flips status from `unassigned` → `active`; "Add funding round" actually
  appends to the entrepreneur's `fundingRounds`; "Submit periodic update" actually
  increments jobs/funds metrics. All mutations flow through the store, so swapping
  the data source later is isolated to `/lib/stores`.
- **Auth scaffold** — the landing page acts as a role switcher. A real middleware
  role check is the obvious next step (see below).
- **Accessibility** — semantic HTML, labelled inputs, Radix Dialog (focus-trap, ESC,
  scroll-lock, ARIA), keyboard-navigable nav and drawers.
- **Responsive** — sidebar collapses to a slide-in drawer below `lg`; stat grids and
  card grids reflow from 4→2→1 columns; tables scroll horizontally on mobile.

### Mocked (swap points)

- **Auth** — no real credentials. The landing page links directly into each side.
  `lib/stores/*` are the only consumers of "current user"; a Supabase auth session
  would slot in here.
- **Data persistence** — in-memory React context seeded from `/lib/mock-data/*`.
  Refreshing the page resets to seed data. The store methods (`addEntrepreneur`,
  `assignEntrepreneur`, `generateDocument`, …) are the swap points for Supabase
  writes; the mock-data files are shaped like DB tables so a real backend is a
  one-file-per-table migration.
- **File uploads** — dropzone UI only (deliverables, memo template, content items).
  No storage backend.
- **PDF / document generation** — "Generate memo" / "Generate report" create a row
  in the documents list with a `draft` status and a toast. No actual PDF rendering.
- **Search** — the top-bar search box is decorative; page-level filters (e.g. the
  entrepreneurs table search) do work against in-memory data.

## Brand palette

Defined in `tailwind.config.ts` under `theme.extend.colors`:

| Token        | Hex       | Usage                                    |
| ------------ | --------- | ---------------------------------------- |
| `bid`        | `#842751` | Primary brand                            |
| `bid-dark`   | `#5c1a38` | Hover / dark variant                     |
| `bid-mid`    | `#a8346a` | Mid variant                              |
| `bid-light`  | `#f5e8ef` | Tinted backgrounds, active nav state     |
| `info`       | `#185FA5` | Blue accents (Readiness programme)       |
| `success`    | `#1D9E75` | Green accents (reports, WEE programme)  |
| `warning`    | `#BA7517` | Amber accents (pending, guest access)    |
| `danger`     | `#A32D2D` | Red accents (unassigned, overdue)        |
| `surface`    | `#f7f6f3` | App background                           |
| `surface-panel` | `#ffffff` | Cards / panels                       |
| `surface-subtle` | `#f1efe8` | Subtle backgrounds / hover           |

Fonts: **Sora** (300/400/500/600) for body/UI, **DM Mono** for timestamps and
calendar day labels — matching the mockup's `@import` exactly.

## Production-readiness checklist

To take this to production, the following would need to be built:

1. **Real backend (Supabase).** A Supabase project is available. Migrate each
   `lib/mock-data/*` file into a table (`entrepreneurs`, `trainers`, `programs`,
   `modules`, `content_items`, `deliverables`, `sessions`, `tools`,
   `platform_documents`, `sectors`, `stages`) with RLS policies. Replace the
   in-memory store methods with Supabase queries (`supabase.from('entrepreneurs').insert(…)`,
   etc.). The component layer needs no changes — it already reads/writes through
   `useEntrepreneurStore` / `useAdminStore`.
2. **Real auth.** Supabase email/password. Gate `/admin/*` with a role check
   (`middleware.ts` reading the JWT's `app_metadata.role`). The landing page role
   switcher becomes a real login screen. Trainers need a scoped view (own
   entrepreneurs + sessions only) — drive it off `auth.uid()` RLS policies.
3. **File upload handling.** Supabase Storage buckets for deliverables and memo
   templates. Wire the dropzones to `supabase.storage.from('deliverables').upload(…)`.
   Track file URLs + types on the `deliverables` row.
4. **PDF generation.** For investment memos and progress reports: render a DOCX
   template server-side (e.g. `docxtemplater` in an edge function) with merge fields
   (`{{business_name}}`, `{{stage}}`, `{{ask}}`) filled from the entrepreneur's
   profile, OR generate HTML→PDF via an edge function. Upload the result to Storage
   and link it from the `platform_documents` row.
5. **Real-time notifications.** The notifications bell is static. Wire
   `supabase.channel(…).on('postgres_changes', …)` to push review feedback and
   deadline reminders into the bell.
6. **Charts.** `BarChartRow` is a tinted-div bar. For fuller analytics, swap in
   `recharts` (already a dependency) on the admin reporting page.
7. **Search.** Replace the decorative top-bar search with Postgres full-text search
   (`supabase.from('entrepreneurs').textSearch('business_name', query)`), or a
   `pg_trgm` `ILIKE` across columns.
8. **Pagination.** Tables currently render all rows. Add cursor pagination once the
   data lives in Postgres.
9. **Audit log.** Track who created/edited/assigned what — a `audit_log` table
   written to from each store method.
10. **Tests.** The zod schemas and store reducers are pure functions and easy to
    unit-test; add `vitest` + `@testing-library/react` for the modal forms.

## Source mockups

The two original HTML files are preserved (unmodified) at:

- `app/(entrepreneur)/dashboard/BID_Entrepreneur_Hub_v2.html`
- `app/admin/dashboard/BID_Admin_Console_v2.html`

They are the visual reference for the conversion and are not imported by the app.
