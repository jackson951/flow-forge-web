# 03 — Workspaces and Members

**Status:** COMPLETE (2026-10-03) — evidence below; see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Let users see and switch between their workspaces, create and manage them, and manage members — with the UI reflecting each role's permissions.

## Why This Part Exists

Everything in FlowForge belongs to a workspace. The workspace in the URL decides which data is shown, so switching must be explicit and leak-free.

## Scope

Workspace switcher, current-workspace resolution, create/rename/delete workspace, member list, add member, change role, remove member / leave, role-aware UI.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-03.1 | Workspace switcher in the sidebar lists `GET /workspaces` (name + caller's role) and a "Create workspace" action. |
| FR-03.2 | Current workspace comes from the URL (`/w/:workspaceId`); `/` redirects to the last-used workspace (remembered per user, not secret) or the first one. A workspace id the user cannot access (404) shows "Workspace not found" with a link to their workspaces — never another workspace's data. |
| FR-03.3 | Switching workspace navigates to the same section in the new workspace and drops in-flight queries of the old one. |
| FR-03.4 | Create (`POST /workspaces`), rename (ADMIN, `PATCH`), delete (OWNER, `DELETE`, type-the-name confirmation; afterwards redirect to another workspace). |
| FR-03.5 | Members page: list with name, email, role; add an existing user by email with a role (ADMIN); change role (ADMIN; only OWNER can grant/remove OWNER); remove member (ADMIN); "Leave workspace" for oneself; last-owner protection errors shown as returned. |
| FR-03.6 | Role-aware UI from one helper (`can(role, action)`) mirroring the backend policy: controls the caller cannot use are hidden or disabled with an explanation; the backend remains the authority (a 404/409 from the API is still handled). |

## Backend Endpoints

`GET/POST /workspaces`, `GET/PATCH/DELETE /workspaces/:id`, `GET/POST /workspaces/:id/members`, `PATCH/DELETE /workspaces/:id/members/:userId`.

## Security Requirements

Workspace id in every tenant query key (Part 01); cache for a workspace cleared when the user loses access or deletes it.

## Testing Requirements

Policy helper unit tests (table-driven, same cases as the backend's `workspace-policy.spec.ts`); component tests for member actions per role; E2E: create workspace, add a second user, the second user sees it.

## Deliverables

`features/workspaces/*`, switcher, members page under settings, policy helper.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-03.1 | Switching workspace never shows the previous workspace's data, even briefly | Component test with delayed MSW responses |
| AC-03.2 | An inaccessible workspace URL shows "not found", no data | Browser against backend (second user) |
| AC-03.3 | MEMBER sees no admin actions; ADMIN cannot grant OWNER; OWNER can delete | Component tests per role |
| AC-03.4 | Create, rename, delete, add/change/remove member work end to end | Browser against backend |

## Out of Scope

Invitations by email to non-registered users (backend adds existing users only).

## Dependencies

Parts 01–02.

## As implemented

| Area | Implementation |
| --- | --- |
| Policy | `features/workspaces/policy.ts`: `hasRole`, `canAdd`, `canChangeRole`, `canRemove`, `canRename`, `canDelete`, `canManage`, `assignableRoles` — same rules and the same test cases as the backend's `WorkspacePolicy` |
| URL guard | `WorkspaceGuard` wraps every `/w/:workspaceId` page: the id is resolved against the user's memberships; unknown or foreign ids show "Workspace not found" without rendering the shell or requesting any of that workspace's data |
| Last used | `last-workspace.ts` (per user, `localStorage`, id only, failures ignored); `/` goes there if the user still belongs to it, else to the first workspace, else offers to create one |
| Switcher | `WorkspaceSwitcher` at the bottom of the sidebar (name + role, listbox of workspaces with roles, "Create workspace"); switching cancels the old workspace's in-flight queries and keeps the section (`same-section.ts`: detail pages fall back to their list, `settings/members` is kept) |
| Settings | `/w/:id/settings` (General: rename for ADMIN, role, copyable workspace id, danger zone with Leave and — OWNER only — Delete with typed name) and `/w/:id/settings/members` (table; add member dialog with roles from the policy; role select per row offering only allowed roles; remove/leave with confirmation; backend errors shown per row, "user not found" made actionable) |
| Cache | Workspaces list updated in place on create/rename; leaving or deleting cancels and removes everything under `['ws', id]` and refetches the list |
| UI kit | `Dialog` (labelled, focus trapped, Escape/backdrop close, focus restored), `Select` |
| Visual design | Palette from the UI mock (navy rail, indigo primary, new neutrals; old ink/ember removed); new logo (gradient "F" mark, "Flow**Forge**" wordmark, tagline "Automate what matters") in the sidebar, the login/register brand panel and the favicon; login/register in a card on the canvas with the same brand rail as the app |

## Implementation Evidence

Verified 2026-10-03 on branch `feat/part-03-workspaces-members`. Browser checks: Playwright (Chromium) with two real users, Vite dev proxy → backend `flowforge-api` main against a **throwaway** database (removed afterwards).

| ID | Result | Evidence |
| --- | --- | --- |
| AC-03.1 | PASS | `workspaces.test.tsx`: on the members page of workspace A, switch to B whose members response is delayed 400 ms — A's member is gone immediately, the loading skeleton shows, then only B's members. Browser: switching keeps the section |
| AC-03.2 | PASS | Browser: Bob opens Alice's workspace URL → "Workspace not found", her workspace name nowhere on the page; after leaving, the same for Bob. Component test: a foreign id renders no shell and makes no request containing that id |
| AC-03.3 | PASS | `policy.test.ts` (30, backend's cases); `workspaces.test.tsx`: MEMBER — no add, no role selects, no remove, only Leave, name disabled; ADMIN — only Admin/Member assignable, owner row not changeable or removable, no Delete; OWNER — Delete shown. Browser: the same for Bob as MEMBER and then ADMIN |
| AC-03.4 | PASS | Browser: create workspace (opens it, Owner), add member (unknown email → actionable message; Bob added), change role (MEMBER → ADMIN), rename (switcher updates), Bob leaves (back to his workspace), `/` returns to the last used workspace, delete disabled until the name is typed, then deleted and back to the other workspace. Component tests for each, including the backend's last-owner 409 |

Screenshots: [login (desktop)](evidence/part-03/login-desktop.png), [login (phone)](evidence/part-03/login-phone.png), [app shell](evidence/part-03/app-shell.png). Browser regression: the Part 02 suite still passes (18/18).

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 12 files / 164 tests ✔, `build` ✔.

### Findings

- **Fixed (Part 02 bug):** a first-time visitor saw "Your session has ended" on the login page (the background session check without a cookie was treated as an expired session). Only an existing session can end now; the unit test that claimed "no end reason" now asserts it, and a page test covers the first visit.
- **Backend: reloading while the session refresh is in flight signs the user out — reproduced 5/5.** The reload cancels the request after the server has rotated the refresh token, so the browser never receives the new cookie; the next load presents the rotated token, gets 401 and the cookie is cleared. Same weakness as the Part 02 finding (a lost race clears the cookie). The frontend cannot prevent it (the page is gone). Recommended backend fix: inside the reuse grace window, accept the just-rotated token once more by re-issuing from its unused replacement, and never clear the cookie for a grace-window rejection.
- Line endings: the repo uses `core.autocrlf=true`; files Prettier rewrote show as modified in `git status` but have no content change (Git normalises on staging).
