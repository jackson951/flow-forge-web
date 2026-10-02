# 13 — Testing and Quality Gate

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
