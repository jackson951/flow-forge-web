# 15 — Frontend Release Readiness

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

## Objective

An evidence-based audit of the web app and the release documentation, mirroring backend Part 22: any area without evidence is FAIL, not PASS.

## Scope

Audit, release checklist, known limitations, technical debt, user guide, troubleshooting, screenshots.

## Functional Requirements

### Audit areas (verdict PASS / PASS WITH LIMITATIONS / FAIL, with evidence)

Contract alignment · Authentication & session security · Workspace isolation in the UI · Workflow editor correctness · Node configuration coverage · Publishing & versions · Runs & failure handling · Integrations · Accessibility · Responsiveness · Performance · Error handling · Testing · Build & Docker · CI · Documentation.

### Release checklist (minimum)

- [ ] Parts 01–14 COMPLETE or explicitly deferred with rationale
- [ ] CI green on the release commit (link)
- [ ] All E2E journeys green against the backend release image
- [ ] No tokens in web storage; refresh/logout behaviour verified in a browser
- [ ] `axe` clean on every page; keyboard-only journey recorded
- [ ] Bundle budgets met
- [ ] `npm audit --audit-level=high` clean or exceptions documented
- [ ] Setup guide executed from a clean clone (frontend + backend together)
- [ ] Real-provider connects recorded (GitHub, Slack; Microsoft as far as the account allows)
- [ ] No known critical/high defects open

## Deliverables

This document completed with audit table, checklist with evidence, known limitations, technical debt, future improvements, user guide (build your first workflow), troubleshooting (login loops, CORS/proxy, OAuth return, stale drafts, blocked integrations), screenshots of main pages; README updated to link it.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-15.1 | Every audit area has a verdict and evidence | This document |
| AC-15.2 | Checklist fully checked or explicitly deferred | This document |
| AC-15.3 | Limitations and debt listed honestly | Review |
| AC-15.4 | Clean-clone setup of frontend + backend works by following the docs | Recorded run |
| AC-15.5 | User guide lets a new user build and run a workflow without help | Walkthrough recorded |

## Dependencies

All previous parts, including the expanded-platform Parts 16–22 (release readiness covers the whole app; its checklist and E2E journeys include schedules, HTTP, webhooks, polls, Jira and Gmail).
