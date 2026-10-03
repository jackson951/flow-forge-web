# 12 — UX Quality and Accessibility

**Status:** QA PASSED — one open item: AC-12.4 bundle budget FAILS (254 KB > 200 KB; React Flow in the initial bundle via the run detail page). Fix scheduled at the start of Part 13; the part is complete once the budget passes. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Consistent, accessible, resilient UI across every page: one way to show loading, emptiness, errors and success; WCAG 2.2 AA; usable from 1280 px desktop down to tablet.

## Why This Part Exists

Quality slips page by page unless it is defined once. This part sets the rules early (applied from Part 02 on) and closes with an audit of every page.

## Scope

Shared components and patterns, error presentation, notifications, accessibility, responsive layout, performance budgets.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-12.1 | Shared states: skeletons for loading lists/details, `EmptyState`, `ErrorState` (message + request id from `ApiError` + retry), permission-denied and not-found pages. |
| FR-12.2 | Error mapping in one place: 400 → field errors; 401 → session (Part 02); 404 → not found; 409 → specific conflict UI; 422 → validation issues; 429 → wait time; 5xx/network → "Something went wrong" with request id; never a raw stack or JSON dump. |
| FR-12.3 | Toast notifications for completed mutations and background failures; important outcomes also stay visible on the page (toasts are not the only record). |
| FR-12.4 | Confirmation dialogs for destructive actions name the thing being destroyed and its consequences. |
| FR-12.5 | Accessibility: semantic landmarks; every control labelled; visible focus (ember accent token); full keyboard operation including the canvas alternative (select node, move with arrows, connect via menu); dialogs trap focus and restore it; colour contrast ≥ 4.5:1; status never colour-only; `prefers-reduced-motion` respected. |
| FR-12.6 | Responsive: sidebar collapses below 1024 px; tables become stacked lists on narrow screens; the editor is supported on desktop/tablet and shows a "best on a larger screen" note on phones (read-only views still work). |
| FR-12.7 | Performance budgets: initial JS for non-editor routes ≤ 200 KB gzip; editor chunk loaded on demand; route change shows content or skeleton within 100 ms; lists virtualised beyond 200 rows. |
| FR-12.8 | Times shown relative ("3 min ago") with absolute time on hover, in the user's timezone; durations human-readable; ids in monospace with copy buttons. |

## Testing Requirements

`axe` checks in component tests for every page; keyboard-only E2E for login, workflow creation and running; bundle size check in CI (Part 14).

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-12.1 | No `axe` violations (serious/critical) on any page | Automated tests |
| AC-12.2 | Main journey (login → build → publish → run → inspect) is completable by keyboard only | Recorded E2E/manual run |
| AC-12.3 | Every API error class renders the agreed UI | Component tests per status |
| AC-12.4 | Bundle budgets met | Build output in CI |
| AC-12.5 | Pages usable at 1024 px and 768 px widths | Screenshots recorded |

## Dependencies

Starts after Part 02; audited at the end after Part 11.

## Scope added by the product owner (2026-10-03)

- **Public website** for signed-out visitors: homepage at `/` (signed-in users still go to their workspace), `/features`, `/integrations` (catalogue; the same path still finishes OAuth callbacks when it has `?status=`), `/security`; shared header (sign in / start building, or "Open FlowForge" when signed in) and footer. Content lists only what the backend does (GitHub, Slack, Microsoft To Do, AI summarise/classify/extract); the app's URLs stay under `/w/:workspaceId` (already separate from the website).
- **Way back home**: logo links and "Back to home" on sign-in / register, so signing out (which lands on sign-in) always has a way to the homepage.
- **Robust sign-in / registration**: icons in fields, show/hide password (one toggle label + `aria-pressed`), Caps Lock warning, autofocus, email input hints (`inputMode`, no autocapitalise/spellcheck), length limits, no double submit, spinner while sending; register adds a live password checklist (12–128) and a client-only "Confirm password" (never sent); 409 email taken → message on the field + "Sign in instead"; network and 5xx errors use the shared wording with the request id.
- **Onboarding**: new workspaces see "Welcome to FlowForge — let's get your first workflow running" on the dashboard checklist (registration already creates a workspace on the backend).
- Later (need backend work): email verification, forgot/reset password, workspace slugs, more integrations, BYOK AI.

## As implemented

| Area | Implementation |
| --- | --- |
| Accessibility checks | `axe-core` (dev) + `src/test/axe.ts` (serious/critical; colour contrast not computable in jsdom); `app/a11y.test.tsx` renders every page — dashboard, workflow list, editor, version view, run list, run detail, integrations, 4 settings tabs, not found, sign in, register, and the 4 public pages |
| Error mapping | `lib/error-presentation.ts` `presentError`: network, 400, 401, 403, 404, 409, 422, 429 (wait time), 5xx/unknown (generic + request id); never raw details. `ErrorState` takes the error, shows an icon (offline icon for network), copyable request id and "Try again"; all pages migrated; auth forms use the same wording for network/5xx |
| Toasts | `lib/toast.ts` store + `Toaster` (labelled region; errors `role=alert`, others `status`; auto-dismiss 4–8 s; dismiss button). Mutations declare `meta.success` (wired once on the query client's mutation cache): workflow created/saved/duplicated/archived/unarchived/deleted, published vN, run started, retry started, cancel, disconnected, workspace created/renamed/deleted, member added/removed/role changed, left workspace. Background failure: autosave failure is toasted (banner stays) |
| Keyboard | React Flow nodes are focusable and arrow keys move them — keyboard moves are now saved (drag-end or no dragging flag). New "Next steps" in the step panel: outgoing connections with remove, "Connect to" menu offering only valid targets (graph rules) and the branch for conditions |
| Focus / motion | Visible focus and `prefers-reduced-motion` styles were already global (`styles/index.css`); confirmed |
| Responsive | Sidebar collapses below 1024 px (existing); runs table hides trigger/duration/error columns on narrow screens (workflow and member tables already did); editor step panel now from 768 px (both panels collapsible); phones get a "works best on a larger screen" note |
| Budgets | `scripts/check-bundle.mjs` (`npm run check:bundle`): initial JS (entry + preloads) ≤ 200 KB gzip, React Flow not in the initial load |
| Times / ids | Relative times with absolute on hover across lists; request, correlation and workspace ids monospace with copy buttons |

## Implementation Evidence

Implemented 2026-10-03 on branch `feat/part-12-ux-a11y`.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-12.1 | PASS (automated) | `a11y.test.tsx`: no serious/critical axe violations on every app page, sign-in, register and the 4 public pages (two issues found and fixed: toaster region label, hero image label) |
| AC-12.2 | PASS (product-owner QA) | Keyboard path exists (focusable nodes + arrow moves, "Connect to" menus, dialogs trap focus); a recorded keyboard-only run is left for product-owner QA |
| AC-12.3 | PASS | `error-presentation.test.tsx`: each status class → agreed title/message/retry; no raw details; ErrorState and toasts tested |
| AC-12.4 | **FAIL** | `npm run check:bundle`: initial JS **254.3 KB gzip** (budget 200 KB) and React Flow is in the initial bundle — the run detail page (Part 08) imports the canvas statically for its "path taken" view. Fix: load the run detail page (or its canvas) on demand like the editor; to do in Part 13 |
| AC-12.5 | PASS (product-owner QA) | Responsive changes above; screenshots at 1024/768 px left for QA |

Not done (recorded honestly): list virtualisation beyond 200 rows (lists are keyset-paged, 20 per page; virtualisation deferred); tables hide columns rather than becoming stacked cards on narrow screens.

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 31 files / 399 tests ✔, `build` ✔, `check:bundle` ✘ (see AC-12.4). The run finished after the product owner committed.

### Product-owner QA

Product owner QA (2026-10-03, real backend + worker): all features in this part tested in the browser and accepted. Worker log excerpt shows manual and GitHub-triggered runs passing conditions and log steps, one GitHub event starting two workflows (same correlation id), a real Slack message posted (`slack.sendMessage`, 1.5 s), the sweeper re-enqueuing stale QUEUED runs after a worker restart, and every run finishing SUCCEEDED.
