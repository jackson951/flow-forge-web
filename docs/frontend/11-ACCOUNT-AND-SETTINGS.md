# 11 — Account and Settings

**Status:** IMPLEMENTED — awaiting product-owner QA (AC-11.1 in the browser). See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

One place for the user's account and the current workspace's settings.

## Scope

Settings layout with tabs: Account, Workspace (general), Members (Part 03 content), Danger zone.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-11.1 | Account: name and email from `GET /auth/me`; "Log out of all devices" (Part 02). Fields the backend cannot change yet are shown read-only, not as fake inputs. |
| FR-11.2 | Workspace: name (rename, ADMIN), workspace id copyable (useful for support with request ids), the caller's role. |
| FR-11.3 | Members tab hosts Part 03's member management. |
| FR-11.4 | Danger zone: leave workspace; delete workspace (OWNER) with typed confirmation. |
| FR-11.5 | Settings routes deep-linkable (`/w/:id/settings/members`). |

## Backend Endpoints

`GET /auth/me`, `POST /auth/logout-all`, workspace and member endpoints (Part 03).

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-11.1 | Each tab works against the backend and respects roles | Browser + component tests |
| AC-11.2 | Nothing is presented as editable that the backend cannot change | Review |

## Dependencies

Parts 02–03.

## Out of Scope

Profile editing, password change (no backend endpoints yet).

## As implemented

| Area | Implementation |
| --- | --- |
| Layout | `settings-page.tsx`: four deep-linkable tabs with icons — Workspace (`/settings`), Members (`/settings/members`), Account (`/settings/account`), Danger zone (`/settings/danger`) |
| Account | `account-settings-page.tsx`: name, email and "member since" from the session user (`GET /auth/me`), shown as text with the note that changing them is not available yet (the backend has no endpoint); sessions: "Sign out" (this device) and "Sign out everywhere" (`POST /auth/logout-all`, Part 02 behaviour). The user menu gained an "Account settings" link |
| Workspace | Unchanged from Part 03: rename (ADMIN/OWNER, disabled with a hint otherwise), your role, copyable workspace id |
| Members | Part 03's member management |
| Danger zone | Moved to its own tab (`danger-zone-page.tsx`): leave (everyone), delete with the name typed (OWNER only); icons added |

## Implementation Evidence

Implemented 2026-10-03 on branch `feat/part-11-account-settings`.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-11.1 | PASS (component) — browser awaiting QA | Component tests: tabs and deep links; account details; sign out everywhere → `/auth/logout-all` and back to sign-in; user menu link; MEMBER cannot rename; MEMBER can leave but not delete (Part 03 tests cover rename/members/delete/leave flows) |
| AC-11.2 | PASS | Review + test: the account panel has no text inputs; name/email/password are text with "not available yet"; the only editable field (workspace name) is backed by `PATCH /workspaces/:id` |

Tests: `settings/settings.test.tsx` (6); Part 03 tests updated for the danger zone's new tab.

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 26 files / 352 tests ✔, `build` ✔.

