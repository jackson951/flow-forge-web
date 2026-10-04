# FlowForge Frontend Roadmap

Master plan and live status for the FlowForge web app. Each part has its own specification in this folder; this file tracks status and the rules for calling a part complete. The backend it talks to is documented in `flowforge-api/docs/backend` (release report: `22-BACKEND-RELEASE-READINESS.md`).

## Status Checklist

Legend: **NOT STARTED** · **IN PROGRESS** · **COMPLETE** (meets the Definition of Done, evidence recorded in the part's file) · **BLOCKED** (waiting on something outside this repo; the blocker is named).

| # | Part | Status | Notes |
| --- | --- | --- | --- |
| 01 | [Foundation and API Contract](01-FOUNDATION-AND-API-CONTRACT.md) | COMPLETE | Verified 2026-10-03: typed client for /api/v1 with the backend error envelope, types generated from the backend Swagger (reproducible), /w/:workspaceId URLs, workspace-scoped query keys, MSW for every endpoint (78 tests), dev proxy checked against the real backend |
| 02 | [Authentication and Session](02-AUTHENTICATION-AND-SESSION.md) | COMPLETE | Verified 2026-10-03 in Chromium against the real backend: token in memory only, httpOnly cookie, restore on reload, single-flight refresh + Web Locks across tabs, sign-out across tabs and devices, safe ?next=, 429 countdown. Backend finding: a lost refresh race clears the newer cookie |
| 03 | [Workspaces and Members](03-WORKSPACES-AND-MEMBERS.md) | COMPLETE | Verified 2026-10-03 with two real users: switcher, guard for foreign workspace URLs, last-used workspace, create/rename/leave/delete, members with backend-identical role policy; new palette and logo, branded login. Backend finding reproduced 5/5: a reload during session refresh signs the user out |
| 04 | [Workflow List and Management](04-WORKFLOW-LIST-AND-MANAGEMENT.md) | COMPLETE | Verified 2026-10-03: keyset Load more, filters in URL, create/rename (optimistic)/duplicate/archive/unarchive/delete with archive-instead on 409, member restrictions; menus never clipped (portal), icons everywhere incl. GitHub/Slack/Microsoft logos. Product owner tested manually |
| 05 | [Workflow Editor Canvas](05-WORKFLOW-EDITOR-CANVAS.md) | COMPLETE | Verified 2026-10-03 in Chromium against the real backend: palette drag, mouse-drawn condition branches saved with correct `branch`, layout persists across reload, rules mirror the backend validator, undo/redo of every edit (keyboard delete fixed to one step), unsaved-changes guard, archived read-only; Anthropic logo for AI steps |
| 06 | [Node Configuration and Data Mapping](06-NODE-CONFIGURATION-AND-DATA-MAPPING.md) | COMPLETE WITH DEFERRALS | 2026-10-03: a form for every node type mirroring the backend schemas, `{{` reference suggestions (upstream only), condition builder (depth 4, preview), connection + resource pickers in every state, client and server errors on the same field; 279 tests green. Deferred: browser validation against the backend (waived by product owner) and real-account pickers (needs connected accounts) |
| 07 | [Drafts, Validation, Publishing and Versions](07-DRAFTS-VALIDATION-PUBLISHING.md) | COMPLETE | 2026-10-03: autosave with a non-overlapping save queue and revision chaining, conflict dialog (reload theirs / overwrite), issues panel that navigates to steps, publish gating and confirmation, versions panel + read-only version page + restore, status bar, collapsible editor panels; 298 tests green; browser checks passed in the product owner's QA |
| 08 | [Runs: Trigger, History and Detail](08-RUNS.md) | COMPLETE | Verified 2026-10-03: component tests + product-owner QA with the real backend and worker (manual and GitHub-triggered runs, branches, Slack message posted) |
| 09 | [Dashboard](09-DASHBOARD.md) | COMPLETE | Verified 2026-10-03: component tests + product-owner QA |
| 10 | [Integrations](10-INTEGRATIONS.md) | COMPLETE | Verified 2026-10-03 for GitHub/Slack/Microsoft: component tests + product-owner QA. BYOK AI connections: later enhancement (backend Part 23) |
| 11 | [Account and Settings](11-ACCOUNT-AND-SETTINGS.md) | COMPLETE | Verified 2026-10-03: component tests + product-owner QA |
| 12 | [UX Quality and Accessibility](12-UX-QUALITY-AND-ACCESSIBILITY.md) | COMPLETE | Verified 2026-10-03: axe on every page, error mapping, toasts, keyboard connect, responsive, public site, robust auth; product-owner QA passed; bundle budget fixed in Part 13 (188.8 KB gzip) |
| 13 | [Testing and Quality Gate](13-TESTING-AND-QUALITY-GATE.md) | IN PROGRESS | 2026-10-03: coverage thresholds (95.25 % lines; ≥ 90 % pure logic), gate script + CI coverage/bundle, Playwright harness with real backend stack and six journeys — E2E suite not run yet |
| 14 | [Build, Docker and CI](14-BUILD-DOCKER-AND-CI.md) | IN PROGRESS | Implemented; local gate green (400 tests). Container, CI and browser criteria await QA and the PR CI run |
| 15 | [Frontend Release Readiness](15-FRONTEND-RELEASE-READINESS.md) | NOT STARTED | — |
| 16 | [Expanded-Platform Foundations](16-EXPANDED-PLATFORM-FOUNDATIONS.md) | IN PROGRESS | Implemented 2026-10-04 (444 tests, gate green): regenerated types, Jira/Gmail logos, trigger sources, status reasons, provider-grouped palette, pending-form panels, reference catalogue. Awaiting product-owner QA |
| 17 | [Schedule Trigger](17-SCHEDULE-TRIGGER.md) | IN PROGRESS | Implemented 2026-10-04 (474 tests, gate green): schedule picker for all 7 kinds, timezone, next-run preview with DST notes, schedule summary, Run now for scheduled workflows, scheduled-run details. Awaiting product-owner QA |
| 18 | [HTTP Connections and Request](18-HTTP-CONNECTIONS-AND-REQUEST.md) | NOT STARTED (spec approved) | Credential connections (6 auth types, test, rotate), `http.request` form, response in mappings (backend Part 24) |
| 19 | [Generic Webhook Trigger](19-GENERIC-WEBHOOK-TRIGGER.md) | NOT STARTED (spec approved) | Verification modes and presets, URL + secret once, rotation, Listen test capture, delivery log + replay (backend Part 24) |
| 20 | [HTTP Poll Trigger](20-HTTP-POLL-TRIGGER.md) | NOT STARTED (spec awaiting approval) | Poll form (items, identity, cursor, first poll), sample-response check, poll status panel (backend Part 24) |
| 21 | [Jira Integration](21-JIRA-INTEGRATION.md) | NOT STARTED (spec awaiting approval) | Connect + sites, cascading pickers, 3 triggers, 7 actions (backend Part 25) |
| 22 | [Gmail Integration](22-GMAIL-INTEGRATION.md) | NOT STARTED (spec awaiting approval) | Connect with access note, label picker, 2 triggers, 7 actions, privacy-conscious email display (backend Part 26) |

## Product Purpose

The web app is how a person uses FlowForge: sign in, pick a workspace, connect GitHub / Slack / Microsoft, build a small workflow graph (trigger → conditions → actions), publish it, start or watch runs, and understand failures. It is a **developer-tool-quality** UI: fast, honest about state (a run that may have done something says so), keyboard-friendly, and never shows data from another workspace.

## Design Direction

Visual style and screen scope: [design/DESIGN-DIRECTION.md](design/DESIGN-DIRECTION.md) (from the UI mock). **Only screens backed by the real API are built**; mock elements without a backend (credentials page, templates, HTTP/schedule/delay/loop nodes, billing, extra providers, single-step test) are out of scope.

## Order and Dependencies

```
01 ─▶ 02 ─▶ 03 ─┬─▶ 04 ─▶ 05 ─▶ 06 ─▶ 07 ─┐
                ├─▶ 10 ──────────────▶ 06   ├─▶ 08 ─▶ 09
                └─▶ 11                      │
12 (cross-cutting, from 02 onwards) ────────┤
13 (tests grow with every part; gate closed in 13) ─▶ 14 ─▶ 15

Expanded platform (backend Parts 23–27), before 15:
16 ─┬─▶ 17 ─────────┐
    ├─▶ 18 ─▶ 20 ◀──┘ (poll reuses 17's schedule picker and 18's connections)
    ├─▶ 19
    ├─▶ 21
    └─▶ 22                         16–22 ─▶ 15
```

- 16 first (shared types, icons, vocabulary). 17–22 then in the order listed; 21 and 22 are independent of 17–20 and can be swapped.
- 15 (release readiness) runs last, over the whole app.

- 06 needs 10 for integration pickers (repositories, Slack channels, To Do lists); the forms can be built first with a "connect an integration" state.
- 08 needs 07 (only published workflows run). 09 reuses 08's run components.

## Backend Contract Facts (verified 2026-10-03 against `flowforge-api` main; expanded-platform facts in [Part 16](16-EXPANDED-PLATFORM-FOUNDATIONS.md#backend-contract-facts-added-to-the-roadmap))

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
- **Icons everywhere (product owner rule, 2026-10-03):** no text-only UI. Providers show their real logos (GitHub, Slack, Microsoft — `components/brand/provider-icons.tsx`), node types their icon (`NodeTypeIcon`), and statuses, actions, page headers, filters, empty states and metadata get a meaningful lucide icon. Icons are decorative (`aria-hidden`); the text label stays for accessibility.
- **Menus are never clipped (product owner rule, 2026-10-03):** row-action menus, dropdowns and popovers render through a portal with fixed positioning (shared `ActionMenu`), opening upward near the bottom — never `absolute` inside a table or scroll container. Browser checks open the menu on the last row.
- New UI: loading, empty, error and permission-denied states designed; keyboard reachable; labels on every control; status never conveyed by colour alone (Part 12 checklist).
- API calls go through the typed client; server data through TanStack Query with keys from `query-keys.ts`; workspace id part of every tenant query key.
- No `any`; no unused code; components small enough to read.
- Tests: unit/component tests for logic and interaction; MSW handlers for API states; E2E for the part's main journey once Part 13's harness exists.

## Change Log

| Date | Change |
| --- | --- |
| 2026-10-03 | Roadmap and Parts 01–15 written from the backend release state and the existing scaffold. |
| 2026-10-03 | Design direction added (UI mock; real screens only). Part 01 COMPLETE. Next: Part 02 (authentication and session). |
| 2026-10-03 | Part 02 COMPLETE. Next: Part 03 (workspaces and members). |
| 2026-10-03 | Part 03 COMPLETE (with the new logo and branded login). Next: Part 04 (workflow list and management). |
| 2026-10-03 | Product owner rules added to the DoD: icons everywhere; menus never clipped. Part 04 COMPLETE. Next: Part 05 (workflow editor canvas). |
| 2026-10-03 | Part 05 COMPLETE. Product owner decision: AI runs on workspace API keys (BYOK), never silently on the server's key — Part 10 updated, backend Part 23 specified. Next: Part 06 (node configuration) or backend Part 23. |
| 2026-10-03 | Part 06 COMPLETE WITH DEFERRALS (browser checks waived by the product owner; real-account pickers pending). Next: Part 07 (drafts, validation, publishing). |
| 2026-10-03 | Part 07 COMPLETE (browser checks passed in the product owner's QA). Product owner request: collapsible editor side panels (done). Next: Part 08 (runs). |
| 2026-10-03 | Part 08 implemented; awaiting product-owner QA (the product owner tests each part in the browser). |
| 2026-10-03 | Part 09 implemented; awaiting product-owner QA. |
| 2026-10-03 | Product owner decision: finish the frontend for what the backend has now; anything else (e.g. BYOK AI) is a later enhancement. Part 10 implemented for GitHub/Slack/Microsoft; awaiting product-owner QA. |
| 2026-10-03 | Part 11 implemented; awaiting product-owner QA. |
| 2026-10-03 | Part 12 implemented, extended with the public website and robust auth pages (product owner); committed before the final gate run finished — Part 13 picks up anything it finds. |
| 2026-10-03 | Product-owner QA passed for Parts 08–12 (real backend + worker: runs, branches, Slack, GitHub trigger). Parts 08–11 COMPLETE; Part 12 open only on the bundle budget. Next: Part 13 (fix the budget first). |
| 2026-10-03 | Part 12 COMPLETE (bundle fixed: run detail lazy, 188.8 KB). Part 13 implemented except the E2E run (harness + journeys ready). |
| 2026-10-04 | Backend complete (Parts 23–27: schedule, generic HTTP, Jira, Gmail, performance). Frontend Parts 16–22 specified for the expanded platform, awaiting product-owner approval part by part; Part 15 moves after them. Stale "backend Part 23 BYOK" references fixed (BYOK parked). |
| 2026-10-04 | Parts 16–22 specs approved by the product owner. Part 16 implemented; awaiting QA. |
| 2026-10-04 | Part 16 merged. Part 17 implemented; awaiting QA. |
