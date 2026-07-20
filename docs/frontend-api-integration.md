# Frontend API Integration Structure

Frontend routes and UI components must not own transport, cache, or server-state orchestration.

## Feature layout

Each backend-integrated feature lives under `apps/web/lib/api/<feature>/`:

```text
<feature>/
  types.ts      # API payloads, response DTOs, shared feature data types
  requests.ts   # raw apiRequest calls; private to the feature integration layer
  keys.ts       # stable TanStack query-key factory
  hooks.ts      # queries, mutations, invalidation, optimistic/cache behavior
  urls.ts       # optional external/OAuth URL builders
  index.ts      # public feature barrel: hooks and consumer-safe types only
```

Pages and components import from the feature barrel, for example:

```ts
import { useLoginMutation, type AuthUser } from '@/lib/api/auth';
```

They must not import `@tanstack/react-query`, `apiRequest`, `requests.ts`, or query keys directly. The root `app/providers.tsx` is the infrastructure exception because it owns `QueryClientProvider`.

## Responsibility boundary

- Pages/components own rendering, local interaction state, navigation, toasts, and mapping form values into feature-hook payloads.
- Feature hooks own TanStack Query, request execution, query keys, cache invalidation, pagination orchestration, and optimistic updates.
- Request modules own HTTP paths and serialization only.
- API/domain payload and response types belong in feature `types.ts` files.
- A type may remain beside a page or component only when it describes that page or component's private presentation state, such as a tab union, table-only row shape, or modal draft.
- Types shared by multiple UI files move to the closest feature-level `types.ts`; reusable API contracts must never be declared in a page.

## Pagination and lazy lookups

List and lookup hooks must expose cursor pagination or infinite-query behavior. Backend-backed autocomplete hooks preload with the containing lifecycle: page filters when their page/view is active, modal fields when the modal opens, and dependent fields only after required parent values exist. A dropdown click must not trigger the initial request. Query keys must include normalized filters/search state, and results remain cursor-paginated rather than eagerly loading the full option set.

All user-entered searches use `useDebouncedValue` from `lib/search` before reaching API hooks or expensive local filters. The standard delay is 300 ms, while clearing is propagated on the next event-loop tick. `FormAutocomplete` owns remote-search debouncing globally; consumers pass its already-debounced search state directly to lazy hooks and must not wrap it in another debounce.

Pass option-query loading state to the shared autocomplete/select primitive. The trigger renders a themed inline spinner while options are loading, so dependent fields visibly communicate repopulation after a parent value changes.
