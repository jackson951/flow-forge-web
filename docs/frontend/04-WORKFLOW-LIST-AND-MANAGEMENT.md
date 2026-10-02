# 04 — Workflow List and Management

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
