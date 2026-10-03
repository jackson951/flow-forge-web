# 07 — Drafts, Validation, Publishing and Versions

**Status:** COMPLETE (2026-10-03) — evidence below; browser criteria verified by the product owner's manual QA. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

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

## As implemented

| Area | Implementation |
| --- | --- |
| Save queue | `editor/draft-saver.ts` (pure): never two saves at once, latest queued definition wins, each success chains `draftRevision` into the next `expectedRevision`; 409 → `conflict` (queue dropped, further saves refused until resolved); other errors → `failed` (revision kept, retried on the next save). `reset` (reload theirs) and `overwrite` (continue from the server revision) |
| Autosave | `editor/use-draft-saver.ts`: saves 2 s after the last edit; Save button and Ctrl/Cmd+S save immediately (only when something changed or the last save failed); paused while there is a conflict; off for archived workflows. The editor's baseline is the definition the backend actually stored (`markSaved` with that definition), so edits made during a save stay "unsaved" |
| Save state | Header: "Saving…", "Saved at 14:05", "Unsaved changes", "Save failed" (+ alert with the reason; changes kept), "Changed elsewhere" |
| Conflict | Dialog "This draft changed elsewhere": **Reload theirs** (re-fetch, replace the editor, discard local) or **Overwrite** (re-fetch revision, save local over it), or "Decide later" (banner keeps a Resolve button; autosave stays paused). Never overwrites silently |
| Issues | `components/issues-panel.tsx` (toggled by the "n issues" header button): workflow-level issues (no node, or a node key that no longer exists) apart from step issues; each step entry selects the step and zooms to it; severity icons, edge, path and code shown; marked "from the last save" while there are edits |
| Publish | ADMIN/OWNER only; disabled with the reason (screen-reader text + tooltip) for: archived, member, conflict, unsaved/saving, errors, or nothing changed since the active version. Confirmation lists what changes (immutable version, new runs and webhook triggers use it, running runs keep theirs). `POST …/publish { expectedRevision }`; 422 → issues panel opens with the backend's issues (incl. `CONNECTION_INVALID`); 409 stale / `NO_CHANGES` explained; success → "Published v4" banner, status PUBLISHED, versions refreshed |
| Versions | Right panel "Versions": newest first with Load more, active badge, published when/by; **Open** → `/w/:ws/workflows/:id/versions/:n` (`pages/workflow-version-page.tsx`: canvas and step settings read-only, lock banner); **Restore into draft** (confirm, undoable, then autosaved) from the panel or the version page |
| Status bar | Draft revision · "Draft matches the active v3" / "Draft has changes not in v3" / "Not published yet" (canonical-JSON comparison of the saved draft with the active version's definition, `editor/canonical.ts`) · workflow status |
| Collapsible panels | Requested by the product owner: both side panels collapse to a thin rail with an expand button (PanelLeft/RightClose/Open icons) for a full-width canvas; remembered per browser (localStorage, guarded); showing a step from the issues list or opening Versions re-opens the right panel |

## Implementation Evidence

Verified 2026-10-03 on branch `feat/part-07-publishing`.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-07.1 | PASS | Product owner QA (browser): edit → "Saved at …" after ~2 s; reload shows the saved draft. Component test: an edit is saved about 2 s later with the right `expectedRevision`, "Saved at …" and the next revision appear. |
| AC-07.2 | PASS | Product owner QA (two tabs): the second save shows "This draft changed elsewhere" with Reload theirs / Overwrite. Unit: 409 stops the queue and refuses further saves. Component: conflict dialog; "Reload theirs" loads the newer draft (revision 9) without sending anything; "Overwrite" re-saves with revision 9 |
| AC-07.3 | PASS | Component test with backend issue fixtures (unreachable, cycle, config, reference warning): all listed, workflow-level apart, clicking the step entry selects it and shows its issues on the panel |
| AC-07.4 | PASS | Product owner QA (browser, real backend): publish → "Published vN"; listed in Versions; opens read-only; restore into draft works. Component tests: publish confirmation → `POST publish { expectedRevision }` → "Published v3"; versions panel lists v2 (active) with Open link; version page opens read-only and "Restore into draft" returns to the editor with the version restored. |
| AC-07.5 | PASS | Component tests: publish disabled with the reason for nothing changed, unsaved changes, validation errors, MEMBER, archived |

Tests: `draft-saver.test.ts` (7: revision chaining, no overlap / latest wins, issues reported, conflict, overwrite/reload, retry after failure, conflict shape), `workflow-publishing.test.tsx` (13).

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `build` ✔. `npm test`: full run 22 files / 298 tests — all passed except the first test of the two editor test files, which timed out (44 s) while the lazy editor chunk loaded; fixed by loading that module in `beforeAll`, after which both files passed in a targeted re-run (26/26). The full suite was not re-run again because of the machine's speed.

### Notes

- Collapsible side panels (product owner request) confirmed by the product owner's QA.

- Machine: during this part the development machine had about 1 GB of free memory (Docker/kind, editors, browser), and test setup took up to 80 s. Test timeouts were raised (60 s per test, 30 s to open the editor) so the suite is not flaky on it; single tests themselves run in well under a second once loaded.
- The draft-vs-active comparison is exact because the backend stores the draft in the same parsed form it freezes on publish; layout (positions) counts as a change, as it does for the backend's `NO_CHANGES` check.

