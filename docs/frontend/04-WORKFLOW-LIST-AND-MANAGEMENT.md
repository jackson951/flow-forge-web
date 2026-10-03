# 04 — Workflow List and Management

**Status:** COMPLETE (2026-10-03) — evidence below; see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

A workflows page where users find, create and manage workflows: list, filter, create, rename, duplicate, archive/unarchive and delete.

## Scope

List page with keyset pagination, status filter, create dialog, row actions, empty state.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-04.1 | `GET /workspaces/:ws/workflows?limit&cursor&status&includeArchived` shown as a table: name, status badge (`DRAFT`/`PUBLISHED`/`ARCHIVED`), active version, last updated; "Load more" via `nextCursor` (no page numbers — keyset). |
| FR-04.2 | Filters: All (not archived) / Draft / Published / Archived; kept in the URL query string. |
| FR-04.3 | Create workflow (name, optional description) → opens the editor (Part 05). |
| FR-04.4 | Row actions: open, rename/description (`PATCH`), duplicate (`POST …/duplicate`, opens the copy), archive / unarchive (ADMIN; explains that archiving stops triggers and keeps history), delete (ADMIN; only for never-run workflows — a 409 explains "archive it instead"). |
| FR-04.5 | Empty states: no workflows yet (with "Create your first workflow"), nothing matches the filter. |
| FR-04.6 | Mutations update the list optimistically where safe (rename) and refetch otherwise; errors roll back and show a message. |

## Backend Endpoints

`GET/POST /workspaces/:ws/workflows`, `GET/PATCH/DELETE …/workflows/:id`, `POST …/duplicate`, `…/archive`, `…/unarchive`.

## Testing Requirements

Component tests: pagination, filters in URL, each action incl. 409 on delete and role-hidden actions (MSW). E2E: create → rename → duplicate → archive.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-04.1 | List pages through more than one page with "Load more" and no duplicates | Component test + browser with 30+ workflows |
| AC-04.2 | Filters survive reload (URL) | Browser |
| AC-04.3 | Every row action works against the backend; delete of a workflow with runs shows the archive hint | Browser |
| AC-04.4 | MEMBER cannot see archive/delete | Component test |

## Dependencies

Parts 01–03.

## As implemented

| Area | Implementation |
| --- | --- |
| List | `useWorkflowList` (TanStack `useInfiniteQuery`, keyset `cursor` → `nextCursor`, 20 per page) and a table: icon tile + name + description, status pill with icon, active version (`v3 · published 2 days ago`), last edited (relative, absolute on hover), row "⋯" menu; "Load more" until `nextCursor` is null |
| Filters | Tabs All / Drafts / Published / Archived (with icons) stored as `?status=` (replace, so Back is not polluted); "All" = backend default (not archived) |
| Actions | Create (dialog → editor), Edit details (optimistic rename/description with rollback), Duplicate (opens the copy), Archive (confirmation explaining that triggers stop and history stays) / Unarchive, Delete (ADMIN; 409 "has run history" → **Archive instead** button). MEMBERs see Open / Edit details / Duplicate only (`policy.canManage`) |
| Shared UI | `ActionMenu` — portal + fixed positioning, flips upward near the bottom, closes on scroll/resize, full keyboard support; `WorkflowStatusBadge`, `StatusBadge` (runs/steps) with icons; `PageHeader` and `EmptyState` take icons; `lib/format.ts` (relative/absolute time) |
| Icons rule | Brand logos as SVG (`components/brand/provider-icons.tsx`: GitHub, Slack, Microsoft) and `NodeTypeIcon` (provider logos for integration steps, Sparkles for AI, Split for conditions, …), applied to the editor palette and canvas nodes, the run step timeline, Integrations, page headers, filters, empty states, roles (crown/shield/person) |
| Fixes on the way | Placeholder Dashboard and Run detail linked to `/workflows` and `/runs` (pre-Part 01 paths) — now workspace paths; dev proxy target configurable with `VITE_PROXY_TARGET` |

## Implementation Evidence

Verified 2026-10-03 on branch `feat/part-04-workflow-list`.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-04.1 | PASS | `workflows-list-page.test.tsx`: two pages via `cursor`, 4 rows, no duplicates, button gone at the end. Browser (automated run, real backend, 31 seeded workflows): first page 20 rows, Load more → all 31 shown. Product owner tested manually |
| AC-04.2 | PASS | Tests: clicking Drafts sets `?status=DRAFT` and sends `status=DRAFT`; opening `?status=ARCHIVED` selects the tab and queries `ARCHIVED`. Browser: Published filter survived a reload |
| AC-04.3 | PASS | Tests for create (→ editor, trimmed name), validation, optimistic rename + rollback on 409, duplicate (→ copy), archive with explanation, delete of a never-run draft, 409 → Archive instead, unarchive, error state with request id. Browser automated run: delete of a workflow with runs → hint → archive instead → listed under Archived → unarchive; then the product owner tested the remaining actions manually |
| AC-04.4 | PASS | Test: a MEMBER's menu is exactly Open editor / Edit details / Duplicate |

Menu clipping (reported by the product owner during this part): fixed in the shared `ActionMenu` for every table — tests prove it renders in `document.body` outside an `overflow: hidden` card, opens upward when there is no room below, closes on scroll; screenshot: [menu on the last row](evidence/part-04/menu-last-row.png) (all five items visible, opened upward). [List screenshot](evidence/part-04/workflows-list.png).

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 16 files / 194 tests ✔, `build` ✔.

### Notes

- The automated browser script did not finish: after the archive/unarchive steps it looked for "Workflow 01" on the first page, but the list is newest-first so it was on page two (a script error, not an app error). The product owner then tested the page manually and confirmed it works; the remaining automated steps were not re-run.
- Local setup observation: the developer's `.env` sets `VITE_API_BASE_URL=http://localhost:3000/api/v1`, which bypasses the dev proxy (cross-origin calls, allowed only because the backend's CORS list includes 5173). The documented value `/api/v1` keeps the app same-origin as in production.
- One earlier full-suite run had a single timeout in "validates the name before creating" (10 s, machine under load); it did not reproduce in the following runs.
