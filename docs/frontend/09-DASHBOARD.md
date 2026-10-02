# 09 — Dashboard

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
