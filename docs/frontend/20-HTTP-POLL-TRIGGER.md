# 20 — HTTP Poll Trigger

**Status:** IN PROGRESS — implemented 2026-10-04, local gate green; awaiting product-owner QA. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

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

## As implemented

| Area | Implementation |
| --- | --- |
| Form | `config/components/poll-trigger-form.tsx`: Request — optional HTTP connection (created in place, Part 18), GET/POST, URL (no templates: a templated URL is flagged on the field), query and headers (plain values, shared `key-value-editor.tsx`), JSON body for POST; Schedule — the Part 17 picker (empty → "Set up the schedule", every 15 minutes); Items — items path, identity path (content-hash note), cursor response path + query parameter, "first poll records existing items" (default on), max new items per poll 1–100 (default 50). Server issues on `request.*`, `schedule.*` and the other fields |
| Sample check | `config/poll-model.ts` mirrors the backend's `extractItems` / `itemIdentity` / `cursorFrom`; "Check the paths against a sample response" shows the item count, first ids, items without a usable id (the poll would fail), the cursor and `trigger.item.<field>` names. The pasted JSON stays in component state and is cleared on close |
| Poll bar | `components/poll-status-bar.tsx` under the editor header when the draft's trigger is `http.poll`, from `GET …/poll` (refreshed every minute): Publish to start polling / Waiting for the first poll / Existing items recorded / Polling / Failing (N in a row) with the last error and "next attempt … (backing off)"; schedule description and next poll; last polled, last success, items fired. The Schedule strip (Part 17) is hidden for poll workflows (same schedule) |
| Quota | Publishing past the limit shows the backend's message plus "Archive another polling workflow, or switch this one to a webhook if the API can send them" (`details.code = POLL_QUOTA_EXCEEDED`) |
| Run detail | "New item `<itemId>` found by the poll at …" for `POLL` runs; the `POLL` badge comes from Part 16 |
| References | `http.poll` registered: `trigger.item` (free-form below), `itemId`, `polledAt`, `scheduleId`, `triggerType` |

## Implementation Evidence

Implemented 2026-10-04 on branch `feat/part-20-http-poll-trigger`. Browser criteria are left for the product owner's QA.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-20.1 | PASS (component) / QA | `node-settings.test.tsx` "HTTP poll form": request, schedule, items, identity, cursor, first poll and max round-trip; sample check; a real poll against a test API needs the backend and worker |
| AC-20.2 | PASS (component) / QA | `poll-status-bar.test.tsx`: waiting, seeded, failing with back-off and items fired |
| AC-20.3 | PASS | Templated URL flagged with the explanation |
| AC-20.4 | PASS | `trigger.item` (and below) offered via the catalogue; the sample check lists `trigger.item.<field>` names |

Deviation recorded: **FR-20.6** — there is no server-side dry-run poll, so paths are checked against a pasted sample locally (as the spec's design question anticipated).

Tests added: `poll-model.test.ts` (4), `poll-status-bar.test.tsx` (3), poll form +5; MSW handler and contract for `GET …/poll`.

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `test:cov` 44 files / **539 tests** ✔ (coverage thresholds met), `build` ✔, `check:bundle` ✔ (main chunk 188.6 KB gzip of 200 KB).
