# 06 — Node Configuration and Data Mapping

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
