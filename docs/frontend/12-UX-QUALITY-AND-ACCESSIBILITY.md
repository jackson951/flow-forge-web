# 12 — UX Quality and Accessibility

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
