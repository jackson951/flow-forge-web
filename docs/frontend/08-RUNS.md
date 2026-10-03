# 08 — Runs: Trigger, History and Detail

**Status:** IMPLEMENTED — awaiting product-owner QA for the browser criteria (AC-08.1, AC-08.4, AC-08.5; browser half of AC-08.2). See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Start manual runs, browse run history, and understand any run step by step — including the honest handling of uncertain outcomes, retries and cancellation.

## Why This Part Exists

Runs are where users find out whether automation works. The backend is careful about side effects (UNCERTAIN_OUTCOME, acknowledgement before retry); the UI must carry that care through instead of hiding it behind a generic "Retry" button.

## Scope

Manual run dialog, run list with filters, run detail with step timeline, live updates, cancel, retry (with resume and acknowledgement), error presentation.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-08.1 | "Run now" for published workflows with a `manual.trigger`: optional JSON input editor (validated JSON, ≤ 64 KB as the backend enforces), sends an `Idempotency-Key` per submit (a double click creates one run); 202 → navigate to the run. Webhook-triggered workflows explain they run on events. |
| FR-08.2 | 429 `QUEUE_BACKPRESSURE`: "FlowForge is busy — try again in N s" using `Retry-After`; 409s (archived, not published) explained. |
| FR-08.3 | Run list `GET /workspaces/:ws/runs`: status, workflow, version, trigger source, started, duration, error summary; filters status / workflow / trigger source / date range in the URL; keyset "Load more". |
| FR-08.4 | Run detail: header (status, workflow + version link, trigger source, correlation id copyable, timings, attempt count, retry links `retryOfRunId` / `retriedByRunIds`), trigger input (redacted by the backend), step timeline from `…/steps` in execution order with status, attempts, duration, input/output viewers (collapsible JSON), error category with the backend's human description. |
| FR-08.5 | Live updates: QUEUED/RUNNING runs poll (detail every 1–2 s, list every 5 s) and stop when terminal; polling pauses when the tab is hidden. |
| FR-08.6 | Cancel (ADMIN) for QUEUED/RUNNING runs, with the backend's semantics explained (running steps finish; no new step starts). |
| FR-08.7 | Retry (ADMIN) for FAILED runs: choose "from the start" or "resume from the failed step" (reuses succeeded steps). If the backend returns 409 `UNCERTAIN_OUTCOME`, show which step(s) may already have acted and require an explicit acknowledgement checkbox before re-sending with `acknowledgeUncertainOutcome: true`. 409 `PAYLOADS_TRIMMED` offers retry from the start only. |
| FR-08.8 | Error categories (`PROVIDER_AUTH`, `PROVIDER_RATE_LIMIT`, `UNCERTAIN_OUTCOME`, …) shown with an icon, label and next step (e.g. PROVIDER_AUTH → "Reconnect Slack" link to Part 10). |
| FR-08.9 | Steps on branches not taken show as SKIPPED with the reason, so the path the run took is visible on a mini canvas (reuse Part 05 read-only view with step statuses overlaid). |

## Backend Endpoints

`POST …/workflows/:id/runs`, `GET …/runs`, `GET …/runs/:id`, `GET …/runs/:id/steps`, `POST …/runs/:id/cancel`, `POST …/runs/:id/retry`.

## Testing Requirements

Component (MSW): each status rendering, polling stops on terminal state, idempotency key reuse on double submit, uncertain-outcome acknowledgement flow, trimmed-run flow, backpressure message. E2E: run a published workflow and watch it succeed.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-08.1 | A manual run started from the UI appears and updates live until SUCCEEDED | Browser against backend + worker |
| AC-08.2 | Double-clicking "Run" creates one run | Component test + browser |
| AC-08.3 | Retry after UNCERTAIN_OUTCOME requires acknowledgement and names the step | Component test (backend fixture) |
| AC-08.4 | Run detail shows the taken path, skipped branches and step input/output | Browser with a branching workflow |
| AC-08.5 | Filters and pagination work and survive reload | Browser |

## Dependencies

Parts 05 (read-only canvas), 07 (published workflows).

## As implemented

| Area | Implementation |
| --- | --- |
| Run now | `runs/components/run-now-dialog.tsx`, from the editor header ("Run now") and the workflow list row menu (published workflows). Optional JSON input: must be an object, at most 64 KB (UTF-8, as the backend measures); one `Idempotency-Key` per dialog opening, so a double click or a repeated request makes one run; 202 → opens the run. 429 `QUEUE_BACKPRESSURE` → "FlowForge is busy — try again in N s" from `Retry-After` (button disabled meanwhile); 409 reasons shown as the backend words them. In the editor the button is disabled with the reason when the workflow is archived, not published, or its active version starts from an event trigger |
| Run list | `runs/pages/runs-list-page.tsx`: status tabs, workflow, trigger source and "started between" dates — all in the URL (`?status=&workflow=&trigger=&from=&to=`, the "to" day included) and sent to `GET /runs`; table with status, workflow + version, trigger (icon), started (relative, absolute on hover), duration, error category; keyset "Load more"; polls every 5 s while a listed run is active ("Updating live") |
| Run detail | `runs/pages/run-detail-page.tsx`: status, workflow version link (opens the read-only version, Part 07), trigger source, live indicator; facts (queued/started/finished, duration, attempts, correlation id with copy, retry-of / retried-by links); banners for cancellation requested and trimmed payloads; failure section ("Failed at <step>") with the error explanation; **path taken** on a read-only canvas with each step's status, the taken edges highlighted and skipped steps dimmed; trigger input; step timeline in execution order with attempts, duration, skip reason, error, provider reference and collapsible/copyable input/output (`json-view.tsx`) |
| Live updates | Detail and steps poll every 1.5 s while QUEUED/RUNNING and stop when terminal; TanStack Query pauses intervals in hidden tabs |
| Errors | `run-helpers.ts` `ERROR_CATEGORIES`: icon, label and next step per category; `error-explanation.tsx` shows them with the backend's description and message; PROVIDER_AUTH links "Reconnect <provider>" to Integrations |
| Skipped steps | The backend stores no reason, so `skipReasons` infers it from the run's version and the condition outputs: "Branch not taken: <condition> was true/false", otherwise "Not run: the run stopped before reaching this step" |
| Cancel / retry | ADMIN/OWNER. Cancel confirms the semantics (queued: nothing runs; running: the current step finishes, no new step starts). Retry dialog: resume from the failed step (lists the steps reused) or from the start (warns that actions repeat); uncertain steps (from the steps, or the backend's 409 `UNCERTAIN_OUTCOME` with `nodeKeys`) are named and need an explicit "I checked…" before sending `acknowledgeUncertainOutcome`; trimmed runs (or 409 `PAYLOADS_TRIMMED`) allow from-the-start only; a new run opens on success |
| Canvas | `WorkflowCanvas`/`toFlow` gained an optional `statusFor` (status badge per node, taken path styling) used only by the run view |

## Implementation Evidence

Implemented 2026-10-03 on branch `feat/part-08-runs`. Browser criteria are left for the product owner's QA (they test each part in the browser).

| ID | Result | Evidence |
| --- | --- | --- |
| AC-08.1 | Awaiting QA | Component: polling while RUNNING and no more requests once SUCCEEDED; run now → opens the new run. Needs a browser run against backend + worker |
| AC-08.2 | PASS (component) — browser part awaiting QA | Component test: double click on Run → every request carries the same Idempotency-Key, one run opened |
| AC-08.3 | PASS | Component tests: the uncertain step is named, Retry stays disabled until acknowledged, the request then carries `acknowledgeUncertainOutcome: true`; the backend's 409 shape triggers the same flow |
| AC-08.4 | Awaiting QA | Component test: branching run shows "Branch not taken: is_high was true" in the timeline and "Skipped" on the canvas node; inputs/outputs listed. Browser check with a real branching workflow pending |
| AC-08.5 | Awaiting QA | Component tests: status/trigger filters update the URL and the API query, a URL with filters opens filtered, Load more uses the cursor. Browser reload check pending |

Tests: `runs/runs.test.tsx` (19).

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 23 files / 317 tests ✔, `build` ✔ (Vite notes one chunk above 500 kB — the React Flow editor/run view; code-splitting and bundle size are Part 12/14 work).

