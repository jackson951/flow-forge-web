# 06 — Node Configuration and Data Mapping

**Status:** COMPLETE WITH DEFERRALS (2026-10-03) — evidence below; browser checks waived by the product owner and not run (AC-06.1 backend round trip, AC-06.2 real pickers). See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

A configuration panel for every node type, with pickers for integration resources, a template editor that helps insert references to earlier data, and a structured condition builder — producing exactly the config the backend validates.

## Why This Part Exists

`GET /node-types` exposes no config schema, so each node type needs a purpose-built form. Good forms (pickers instead of raw ids, reference autocomplete instead of typing paths) are the difference between a usable builder and a JSON editor.

## Scope

Config panel framework, one form per node type, resource pickers, template input with reference suggestions, condition builder, client-side validation mirroring the backend schemas.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-06.1 | Config panel opens for the selected node: key, display name, type-specific form, inline errors (client + server issues from Part 07). Changes update the definition immediately (undoable, Part 05). |
| FR-06.2 | Forms mirror the backend schemas: `manual.trigger` (none); `github.issue.created` (connection, repository `owner/name` picker); `util.log` (message template ≤ 1 000); `slack.sendMessage` (connection, channel picker, text template ≤ 3 000, "allow @channel/@here" off by default with a warning); `microsoft.todo.createTask` (connection, list picker, title, body, due date template/literal); `ai.summarize` (text, maxWords 20–300); `ai.classify` (text, 2–20 unique labels, subject); `ai.extract` (text, 1–20 uniquely named fields with type/description). |
| FR-06.3 | Resource pickers load from the backend: repositories (`…/integrations/:connectionId/github/repositories`), Slack channels (`…/slack/channels`), To Do lists (`…/microsoft/todo-lists`); with search, loading, empty, error, and "connection needs attention" states; a "Connect <provider>" link (Part 10) when no connection exists. |
| FR-06.4 | Template inputs support `{{ reference }}` placeholders: typing `{{` suggests references available at this node — `trigger.*` fields and `steps.<key>.output.*` of nodes **upstream** on the path (not siblings or downstream); unknown references are flagged. Known output shapes per node type are described in a client-side catalog (e.g. `ai.classify` → `output.label`, `slack.sendMessage` → `output.ts`). |
| FR-06.5 | Condition builder edits the backend grammar: groups `all` / `any` / `not`, comparisons `{ left, operator, right }` with operands `{ ref }` or `{ value }`; the 13 operators (`equals`, `notEquals`, `greaterThan(OrEqual)`, `lessThan(OrEqual)`, `contains`, `startsWith`, `endsWith`, `exists`, `notExists`, `isEmpty`, `isNotEmpty`), unary operators hide the right operand; depth ≤ 4, ≤ 50 comparisons enforced in the UI. A read-only plain-language preview ("label equals HIGH AND …"). |
| FR-06.6 | Client validation uses zod schemas written to match the backend's (limits, patterns, required fields); the server's validation issues (Part 07) remain authoritative and are shown on the same fields. |
| FR-06.7 | Secrets are never entered in node config (connections hold credentials); the panel says so where users might expect to paste a token. |

## Backend Endpoints

`GET /node-types`, integration resource endpoints above, `GET /workspaces/:ws/integrations` (connections for the connection selector).

## Testing Requirements

Unit: each zod schema against the backend's accepted/rejected examples; reference suggestions (upstream only, branches); condition builder ↔ grammar round-trip. Component: each form, pickers in every state (MSW).

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-06.1 | Every publishable node type has a form, and a config produced by each form passes backend validation | Browser: build one workflow per node type and validate (Part 07) |
| AC-06.2 | Pickers list real repositories / channels / lists from connected accounts | Browser with connected GitHub and Slack (Microsoft: lists) |
| AC-06.3 | Reference suggestions only offer upstream data | Unit tests |
| AC-06.4 | Condition builder output round-trips through the backend unchanged and nests up to depth 4 | Unit + browser |
| AC-06.5 | Client and server validation messages appear on the same field | Component test |

## Dependencies

Part 05; Part 10 for real connections (forms usable earlier with mock connections).

## Risks / Design Questions

- Hand-written forms can drift from backend schemas. Mitigation: fixture tests with backend examples; long-term the backend could expose JSON Schema from its zod definitions (proposed as a backend improvement, not required here).

## As implemented

| Area | Implementation |
| --- | --- |
| Schemas | `config/schemas.ts`: zod schemas copied field by field from the backend (node-type catalog, conditions, GitHub/Slack/Microsoft node types, AI tasks): limits, patterns, `.strict()`, unique labels/field names ignoring case, reserved `usage`/`meta`, enum values only for enum fields, condition depth ≤ 4 / ≤ 50 comparisons / ≤ 20 per group. `configErrors(type, config)` → messages by path |
| References | `config/references.ts`: ancestors via the single-parent edges; suggestions = trigger fields (GitHub issue payload as normalised by the backend; manual input has no fixed fields) + known outputs of each upstream step (`ai.classify` → `label`, `confidence`; `ai.extract` → its configured field names; `slack.sendMessage` → `ts`, `channelId`; …). Syntax check identical to the backend's `parseReference`; unknown or non-upstream steps are errors, unknown outputs of known shapes are warnings |
| Template input | `config/components/template-input.tsx`: typing `{{` opens suggestions filtered by what follows; ↑/↓, Enter/Tab inserts `{{ ref }}` at the caret, Esc closes; "Insert data" button opens the full list; character counter; problems listed under the field. ARIA combobox; the list is a portal with fixed position (never clipped, flips up) |
| Condition builder | `config/components/condition-builder.tsx`: All (AND) / Any (OR) / Not groups, comparisons with Data / Text / Number / Yes-no / Empty operands, the 13 operators (unary ones hide the right side), add comparison / add group disabled at the limits, remove, plain-language preview, counters "n/50 comparisons · nesting d/4", server issues shown on the comparison they belong to (`all.0.right`) |
| Pickers | `config/components/connection-select.tsx` (workspace connections of the provider with its logo; none → "Connect <provider>" link to Integrations; needs attention / deleted connection warnings) and `resource-picker.tsx` (search, loading, empty, error with retry, load more for Slack's cursor; inline so never clipped). Changing the connection clears the repository/channel/list that belonged to the old one |
| Forms | `config/components/node-forms.tsx`: manual trigger (no settings, explains `trigger.*`), GitHub issue opened (connection, repository), condition, log message, Slack (connection, channel, message, @channel/@here off by default with a warning), Microsoft To Do (connection, list, title, notes, due date as text/reference or date picker), AI summarize (text, max words 20–300, default 100), classify (labels as chips, optional subject), extract (fields with name, type, enum values, required, description). AI text can be "Text with data" (template) or "One value as-is" (`{ ref }`) |
| Framework | `config/components/node-settings.tsx` in the step panel: client errors show once a field is edited or has a value; the server's issues (by `path`) always show, on the same field; a note that secrets belong in connections. Edits dispatch `updateConfig` with the field name — consecutive typing in one field is one undo step (`editor-reducer.ts`) |
| Not built | A per-step "display name": the backend definition has no such field (the step key is the name) |

## Implementation Evidence

Verified 2026-10-03 on branch `feat/part-06-node-config`.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-06.1 | PARTIAL — browser not run | Every publishable node type has a form (component tests for each). `config.test.ts` checks the client schemas against accepted/rejected examples taken from the backend schemas, and the forms' output is asserted exactly in `node-settings.test.tsx`. **Not done:** building a workflow with every type in the browser and validating it with the real backend — the product owner waived the browser run; the script is ready (`part06-check.mjs` in the session scratchpad) |
| AC-06.2 | NOT VERIFIED — deferred | Pickers tested with MSW in every state (list, search, pick, empty, error + retry, load more, no connection, needs attention). Real repositories/channels/lists need connected GitHub/Slack/Microsoft accounts (Part 10 / product owner) |
| AC-06.3 | PASS | `config.test.ts`: suggestions are the ancestors only — not the step itself, siblings on the other branch or downstream steps; `ai.extract` outputs follow its fields. Component test: the list after `{{` never offers a downstream step |
| AC-06.4 | PASS (unit/component) — browser round trip not run | Builder output is the backend grammar exactly (component tests assert the config), depth 4 reached and the 5th level refused; schemas reject depth 5 / 21 items per group. Backend round trip not exercised in a browser |
| AC-06.5 | PASS | Component test: a server issue with `path: "message"` and the client's "Enter a message" appear in the same field message element; condition issues appear on their comparison |

Tests: `config.test.ts` (19), `node-settings.test.tsx` (24), reducer test for one-undo-step-per-field.

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 20 files / 279 tests ✔, `build` ✔.

### Notes

- Bug found by the tests and fixed: "Insert data" inserted at the start of the text when the field was not focused yet; it now inserts at the end.
- Test timing: under a parallel run on this machine the first editor test (which also loads the lazy editor chunk) took 10–18 s; `testTimeout` is now 30 s, opening the editor in tests waits up to 20 s, and Testing Library's `asyncUtilTimeout` is 5 s. Single-file timings varied by 2× between identical runs (setup/environment included), so this is machine load, not app speed.
- AI steps keep the current backend shape (`text`, `maxWords` / `labels` / `fields`). Choosing an AI provider connection and model per step comes with BYOK (backend Part 23, frontend Part 10 update).

