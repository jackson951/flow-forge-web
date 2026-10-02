# 08 — Runs: Trigger, History and Detail

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
