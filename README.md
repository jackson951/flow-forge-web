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

| Command                                       | Purpose                                                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                 | Dev server with HMR                                                                                                         |
| `npm run build`                               | Type-check + production build to `dist/`                                                                                    |
| `npm run lint` / `typecheck` / `format:check` | Static checks                                                                                                               |
| `npm test`                                    | Vitest + Testing Library; the API is mocked by MSW, so no backend is needed                                                 |
| `npm run api:types`                           | Regenerate `src/types/openapi.ts` from the running backend (`API_DOCS_URL` overrides `http://localhost:3000/api/docs-json`) |

## Testing

| Command                | What it runs                                                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | Unit and component tests (Vitest + Testing Library + MSW). Offline: any request without an MSW handler fails the test                                                                                                                                                                             |
| `npm run test:cov`     | The same with coverage; thresholds (≥ 70 % lines overall, ≥ 90 % on pure-logic modules) fail the run                                                                                                                                                                                              |
| `npm run check:bundle` | After `npm run build`: initial JS ≤ 200 KB gzip and React Flow not in the initial load                                                                                                                                                                                                            |
| `npm run gate`         | format → lint → typecheck → coverage → build → bundle budget (what CI runs)                                                                                                                                                                                                                       |
| `npm run test:e2e`     | Playwright journeys against the **real backend**: starts an isolated Docker Compose stack (`e2e/docker-compose.e2e.yml`: Postgres on tmpfs, Redis, migrate, API, worker, fake AI, TEST webhooks) with throwaway secrets, builds and serves the app on :4173, runs the journeys, removes the stack |

E2E prerequisites: Docker, the backend checkout (default `../../flowforge-api/flowforge-api`, override with `FLOWFORGE_API_DIR`), and once `npm run test:e2e:install` for Chromium. `E2E_KEEP_STACK=1` keeps the stack for debugging; `E2E_EXTERNAL_API=http://localhost:3000` uses a backend you started yourself (journey 2 then needs the TEST provider enabled). Retries are off on purpose: a flaky test is fixed or quarantined, never silently retried.

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

The image builds with Node 22 and serves `dist/` from unprivileged nginx (uid 101, port 8080). It holds no Node, source, `.env` or build-time secrets. nginx:

- serves the SPA, falling back to `index.html` for deep links; the shell is `no-store`, hashed `/assets/` are cached immutably;
- proxies `/api/` to the `api:3000` upstream on the same origin, so the `SameSite=Strict` refresh cookie works;
- sends a strict CSP (`script-src 'self'`, `frame-ancestors 'none'`, no third-party origins; fonts are self-hosted), `nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and HSTS only when served over HTTPS (directly or via `X-Forwarded-Proto: https`).

### Full stack

`docker-compose.yml` runs Postgres, Redis, backend migrate → API + worker and the web container. The backend is built from the `flowforge-api` checkout (`FLOWFORGE_API_DIR`, default `../../flowforge-api/flowforge-api`).

```bash
cp stack.env.example stack.env   # fill in JWT secrets (+ encryption keys / integrations); git-ignored
docker compose up -d --build
# open http://localhost:8080
docker compose down              # add -v to drop the stack's database
```

The stack uses its own project name, volumes and port, so it does not touch a local dev database or the backend's own Compose stack.

### CI

`.github/workflows/ci.yml` runs format, lint, typecheck, tests with coverage, build and the bundle budget. It also runs a gitleaks scan of the history, builds the image, scans it with Trivy (fails on fixable HIGH/CRITICAL), and smoke-tests the container (non-root, security headers, deep-link fallback, immutable assets). The browser E2E suite (`e2e.yml`) is a manual workflow because it needs the backend repository. Dependabot keeps npm, Actions and base images current.
