# 20 — HTTP Poll Trigger

**Status:** NOT STARTED — awaiting product-owner approval of this spec. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Let a workflow watch an API that cannot send webhooks — "every 5 minutes, fetch new orders; run once per new order" — with a form that explains where the items are, how they are told apart, and what happens on the first poll. Backend: [Part 24](../../../flowforge-api/flowforge-api/docs/backend/24-HTTP-REQUEST-AND-CUSTOM-API.md) (`http.poll`).

## Scope

`http.poll` node form (reusing Part 17's schedule picker and Part 18's connection picker), the workflow page's **poll status** panel, poll-started runs in history.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-20.1 | **Request**: optional HTTP connection, method GET/POST, URL (absolute, or relative to the connection's base URL; **no templates** — explained: there is no upstream data), query and headers (key/value), body *None*/*JSON* (POST only), timeout 1–30 s. |
| FR-20.2 | **Schedule**: Part 17's picker (same kinds, timezone and server minimum). |
| FR-20.3 | **Items**: dot path to the array of items in the response (e.g. `data.items`; empty = the whole response is one item). **Identity**: dot path to each item's id (e.g. `id`; empty = the item's content hash, with a note that edited items then count as new). |
| FR-20.4 | **Cursor** (optional, for incremental APIs): response path of the cursor value and the query parameter it is sent as next time. |
| FR-20.5 | **First poll**: *Record existing items without starting runs* (default, recommended) vs *start a run for every item found*; **Max items per poll** 1–100 (default 50), explaining that the rest are picked up next time. |
| FR-20.6 | **Try it**: a "Test request" button reusing `POST …/integrations/:id/test` is **not** sufficient (outcome only); instead the form shows a worked example of path resolution against a pasted sample response (local only, never sent) so users can check `items` / `identity` paths before publishing. |
| FR-20.7 | Server validation issues on fields (blocked URL, GET with body, invalid dot path, schedule errors). |
| FR-20.8 | **Poll status panel** from `GET …/workflows/:id/poll`: schedule (active, description, next run), state — *Waiting for first poll*, *Seeded* (existing items recorded), *OK*, *Failing* (with `lastError` category, consecutive failures and `nextAttemptAt` back-off) —, last polled / last success times, items fired. Seen item ids and cursor values are never shown (backend keeps them internal). |
| FR-20.9 | Poll-started runs show the `POLL` badge; run detail shows the item and its id. Reference catalogue: `trigger.item` (free-form, dot paths below), `trigger.itemId`, `trigger.polledAt`, `trigger.scheduleId`, `trigger.triggerType`. |
| FR-20.10 | Quota: publishing past the per-workspace limit of active polls returns `POLL_QUOTA_EXCEEDED` with the `limit`; the publish dialog shows it ("This workspace can run up to N poll triggers") and suggests archiving another poll workflow. |

## Backend Endpoints

Draft/validate/publish; `GET …/workflows/:id/poll`; `GET …/integrations` (connection picker).

## Security Requirements

Pasted sample responses for FR-20.6 stay in component state, are never sent or stored, and are cleared on close.

## Testing Requirements

Unit: dot-path resolution on sample responses (arrays, nested, missing, non-array), config round trip. Component (MSW): form ↔ config incl. cursor and first-poll options, server issues, status panel states (never polled, seeded, OK, failing with back-off), publish quota error.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-20.1 | An `http.poll` trigger is configured, checked against a sample response, published, and new items start one run each | QA against the real backend and a test API |
| AC-20.2 | The poll status panel reflects seeded / OK / failing states with back-off | Component tests + QA |
| AC-20.3 | Templates are refused in the poll URL with an explanation | Component test |
| AC-20.4 | Item fields are suggested in later steps' mappings | Component test |

## Dependencies

Parts 16, 17, 18.

## Risks / Design Questions

- A server-side "dry run poll" endpoint would beat the local sample check (FR-20.6); not in the backend today — propose as a backend enhancement if wanted.
