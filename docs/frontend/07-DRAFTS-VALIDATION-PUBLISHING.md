# 07 — Drafts, Validation, Publishing and Versions

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

## Objective

Save drafts safely (optimistic concurrency), show validation issues on the nodes they concern, publish immutable versions, and browse past versions.

## Scope

Save (explicit + autosave), revision conflicts, validation display, publish flow, versions list and read-only version view.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-07.1 | Save: `PUT …/workflows/:id/draft { expectedRevision, definition }`; the response `{ draftRevision, issues }` gives the next `expectedRevision` and the current issues. Explicit Save (Ctrl/Cmd+S) plus debounced autosave after edits (e.g. 2 s idle); saving state shown ("Saving…", "Saved", "Save failed"). |
| FR-07.2 | 409 stale revision (someone else saved): stop autosave, show "This draft changed elsewhere" with options **Reload theirs** (discard local) or **Overwrite** (re-fetch revision, re-save local); never silently overwrite. |
| FR-07.3 | Validation issues returned by save/validate (`POST …/validate`) are shown in an issues panel and on the affected nodes/fields (Part 05 markers, Part 06 fields); clicking an issue selects the node. Graph-level issues (no trigger, unreachable node, cycle) listed separately. |
| FR-07.4 | Publish (ADMIN): disabled while there are unsaved changes or validation errors; confirm dialog states what changes (new immutable version, triggers re-routed to it); `POST …/publish { expectedRevision }`; 422 shows issues; success shows the new version number and updates status to PUBLISHED. |
| FR-07.5 | Versions tab: `GET …/versions` (newest first, load more), each with number, published at/by, "active" badge; open a version read-only on the canvas (`GET …/versions/:version`); "Restore into draft" copies a version's definition into the draft (then save). |
| FR-07.6 | Status bar shows: draft revision, whether the draft differs from the active version, workflow status. |

## Backend Endpoints

`PUT …/draft`, `POST …/validate`, `POST …/publish`, `GET …/versions`, `GET …/versions/:version`.

## Testing Requirements

Unit: save queue (no overlapping saves, latest wins, revision chaining), conflict state machine. Component: issues mapping to nodes, publish gating (MSW). E2E: edit → autosave → publish → version listed; two tabs → conflict dialog.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-07.1 | Edits autosave; reloading shows the saved draft | Browser |
| AC-07.2 | Concurrent edit in a second tab produces the conflict dialog; no silent overwrite | Browser (two tabs) |
| AC-07.3 | Every backend validation issue is visible and navigable to its node | Component test with backend issue fixtures |
| AC-07.4 | Publish creates a version; it appears in Versions and opens read-only | Browser |
| AC-07.5 | Publish is impossible with unsaved changes or errors, and for MEMBERs | Component tests |

## Dependencies

Parts 05–06.
