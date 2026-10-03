# FlowForge Web

Frontend for **FlowForge** — an integration & workflow automation platform. React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router 7 · TanStack Query · React Flow.

> Scaffold stage: routing, layout, design tokens and feature folders are in place; pages show designed empty states. The scaffold predates the backend and does not match its API yet — the delivery plan, starting with that alignment, is in **[docs/frontend](docs/frontend/00-FRONTEND-ROADMAP.md)** (15 parts, built one at a time).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 — /api is proxied to http://localhost:3000
```

Run the `flowforge-api` backend alongside it. The dev proxy keeps the browser same-origin, so httpOnly auth cookies work without CORS setup.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run lint` / `typecheck` / `format:check` | Static checks |
| `npm test` | Vitest + Testing Library; the API is mocked by MSW, so no backend is needed |
| `npm run api:types` | Regenerate `src/types/openapi.ts` from the running backend (`API_DOCS_URL` overrides `http://localhost:3000/api/docs-json`) |

## API contract

- All calls go through `src/lib/api-client.ts` to `/api/v1` on the same origin (Vite proxies `/api` to the backend in dev; nginx in production). Errors arrive as `ApiError` with the backend envelope: `status`, `messages`, `details`/`code`, `requestId`, `retryAfterSeconds`.
- The access token is kept in memory only (`src/lib/access-token.ts`); the refresh token is the backend's httpOnly cookie.
- Types: `src/types/openapi.ts` is generated from the backend's Swagger; `src/types/api.ts` re-exports those and adds hand-written types for responses Swagger does not describe (each names its backend source).
- Tenant pages live under `/w/:workspaceId/...` (`src/lib/routes.ts`); every tenant query key starts with `['ws', workspaceId]` (`src/lib/query-keys.ts`).
- Mocks: `src/test/msw/` has a handler for every endpoint the app calls, with typed fixtures; a test fails if a call has no handler.

## Structure

```
src/
  app/            providers, query client, route tree
  config/         typed env (zod)
  lib/            api client, query keys, cn()
  types/          API contract types (mirror backend enums/DTOs)
  styles/         Tailwind entry + design tokens (@theme)
  components/
    ui/           Button, Input, Field, Panel, StatusBadge, Skeleton, Spinner
    layout/       AppShell, Sidebar, AuthLayout, PageHeader, PageContainer
    feedback/     EmptyState, ErrorState, RouteError
  features/
    auth/         login, register, RequireAuth, schemas, api hooks
    workspaces/   workspace API, current-workspace hook, redirect
    dashboard/
    workflows/    list, editor (React Flow canvas, palette, config panel), node catalog
    runs/         list, detail, step timeline
    integrations/
    settings/
  pages/          not-found
  test/           setup + renderRoute helper
```

Feature folders own their pages, components and API hooks; `components/` holds only what's shared. The workflow editor is code-split so React Flow loads only when it opens.

## Design tokens

Defined once in `src/styles/index.css` under `@theme` (rationale and screen scope: [docs/frontend/design/DESIGN-DIRECTION.md](docs/frontend/design/DESIGN-DIRECTION.md)): navy navigation rail `sidebar #0F1629`, indigo `primary #4F46E5` for actions, focus and the active item, `canvas #F5F6FA`, white `surface`, `line #E4E7EC`, `muted #667085`, `ink #101828` for text. Run statuses have their own colours and always pair with a text label. Type is Instrument Sans, with JetBrains Mono for identifiers only.

Logo: `src/components/brand/logo.tsx` (`LogoMark`, `Logo` with `tone` and the tagline "Automate what matters"), the same drawing as `public/favicon.svg`.

## Docker

`docker build -t flowforge-web .` serves the build via nginx, proxying `/api/` to a container named `api`.
