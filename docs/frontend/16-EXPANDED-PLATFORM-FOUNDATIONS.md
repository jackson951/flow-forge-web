# 16 — Expanded-Platform Foundations

**Status:** NOT STARTED — awaiting product-owner approval of this spec. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Bring the app's API contract, shared vocabulary and visual building blocks up to the expanded backend (backend Parts 23–27: schedule, generic HTTP, Jira, Gmail), so Parts 17–22 only add their own screens and forms. Nothing user-facing is built here beyond what every later part needs: new types, provider and node icons, trigger-source and connection-status vocabulary, and the run list's new filters.

## Why This Part Exists

Parts 01–14 were written against the backend as it was on 2026-10-03 (GitHub, Slack, Microsoft, AI). Since then the backend gained four trigger types, sixteen action types, two OAuth providers, credential-based HTTP connections, new run trigger sources and new connection status reasons. Doing the shared changes once avoids each feature part re-deriving them, and keeps types generated from the real Swagger document instead of hand-written.

## Scope

Regenerated API types; enum/vocabulary maps; provider logos (Jira, Gmail/Google) and generic icons (HTTP, Webhook, Schedule); node-type icon and palette entries for every new node type (forms come in their own parts — until then a new node shows a "configuration form coming in Part NN" state, never a raw JSON editor); trigger-source badges and filter on runs and the dashboard; `NEEDS_ATTENTION` reasons; connection-type–driven provider cards (`OAUTH` vs `CREDENTIALS`); the shared **reference catalogue** so later parts register their nodes' output shapes for `{{ }}` suggestions.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-16.1 | `npm run api:types` regenerates `src/types/openapi.ts` from the backend's `/api/docs-json`; hand-written types in `src/types/api.ts` are aligned (no `any`). The roadmap's *Backend Contract Facts* table is updated with the facts below. |
| FR-16.2 | Trigger sources `MANUAL`, `RETRY`, `WEBHOOK`, `SCHEDULE`, `POLL` each have a label and an icon (e.g. hand, rotate, webhook, clock, radar). Run list, run detail and dashboard show the badge; unknown future values render as a neutral badge with the raw value (never crash). |
| FR-16.3 | Run list filter **Trigger source** (single select, "All" by default — the backend takes one value) sent as `?triggerSource=` (indexed since backend Part 27), kept in the URL like the existing filters. |
| FR-16.4 | Providers `GITHUB`, `SLACK`, `MICROSOFT`, `JIRA`, `GMAIL`, `HTTP`, `WEBHOOK` have display names and icons: real logos for GitHub, Slack, Microsoft, **Jira** (Atlassian Jira mark) and **Gmail**; lucide icons for HTTP (globe/plug) and Webhook. `TEST` is never shown. |
| FR-16.5 | Connection `statusReason` → human message and next step: `TOKEN_REVOKED`, `TOKEN_EXPIRED` ("Reconnect"), `APP_UNINSTALLED`, `PERMISSION_CHANGED` ("Reconnect and grant the requested access"), `WATCH_RENEWAL_FAILED` ("Gmail stopped sending notifications — reconnect or check the Pub/Sub setup"), `AUTHENTICATION_FAILED` ("The saved credentials were rejected — replace them"). Unknown reasons fall back to a generic message. |
| FR-16.6 | `GET /integrations/providers` now returns `connectionType: OAUTH \| CREDENTIALS`. Provider cards choose the connect action from it: OAuth → existing redirect flow; CREDENTIALS → the HTTP connection dialog (Part 18). No provider list is hard-coded beyond names, icons and descriptions. Providers with `configured: false` stay disabled with the operator explanation. |
| FR-16.7 | Node palette lists every type from `GET /node-types` grouped by provider/category (Core, Schedule, HTTP, GitHub, Slack, Microsoft, Jira, Gmail, AI) with its icon; a type with `unavailableReason` is shown disabled with that reason (e.g. "Gmail triggers need GMAIL_PUBSUB_TOPIC…"). |
| FR-16.8 | New node types without a form yet show a clear placeholder panel ("This node's settings arrive in Part NN") and their existing config is preserved untouched on save. |
| FR-16.9 | Reference catalogue: a registry `nodeType → output shape` used by the `{{ }}` suggester and reference checks. Parts 17–22 add entries; this part adds the mechanism and moves the existing node outputs into it without changing behaviour. |
| FR-16.10 | Workflow detail shows **trigger summary** slots the later parts fill: schedule summary (Part 17), webhook endpoint (Part 19), poll status (Part 20). |
| FR-16.11 | (Done while planning, 2026-10-04.) Part 10 no longer points at a "backend Part 23 BYOK" (backend Part 23 is the schedule trigger; BYOK is parked) and the design direction lists Schedule, HTTP, Jira and Gmail as in scope (Parts 17–22). |

## Backend Contract Facts (added to the roadmap)

| Topic | Fact |
| --- | --- |
| Trigger sources | `MANUAL`, `RETRY`, `WEBHOOK` (GitHub, Jira, Gmail, generic hooks), `SCHEDULE`, `POLL` |
| Providers | `GITHUB`, `SLACK`, `MICROSOFT`, `JIRA`, `GMAIL` (OAuth); `HTTP` (credentials); `WEBHOOK` (inbound hooks, no connection) |
| Connection status | `CONNECTED` / `NEEDS_ATTENTION` / `DISCONNECTED` + `statusReason` (six values above) |
| Workflow detail | `schedule: { active, timezone, description, nextRunAt, lastOccurrenceAt, lastRunId } \| null`; `GET …/workflows/:id/poll` → `{ schedule, state }` |
| Generic webhook | `…/workflows/:workflowId/webhook` (+ `rotate-secret`, `rotate-url`, `deliveries`, `deliveries/:id/replay`, `listen`) |
| HTTP connections | `POST …/integrations/http`, `POST …/integrations/:id/test`, `PATCH …/integrations/:id`, `PUT …/integrations/:id/credentials` |
| Pickers | Jira `sites`, `projects`, `issue-types`, `statuses`, `users`; Gmail `labels` under `…/integrations/:connectionId/…` |

## Security Requirements

No change to token handling. New provider logos are inline SVG (no remote images). Status reasons never display provider error text verbatim.

## Testing Requirements

Unit: every trigger source, provider, status reason and connection type maps to a label/icon, with a fallback for unknown values. Component: run filter round-trips through the URL; palette shows unavailable types disabled with their reason; placeholder panel preserves config. Snapshot of the regenerated types is not committed as a test — the typecheck is the test.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-16.1 | Types regenerate from the running backend and the app typechecks with no `any` | `npm run api:types` + typecheck |
| AC-16.2 | Runs can be filtered by trigger source and every source has an icon badge | Component test + product-owner QA |
| AC-16.3 | Jira and Gmail show their real logos; HTTP and Webhook have icons; no text-only provider rows | Component test + QA |
| AC-16.4 | Every connection status reason has a specific message and next step | Unit test |
| AC-16.5 | Every node type from `/node-types` appears in the palette with an icon; unavailable ones explain why | Component test (MSW) + QA |
| AC-16.6 | Opening a new node type before its part exists never loses its config | Component test |

## Dependencies

Frontend Parts 01–10; backend Parts 23–27 (merged).

## Risks / Design Questions

- Jira and Gmail logo usage: use the official marks at small size, as done for GitHub/Slack/Microsoft; confirm with the product owner.
- Palette grouping order — proposed: Core, Schedule, HTTP, then providers alphabetically, AI last.
