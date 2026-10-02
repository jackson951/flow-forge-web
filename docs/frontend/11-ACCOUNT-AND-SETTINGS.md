# 11 — Account and Settings

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
