# 02 — Authentication and Session

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

## Objective

Register, log in, stay logged in safely, and log out — with the access token only in memory and the refresh token only in the backend's httpOnly cookie.

## Why This Part Exists

Every page needs a session. Getting token storage and refresh wrong is the most common frontend security bug (tokens in localStorage, refresh storms, infinite 401 loops).

## Scope

Register and login pages, session store, silent refresh, 401 handling, route guards, logout and logout-all, session restore on page load.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-02.1 | Register (`POST /auth/register` — name, email, password with the backend's rules) and login (`POST /auth/login`) forms with client-side validation mirroring the backend DTOs; server validation messages shown on the right fields. |
| FR-02.2 | The access token lives in memory only (module-level store); the response's `refreshToken` field is ignored — the `ff_refresh` cookie is the only refresh credential. Nothing auth-related in `localStorage`/`sessionStorage`. |
| FR-02.3 | On app load, the session is restored by `POST /auth/refresh` (cookie) — it returns tokens only, so the user then comes from `GET /auth/me`; success → user + token in memory; 401 → logged-out state without an error screen. |
| FR-02.4 | Proactive refresh shortly before `expiresIn` elapses; reactive refresh on a 401: **one** refresh in flight at a time (concurrent 401s wait for it), the original request retried once, a second 401 → logged out. |
| FR-02.5 | Refresh-token reuse detected by the backend (401 on refresh) logs the user out everywhere in this tab with a clear message. |
| FR-02.6 | `RequireAuth` guard: unauthenticated users go to `/login?next=<path>`; after login they return to `next` (only same-origin relative paths accepted). Auth pages redirect away when already logged in. |
| FR-02.7 | Logout (`POST /auth/logout`) and "log out all devices" (`POST /auth/logout-all`) clear memory, the query cache and navigate to `/login`. |
| FR-02.8 | Rate limiting: 429 on login/register shows "Too many attempts, try again in N s" from `Retry-After`; the submit button stays disabled for that time. |
| FR-02.9 | Multiple tabs: a logout in one tab logs out the others (`BroadcastChannel`); a refresh in one tab does not break the others (each tab refreshes for itself; rotation conflicts handled by retrying once). |

## Technical Requirements

- Session store exposes `getAccessToken()` to the API client (Part 01) and a React hook for UI.
- Refresh calls bypass the 401 interceptor (no recursion).
- Passwords never logged or kept after submit.

## Backend Endpoints

`POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `GET /auth/me`.

## Security Requirements

No token in web storage or URLs; `next` redirect restricted to relative paths; forms use `autocomplete` attributes correctly; error messages do not reveal whether an email exists beyond what the backend returns.

## Testing Requirements

Unit: refresh single-flight with concurrent 401s, retry-once, logout on second 401, timer-based refresh. Component: forms (validation, server errors, 429). E2E (Part 13): register → logout → login → reload keeps session.

## Deliverables

`features/auth/*` (pages, session store, hooks), API client integration, guard, logout menu item.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-02.1 | A new user can register and lands in their workspace; an existing user can log in | Browser against real backend |
| AC-02.2 | Reloading the page keeps the user logged in; no token in localStorage/sessionStorage/cookies readable by JS | Browser devtools check recorded |
| AC-02.3 | Five concurrent requests hitting 401 cause exactly one refresh, then all succeed | Unit test |
| AC-02.4 | A failed refresh logs the user out cleanly (no loop, no error page) | Unit + browser |
| AC-02.5 | `?next=` returns to the intended page; absolute or protocol-relative `next` values are ignored | Unit test |
| AC-02.6 | Logout and logout-all clear cached data and redirect; other tabs follow | Browser check |
| AC-02.7 | 429 on login shows the wait time from `Retry-After` | Component test (MSW) |

## Out of Scope

Password reset, email verification, SSO (backend does not offer them).

## Dependencies

Part 01.

## Risks / Design Questions

- The cookie is `Secure` + `SameSite=Strict` on `/api/v1/auth`: works same-origin (dev proxy, nginx). A cross-origin deployment would need backend changes — documented, not supported.
