# FlowForge Web

Frontend for **FlowForge** — an integration & workflow automation platform. React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router 7 · TanStack Query · React Flow.

> Scaffold stage: routing, layout, design tokens, API client and feature folders are in place. Pages show designed empty states; data-fetching hooks exist but aren't wired into pages yet.

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
| `npm test` | Vitest + Testing Library |

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

Defined once in `src/styles/index.css` under `@theme`: ink `#1E2A3B` (navigation, primary actions), canvas `#F4F5F7`, surface `#FFFFFF`, line `#DCE0E6`, muted `#5E6A7A`, and a single ember accent `#F2A33A` reserved for focus rings and the active item. Run statuses have their own colors and always pair with a text label. Type is Instrument Sans, with JetBrains Mono for identifiers only.

## Docker

`docker build -t flowforge-web .` serves the build via nginx, proxying `/api/` to a container named `api`.
