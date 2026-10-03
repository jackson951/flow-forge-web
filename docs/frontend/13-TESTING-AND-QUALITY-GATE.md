# 13 — Testing and Quality Gate

**Status:** IN PROGRESS (2026-10-03) — unit/component gate, coverage thresholds, bundle budget and the E2E harness with all six journeys are in place; **the E2E suite has not been run yet** (AC-13.1, AC-13.4 pending a run by the product owner or the manual CI workflow). See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

A test pyramid that proves the UI works with the real backend: fast unit/component tests on MSW, and end-to-end tests (Playwright) against a real API + worker; coverage thresholds and a CI gate.

## Scope

Vitest configuration and coverage, MSW conventions, Playwright harness with a real backend stack, E2E journeys, CI gate.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-13.1 | Unit/component tests (Vitest + Testing Library + MSW) for every feature; network blocked except MSW. |
| FR-13.2 | Coverage thresholds: ≥ 90 % lines for pure logic (definition mapping, editor reducer, condition builder, reference suggestions, session/refresh, error mapping, policy helper); ≥ 70 % overall. |
| FR-13.3 | Playwright E2E against a real stack started by the test harness: backend from the `flowforge-api` Docker image (migrate → api → worker, `NODE_ENV=test`, TEST webhook provider and fake AI enabled), Postgres and Redis; fresh database per run. |
| FR-13.4 | E2E journeys: (1) register → create workspace → create workflow (manual trigger → condition → log) → publish → run → SUCCEEDED with the right branch; (2) webhook-triggered workflow via the TEST provider (signed request from the test) → run appears; (3) failing step → FAILED → retry → acknowledgement path; (4) second user cannot open the first user's workspace URL; (5) draft conflict across two pages; (6) keyboard-only journey (Part 12). |
| FR-13.5 | No secrets in the browser: E2E asserts `localStorage`/`sessionStorage` contain no tokens and no response body seen by the page contains integration credentials. |
| FR-13.6 | Flake policy: retries off by default; a flaky test is fixed or quarantined with an issue, never silently retried. |

## Testing Requirements

This part is the testing requirement; it also back-fills E2E coverage for Parts 02–11.

## Deliverables

`vitest` coverage config, `src/test/msw/*`, `e2e/` with Playwright config, global setup that starts/stops the backend stack (Docker Compose project with its own names/ports), npm scripts `test:e2e`, README testing guide.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-13.1 | All journeys in FR-13.4 pass against the real backend | Playwright report |
| AC-13.2 | Coverage thresholds enforced | `npm run test:cov` |
| AC-13.3 | Unit tests run offline in < 60 s | CI timing |
| AC-13.4 | E2E stack starts from a clean machine with one command | Recorded run |

## Dependencies

Parts 01–12; backend Docker image (backend Part 20).

## As implemented

| Area | Implementation |
| --- | --- |
| Unit / component | Vitest + Testing Library + MSW (unchanged conventions: `onUnhandledRequest: 'error'`, so nothing reaches the network); `include` limited to `src/**/*.test.*` so Playwright files are never picked up |
| Coverage | `@vitest/coverage-v8`; thresholds in `vite.config.ts`: ≥ 70 % lines overall and ≥ 90 % lines for each pure-logic module — definition mapping, editor reducer, graph rules, save queue, condition model, reference suggestions, session/refresh, error mapping, role policy; `npm run test:cov` fails below them |
| Gate | `npm run gate` = format → lint → typecheck → coverage → build → bundle budget; CI (`ci.yml`) now runs coverage instead of plain tests and adds `check:bundle` |
| Bundle | Part 12 open item fixed: run detail route lazy (React Flow out of the initial load) → 188.8 KB gzip initial JS |
| E2E harness | `playwright.config.ts` (Chromium, retries 0, 1 worker, traces/screenshots on failure, HTML report) + `e2e/global-setup.ts` / `global-teardown.ts` starting an isolated Compose project `flowforge-e2e` (`e2e/docker-compose.e2e.yml`): Postgres on **tmpfs** (fresh DB every run), Redis, backend `migrate` → `api` → `worker` built from the flowforge-api repo, `NODE_ENV=test`, fake AI, TEST webhook provider, throwaway secrets generated per run, no `.env` read; the app is built and served by `vite preview` on :4173 proxying `/api` to the stack. One command: `npm run test:e2e` (first time `npm run test:e2e:install`) |
| Journeys (`e2e/journeys.e2e.ts`) | (1) register → workflow (manual → condition → true/false logs) built in the editor → publish → Run now with JSON → SUCCEEDED, "Branch not taken" on the false branch, no tokens in storage; (2) TEST-provider webhook (HMAC signed by the test) → run listed and SUCCEEDED on the false branch — the TEST trigger row is inserted with `psql` because the UI has no test-only trigger (same as the backend's tests); (3) step failing deterministically (template > 16 KB) → FAILED with explanation → retry from the start → linked retry run; (4) a second user opening the first user's workspace URL sees "Workspace not found"; (5) two pages on one draft → second save shows the conflict dialog → "Reload theirs"; (6) keyboard-only sign-in, adding steps with Enter, connecting via the "Connect to" menu, Ctrl+S |
| FR-13.5 | `expectNoTokensInStorage` (journey 1): no JWT-, Slack- or GitHub-token-like values or token keys in localStorage/sessionStorage |
| CI E2E | `.github/workflows/e2e.yml` — manual (`workflow_dispatch`) job that checks out the backend repo (input) and runs the suite; opt-in until backend access from this repo's CI is confirmed |

## Implementation Evidence

| ID | Result | Evidence |
| --- | --- | --- |
| AC-13.1 | **Not run yet** | Harness and six journeys written, typechecked and linted. Not executed in this session (the product owner runs browser/E2E checks; this machine is memory-constrained). Run `npm run test:e2e` or the manual E2E workflow |
| AC-13.2 | PASS | `npx vitest run --coverage`: 31 files / 399 tests ✔; Statements 95.25 %, Branches 88.63 %, Functions 86.35 %, **Lines 95.25 %**; per-module 90 % line thresholds met (the run exits non-zero otherwise) |
| AC-13.3 | Not met locally | Unit tests are offline (MSW), but the full suite takes far longer than 60 s on this machine (~15–20 min under memory pressure). To be measured on CI |
| AC-13.4 | Pending | One-command E2E stack written (`npm run test:e2e`); a recorded clean-machine run is still needed |

Deviation (journey 3): the uncertain-outcome acknowledgement cannot be produced deterministically with the real worker; it stays covered by component tests using the backend's 409 shape (Part 08). Also fixed: a Part 02 login test raced the background session check in full runs — it now waits for the session to settle.

