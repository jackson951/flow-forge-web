# 14 — Build, Docker and CI

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

## Objective

A reproducible production build served by a hardened nginx image, running same-origin with the backend, and a CI pipeline that enforces the quality gate.

## Scope

Production build, Dockerfile + nginx config, security headers, Compose integration with the backend stack, CI workflow, dependency and secret scanning.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-14.1 | Multi-stage Dockerfile: build with Node 22, serve `dist/` with nginx (unprivileged image, non-root, port 8080); no Node, no source, no `.env` in the final image. |
| FR-14.2 | nginx: SPA fallback to `index.html`; `/api/` proxied to the backend service (same origin, so the `SameSite=Strict` refresh cookie works); hashed assets cached immutably, `index.html` not cached; gzip/brotli. |
| FR-14.3 | Security headers: strict CSP (`default-src 'self'`; no inline scripts; `connect-src 'self'`), `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`, HSTS when served over TLS. |
| FR-14.4 | Runtime config: the app needs no build-time secrets; `VITE_API_BASE_URL` stays `/api/v1` (same origin). |
| FR-14.5 | Compose: a `web` service added to a full-stack Compose setup (backend `migrate` → `api` + `worker`, Postgres, Redis, `web`), so `docker compose up` gives a working app on one port; health check on `/`. |
| FR-14.6 | CI: format, lint, typecheck, unit tests + coverage, build with bundle-size report and budget check (Part 12), E2E job against the backend image, image build + Trivy scan pinned by digest, gitleaks; `permissions: contents: read`; concurrency cancels stale runs. |
| FR-14.7 | Dependabot for npm and GitHub Actions. |

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-14.1 | `docker compose up` serves the full app; login and a run work through the web container | Recorded run |
| AC-14.2 | Image runs as non-root, contains only static files + nginx, scan has no HIGH/CRITICAL with a fix | CI job |
| AC-14.3 | Security headers present and the app works under the CSP | Browser check + automated header test |
| AC-14.4 | CI green on the PR with every gate step | CI link |
| AC-14.5 | Deep links (`/w/:id/runs/:runId`) load directly after a hard refresh | Browser against the container |

## Dependencies

Parts 12–13; backend Docker image.
