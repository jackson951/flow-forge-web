# FlowForge Frontend Roadmap

Master plan and live status for the FlowForge web app. Each part has its own specification in this folder; this file tracks status and the rules for calling a part complete. The backend it talks to is documented in `flowforge-api/docs/backend` (release report: `22-BACKEND-RELEASE-READINESS.md`).

## Status Checklist

Legend: **NOT STARTED** · **IN PROGRESS** · **COMPLETE** (meets the Definition of Done, evidence recorded in the part's file) · **BLOCKED** (waiting on something outside this repo; the blocker is named).

| # | Part | Status | Notes |
| --- | --- | --- | --- |
| 01 | [Foundation and API Contract](01-FOUNDATION-AND-API-CONTRACT.md) | NOT STARTED | Scaffold exists but predates the backend; contract mismatches listed below |
| 02 | [Authentication and Session](02-AUTHENTICATION-AND-SESSION.md) | NOT STARTED | — |
| 03 | [Workspaces and Members](03-WORKSPACES-AND-MEMBERS.md) | NOT STARTED | — |
| 04 | [Workflow List and Management](04-WORKFLOW-LIST-AND-MANAGEMENT.md) | NOT STARTED | — |
| 05 | [Workflow Editor Canvas](05-WORKFLOW-EDITOR-CANVAS.md) | NOT STARTED | — |
| 06 | [Node Configuration and Data Mapping](06-NODE-CONFIGURATION-AND-DATA-MAPPING.md) | NOT STARTED | — |
| 07 | [Drafts, Validation, Publishing and Versions](07-DRAFTS-VALIDATION-PUBLISHING.md) | NOT STARTED | — |
| 08 | [Runs: Trigger, History and Detail](08-RUNS.md) | NOT STARTED | — |
| 09 | [Dashboard](09-DASHBOARD.md) | NOT STARTED | — |
| 10 | [Integrations](10-INTEGRATIONS.md) | NOT STARTED | — |
| 11 | [Account and Settings](11-ACCOUNT-AND-SETTINGS.md) | NOT STARTED | — |
| 12 | [UX Quality and Accessibility](12-UX-QUALITY-AND-ACCESSIBILITY.md) | NOT STARTED | Cross-cutting; checked again in every later part |
| 13 | [Testing and Quality Gate](13-TESTING-AND-QUALITY-GATE.md) | NOT STARTED | — |
| 14 | [Build, Docker and CI](14-BUILD-DOCKER-AND-CI.md) | NOT STARTED | — |
| 15 | [Frontend Release Readiness](15-FRONTEND-RELEASE-READINESS.md) | NOT STARTED | — |

## Product Purpose

The web app is how a person uses FlowForge: sign in, pick a workspace, connect GitHub / Slack / Microsoft, build a small workflow graph (trigger → conditions → actions), publish it, start or watch runs, and understand failures. It is a **developer-tool-quality** UI: fast, honest about state (a run that may have done something says so), keyboard-friendly, and never shows data from another workspace.

## Order and Dependencies

```
01 ─▶ 02 ─▶ 03 ─┬─▶ 04 ─▶ 05 ─▶ 06 ─▶ 07 ─┐
                ├─▶ 10 ──────────────▶ 06   ├─▶ 08 ─▶ 09
                └─▶ 11                      │
12 (cross-cutting, from 02 onwards) ────────┤
13 (tests grow with every part; gate closed in 13) ─▶ 14 ─▶ 15
```

- 06 needs 10 for integration pickers (repositories, Slack channels, To Do lists); the forms can be built first with a "connect an integration" state.
- 08 needs 07 (only published workflows run). 09 reuses 08's run components.

## Backend Contract Facts (verified 2026-10-03 against `flowforge-api` main)

| Topic | Fact the UI must follow |
| --- | --- |
| Base path | `/api/v1/...`; tenant routes are `/workspaces/:workspaceId/...` (non-members get **404**, never 403) |
| Session | Login/register/refresh return `{ user, accessToken, expiresIn, refreshToken }` and set an httpOnly `ff_refresh` cookie (`SameSite=Strict`, path `/api/v1/auth`). Access token 15 min, refresh 7 d with rotation and reuse detection |
| Errors | One envelope: `{ statusCode, error, message (string \| string[]), details?, requestId, path, timestamp }`; `x-request-id` header; 429 carries `Retry-After` |
| Definitions | `{ schemaVersion: 1, nodes: [{ key, kind: TRIGGER\|ACTION\|CONDITION, type, config, position? }], edges: [{ from, to, branch? }] }`; limits 50 nodes / 100 edges / 256 KB |
| Draft saves | `PUT …/draft { expectedRevision, definition }` → returns validation `issues`; stale revision → 409 |
| Workflow status | `DRAFT \| PUBLISHED \| ARCHIVED` |
| Node types | `GET /node-types` → `{ type, kind, displayName, unavailableReason }` only — **no config schema**, so config forms are written per node type (Part 06) |
| Pagination | Keyset: `?limit&cursor` → `{ items, nextCursor }` (runs, workflows; versions use the version number) |
| Runs | Manual start `POST …/workflows/:id/runs { input }` (+ `Idempotency-Key`) → 202 `{ runId, status }`; retry may require `acknowledgeUncertainOutcome`; 409 `PAYLOADS_TRIMMED`; 429 `QUEUE_BACKPRESSURE` |
| OAuth | `POST …/integrations/:provider/connect` → `{ url }`; the provider returns the browser to `FRONTEND_URL/integrations?provider=&status=connected\|error&connectionId=&reason=` |
| API docs | Swagger at `/api/docs`, JSON at `/api/docs-json`; every operation has a summary and error responses; 20 success bodies have no typed schema |

### Scaffold gaps (why Part 01 comes first)

The scaffold was written before the backend existed. Known mismatches: base URL `/api` (not `/api/v1`); no workspace in any path; cookie-only session assumed (no access token, no refresh); `WorkflowStatus` uses `ACTIVE`; definition shape uses `trigger` + `nodes[].id`; draft save sends the bare definition; `User`, `RunSummary`, `DashboardSummary`, `IntegrationConnection` field names differ; error class drops `details`/`error`.

## Rules for Each Part

1. Read the spec. 2. Inspect the code (and the backend endpoint it uses). 3. Implement only that part. 4. Run format, lint, typecheck, tests and build. 5. Verify each acceptance criterion — in the browser against the real backend where the criterion is user-visible. 6. Record evidence in the part's file and update this roadmap. 7. Stop and report.

- Never silently skip a failed acceptance criterion; never invent results; never weaken a requirement to mark a part complete. Code existing is not completion.
- One branch per part (`feat/part-NN-<slug>`); never work on `main`.
- Never commit `.env` or secrets. No tokens in `localStorage`/`sessionStorage`.

## Definition of Done (every part)

- All acceptance criteria verified, with evidence (test names, screenshots or recorded browser checks, command output).
- `npm run format:check`, `lint`, `typecheck`, `test`, `build` pass.
- New UI: loading, empty, error and permission-denied states designed; keyboard reachable; labels on every control; status never conveyed by colour alone (Part 12 checklist).
- API calls go through the typed client; server data through TanStack Query with keys from `query-keys.ts`; workspace id part of every tenant query key.
- No `any`; no unused code; components small enough to read.
- Tests: unit/component tests for logic and interaction; MSW handlers for API states; E2E for the part's main journey once Part 13's harness exists.

## Change Log

| Date | Change |
| --- | --- |
| 2026-10-03 | Roadmap and Parts 01–15 written from the backend release state and the existing scaffold. |
