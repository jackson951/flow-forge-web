# 03 — Workspaces and Members

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
