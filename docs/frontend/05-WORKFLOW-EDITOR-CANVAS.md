# 05 — Workflow Editor Canvas

**Status:** COMPLETE (2026-10-03) — evidence below; see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

A visual editor (React Flow) that edits the backend's workflow definition losslessly: add, connect, move and delete nodes; one trigger; condition branches; layout saved with the draft.

## Why This Part Exists

The definition JSON is the contract with the engine. The canvas is only a view of it, so the mapping between the two must be exact and testable, independent of React Flow.

## Scope

Definition ↔ canvas mapping, node palette, editing interactions, branch edges, keyboard shortcuts, undo/redo, local dirty state. Node config forms are Part 06; saving/publishing is Part 07.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-05.1 | Pure functions `toFlow(definition)` and `toDefinition(nodes, edges)` map `{ key, kind, type, config, position }` and `{ from, to, branch }` to React Flow nodes/edges and back; round-trip is lossless (config and unknown fields untouched). |
| FR-05.2 | Palette from `GET /node-types`, grouped by kind (Triggers, Conditions, Actions); types with `unavailableReason` (e.g. AI not configured on the server) shown disabled with the reason. |
| FR-05.3 | Add a node by drag-and-drop or click (placed next to the selection); keys generated from the type (`slack_send`, `slack_send_2`, …) matching the backend key pattern; keys editable with validation (unique, pattern, ≤ 64). |
| FR-05.4 | Exactly one trigger: adding a second trigger is prevented with an explanation; the trigger has no inputs. |
| FR-05.5 | Connections: actions have one output; conditions have two labelled outputs **true** / **false** that produce `branch` on the edge; no edges into the trigger; no self-loops; **at most one incoming edge per node** (workflows are trees — the backend rejects `MULTIPLE_INCOMING`); cycles prevented at connect time (the backend also rejects them). |
| FR-05.6 | Delete nodes/edges (Delete/Backspace, context menu); deleting a node removes its edges. |
| FR-05.7 | Node positions are written to `position`, so the layout survives save and reload; definitions without positions get an automatic top-to-bottom layout. |
| FR-05.8 | Undo/redo (Ctrl/Cmd+Z, Shift+Z) over definition changes; "unsaved changes" indicator; leaving the page with unsaved changes asks for confirmation. |
| FR-05.9 | Limits surfaced before the server rejects: 50 nodes, 100 edges, definition size near 256 KB. |
| FR-05.10 | Read-only mode (archived workflow, MEMBER without edit rights if applicable, viewing a published version in Part 07): no palette, no dragging, no deletion. |
| FR-05.11 | Each node shows type icon, display name, key, and a validation marker (fed by Part 07's issues). |

## Technical Requirements

- Editor state: a single reducer/store over the definition (source of truth); React Flow renders it. No business logic inside React Flow callbacks beyond dispatching actions.
- The canvas chunk stays code-split (React Flow loads only on the editor route).

## Backend Endpoints

`GET /node-types`, `GET /workspaces/:ws/workflows/:id` (draft).

## Testing Requirements

Unit: mapping round-trip (property-style over generated definitions), key generation, connection rules (second trigger, cycles, branch outputs), undo/redo reducer. Component: add/connect/delete via keyboard and buttons (React Flow interactions that jsdom cannot drive are covered in E2E).

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-05.1 | A definition loaded from the backend and saved without edits is byte-for-byte equivalent (canonical JSON) | Unit test with backend fixtures |
| AC-05.2 | A user can build trigger → condition → (true) action / (false) action entirely with the mouse, and the resulting definition has the correct `branch` values | E2E / browser |
| AC-05.3 | Second trigger, cycles, self-loops and edges into the trigger cannot be created | Unit tests |
| AC-05.4 | Layout persists across save and reload | Browser |
| AC-05.5 | Undo/redo restores every edit type | Unit tests |
| AC-05.6 | Archived workflows open read-only | Component test |

## Dependencies

Parts 01–04.

## Risks / Design Questions

- React Flow drag interactions are hard to unit test; the pure mapping/reducer layer carries the logic so it can be tested without the canvas.

## As implemented

| Area | Implementation |
| --- | --- |
| Source of truth | `editor/editor-reducer.ts`: the definition plus undo/redo history (100 steps). Actions: add (with optional position or "after" a step), move, connect, remove nodes/edges (one undo step for a keyboard delete of nodes and edges together), rename key (rewrites `{{steps.<key>…}}` references), update config, undo/redo, mark saved. React Flow only renders it; live drag positions and measured sizes are local and re-derived when the definition changes |
| Rules | `editor/graph-rules.ts` mirrors the backend validator: no self-loop, duplicate edge, edge into the trigger, second incoming edge, cycle, condition edge without branch or duplicate branch; fan-out from actions allowed; one trigger; at most 50 steps. Invalid connections are refused while dragging (`isValidConnection`) |
| Mapping | `editor/mapping.ts`: definition ↔ React Flow nodes/edges, branch = source handle + edge label; `editor/layout.ts` places nodes without positions (display only, not saved unless moved); `editor/keys.ts` generates keys from the type (`slack_send_message`, `_2`, …) and validates renames |
| Canvas | `components/canvas/workflow-canvas.tsx`: vertical flow, condition nodes with green "true" / red "false" outputs, drop from the palette at the cursor, Delete/Backspace, minimap, zoom controls; node cards show the step icon (provider logos; Anthropic mark for AI steps), label, key, trigger badge and an issue count from the last save |
| Palette | `components/node-palette.tsx`: types from `GET /node-types` grouped Triggers / Logic / Actions with search; unavailable types and a second trigger are disabled with the reason; click adds after the selected step and connects it (first free branch of a condition), drag drops at a position |
| Panel | `components/node-config-panel.tsx`: selected step's icon, type, editable key (validated, Enter/blur commits, Esc reverts), issues from the last save, delete. The settings form is Part 06 |
| Page | `pages/workflow-editor-page.tsx`: breadcrumb, status, save state ("Unsaved changes", "Saving…", "Saved at 10:27", "Not saved"), step count n/50, undo/redo buttons, Save (Ctrl/Cmd+S) with `expectedRevision` (409 → explained, local changes kept), read-only banner for archived workflows, "Leave without saving?" dialog for in-app navigation plus the browser's prompt on close/reload. Publish is Part 07 |
| Fixes on the way | `useWorkspace` now reads the workspace from `WorkspaceGuard` (context), so a page being left after deleting/leaving its workspace no longer throws (intermittent error seen in a Part 03 test); jsdom shims for React Flow in `src/test/react-flow-shims.ts` |

## Implementation Evidence

Verified 2026-10-03 on branch `feat/part-05-editor-canvas`.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-05.1 | PASS | `editor.test.ts`: `toDefinition(toFlow(def))` equals the backend-shaped fixture (branches, positions, configs); nodes without positions get a display layout that is not written back. The editor never re-saves an unedited draft (Save is disabled until something changes) |
| AC-05.2 | PASS | Browser (Chromium, real backend on a throwaway database): Condition and two Log message steps dragged from the palette; trigger → condition, condition "true" → first log and "false" → second log connected by dragging handles; saved definition read back from the API: `trigger->condition`, `condition->util_log[true]`, `condition->util_log_2[false]`. A cycle could not be drawn; the trigger has no input handle. [Screenshot](evidence/part-05/part05-built.png) |
| AC-05.3 | PASS | `editor.test.ts`: every rule (second trigger, self-loop, duplicate, into trigger, second incoming edge, cycle, missing/duplicate branch) refused with a reason; component test: second trigger disabled in the palette with the reason |
| AC-05.4 | PASS | Browser: a step dragged to a new place, saved with Ctrl+S, page reloaded — same position in the API (`{x:-62, y:161.77}`) and the same on-screen transform before and after reload. [Screenshot after reload](evidence/part-05/part05-reloaded.png) |
| AC-05.5 | PASS | `editor.test.ts`: undo/redo of add, move, connect, remove nodes, remove edges, rename and config; component test for the buttons and Ctrl+Z / Ctrl+Shift+Z. Browser: Delete key removes a step with its edges, one Ctrl+Z restores both, Ctrl+Shift+Z removes it again |
| AC-05.6 | PASS | Component test: archived → banner, palette/save/undo disabled, key field disabled, no delete. Browser: archived workflow shows the read-only banner and a disabled Save. [Screenshot](evidence/part-05/part05-archived.png) |

Also verified in the browser: "Leave without saving?" on in-app navigation with unsaved changes ([screenshot](evidence/part-05/part05-leave-dialog.png)). Component tests (`workflow-editor-page.test.tsx`, 14): load, palette availability, add-after-selected with auto-connect and the saved body, next revision on the following save, unconnected-add notice, undo/redo, rename with reference rewrite, delete from panel, issue markers from the save, 409 conflict, leave dialog (stay / discard / no prompt when clean), read-only, not found.

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 18 files / 235 tests ✔, `build` ✔.

### Notes

- Bug found by the browser check and fixed: deleting a step with the keyboard produced two history entries (React Flow reports the node and its edges separately), so one Ctrl+Z restored the step without its edge. Now one atomic edit (`onDelete` → a single `removeNodes` with the edge ids); regression test added.
- jsdom cannot run React Flow's drag handling (d3-drag needs `event.view`), so component tests select nodes with a click event; dragging nodes, palette drop and handle connections are covered by the browser run.
- The editor's "Settings" section is a placeholder until Part 06 (node configuration).
