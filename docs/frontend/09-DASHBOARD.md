# 09 — Dashboard

**Status:** COMPLETE (2026-10-03) — component tests + product-owner QA. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

A workspace home page that answers "is my automation healthy?" at a glance and leads to what needs attention.

## Scope

Dashboard page from `GET /workspaces/:ws/dashboard`, onboarding state for new workspaces.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-09.1 | Run counts by status for the last 24 h and 7 days (success rate shown as a number, not only a chart; colour always paired with text). |
| FR-09.2 | Top failing workflows (7 days) with failure counts, linking to the run list filtered by that workflow and status FAILED. |
| FR-09.3 | Recent failures with workflow, error category description and time, linking to the run detail. |
| FR-09.4 | Connections needing attention (from `GET …/integrations`, status NEEDS_ATTENTION) with a "Reconnect" link. |
| FR-09.5 | New-workspace onboarding checklist (connect an integration → create a workflow → publish → first run), each step ticked from real data. |
| FR-09.6 | Refreshes every 30 s while visible; shows "generated at" from the response. |

## Backend Endpoints

`GET /workspaces/:ws/dashboard`, `GET /workspaces/:ws/integrations`, `GET …/workflows?limit=1` (onboarding).

## Testing Requirements

Component tests with dashboard fixtures (empty workspace, healthy, failing); links carry the right filters.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-09.1 | Numbers match the backend response and the run list for the same filters | Browser |
| AC-09.2 | Every failure item links to the right run / filtered list | Component test |
| AC-09.3 | A new workspace shows the onboarding checklist, which completes as the user progresses | Browser |

## Dependencies

Parts 08, 10.

## As implemented

| Area | Implementation |
| --- | --- |
| Run health | Two cards (last 24 h, last 7 days) from `GET /dashboard`: total runs, **success rate as a number** (succeeded ÷ finished runs — succeeded + failed + cancelled; "—" when nothing finished, never an invented 0 % or 100 %; green ≥ 95 %, amber ≥ 80 %, red below), a proportional bar (decorative, `aria-hidden`) and every status with icon, label and count in text; "View runs" link |
| Top failing | Up to 5 workflows (backend, 7 days) with failure counts; each links to `/runs?status=FAILED&workflow=<id>` (Part 08 filters); deleted workflows shown as "Deleted workflow" |
| Recent failures | Latest 10 (backend): workflow, error category icon + label + the backend's description, relative time (absolute on hover); each links to the run |
| Needs attention | Connections with `NEEDS_ATTENTION` from `GET …/integrations`: provider logo, account, consequence, "Reconnect" link to Integrations |
| Onboarding | "Getting started" checklist (connect → create workflow → publish → first run), each ticked from real data: connections list, `workflows?limit=1&includeArchived=true`, `workflows?status=PUBLISHED&limit=1`, `runs?limit=1`; links to the next place to go; hidden once all four are done |
| Refresh | Dashboard and onboarding refetch every 30 s (paused in hidden tabs by TanStack Query); "Updated hh:mm:ss · refreshes every 30 s" from the response's `generatedAt`, with a spinning icon while refreshing |

## Implementation Evidence

Implemented 2026-10-03 on branch `feat/part-09-dashboard`. Browser criteria are left for the product owner's QA.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-09.1 | PASS | Component tests: totals and success rates computed from the backend fixture (13 runs, 92.3 %; 84 runs, 95.2 %), per-status counts in text; "—" when nothing finished. Comparing with the run list in a browser is left for QA |
| AC-09.2 | PASS | Component tests: top failing links to `/runs?status=FAILED&workflow=<id>`; recent failure links to `/runs/<runId>` and shows the category and description |
| AC-09.3 | PASS | Component tests: empty workspace → 0 of 4 with links; workflow but nothing published → 2 of 4; everything done → hidden. Progressing through it in a browser is left for QA |

Tests: `dashboard/dashboard.test.tsx` (8, incl. `successRate`).

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 24 files / 325 tests ✔, `build` ✔.

### Product-owner QA

Product owner QA (2026-10-03, real backend + worker): all features in this part tested in the browser and accepted. Worker log excerpt shows manual and GitHub-triggered runs passing conditions and log steps, one GitHub event starting two workflows (same correlation id), a real Slack message posted (`slack.sendMessage`, 1.5 s), the sweeper re-enqueuing stale QUEUED runs after a worker restart, and every run finishing SUCCEEDED.
