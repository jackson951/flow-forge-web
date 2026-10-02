# 05 — Workflow Editor Canvas

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
