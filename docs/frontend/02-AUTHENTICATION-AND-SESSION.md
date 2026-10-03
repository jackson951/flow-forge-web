# 02 — Authentication and Session

**Status:** COMPLETE (2026-10-03) — evidence below; see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

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

## As implemented

| Area | Implementation |
| --- | --- |
| Session store | `features/auth/session/session.ts` (framework-free) + `useSession()` (`useSyncExternalStore`): `status` (`unknown`/`authenticated`/`anonymous`), `user`, `endReason` (`logout`/`expired`/`other-tab`). Access token only in `lib/access-token.ts` (memory); `refreshToken` in responses ignored |
| Refresh | Single flight per tab; **Web Locks** (`flowforge-auth-refresh`) serialise refreshes across tabs; proactive refresh 60 s before `expiresIn`; restore on load = refresh → `GET /auth/me` |
| 401 handling | `api-client` registers `configureAuth({ refresh, onUnauthorized })`: a 401 triggers the shared refresh and **one** retry; a second 401 ends the session; `skipAuth` on login/register/refresh/logout |
| Guards | `RequireAuth` (spinner while restoring; anonymous → `/login?next=<page>`, except after a deliberate sign-out); `RedirectIfAuthenticated` on login/register (→ `?next=` or home) |
| Pages | Login and register with zod schemas mirroring the backend DTOs (email ≤ 254, password 12–128 on register, name trimmed 1–100), backend validation messages on their fields, 409 on the email field, 429 countdown from `Retry-After` with the button disabled, session-ended notice; register signs in and lands in the new workspace |
| Sign out | User menu in the header: Sign out (`/auth/logout`, local sign-out even if the server is unreachable), Sign out of all devices (`/auth/logout-all`); `BroadcastChannel('flowforge-auth')` signs out other tabs; the query cache is cleared on every session end (`clearCacheOnSessionEnd`) |

## Implementation Evidence

Verified 2026-10-03 on branch `feat/part-02-auth-session`. Browser checks: Playwright (Chromium) → Vite dev proxy → backend `flowforge-api` main (`5020787`) running against a **throwaway** Postgres/Redis (separate containers and ports, removed afterwards; the developer's database was not used).

| ID | Result | Evidence |
| --- | --- | --- |
| AC-02.1 | PASS | Browser: register → lands on `/w/<new workspace id>` with the user menu; log in again → returns to the page in `?next=`; wrong password → "Invalid email or password". Component tests: login, register, `?next=` |
| AC-02.2 | PASS | Browser: reload keeps the session; `localStorage` and `sessionStorage` are `{}`; `document.cookie` is `""`; `ff_refresh` is `httpOnly`, `SameSite=Strict`, path `/api/v1/auth`. Unit test: no token in web storage |
| AC-02.3 | PASS | `session.test.ts`: five concurrent 401s → exactly one `/auth/refresh`, ten probe calls (5 rejected + 5 retried), all succeed |
| AC-02.4 | PASS | Unit: failed refresh ends the session once (3 parallel requests → 1 refresh, all reject 401, `endReason: expired`); a 401 after a successful refresh ends the session. Browser: cookies cleared → reload → `/login?next=…` with the sign-in form, exactly one refresh request (401), no loop, no error page |
| AC-02.5 | PASS | `routes.test.ts` (`safeNextPath`: absolute, protocol-relative, backslash and `javascript:` rejected) and login page tests (`https://evil.example/`, `//evil.example/x` ignored) |
| AC-02.6 | PASS | Browser: sign out → `/login` with "You are signed out.", refresh cookie removed; the second tab follows with "You signed out in another tab."; sign out of all devices ends the session in a second browser context. Component test: cached queries cleared on sign-out |
| AC-02.7 | PASS | Login page test: 429 with `Retry-After: 42` → "Try again in 42 s." and the button disabled; `use-retry-countdown.test.ts` (countdown, restart on a new 429, 60 s default) |

Multi-tab refresh (FR-02.9), browser: two tabs loading at the same moment → both refreshes returned 200 (`[200, 200]`), both tabs signed in, and the cookie was still valid on the next reload.

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 9 files / 110 tests ✔, `build` ✔.

### Findings

- **Backend: a lost refresh race clears the newer cookie.** `POST /auth/refresh` clears `ff_refresh` on any failure, including a request that only lost the rotation race inside the backend's grace window. If two tabs refresh with the same cookie and the loser's response arrives last, the browser deletes the winner's fresh cookie and the next refresh fails. The frontend avoids the race with Web Locks (verified above); the backend should not clear the cookie when it answers inside the reuse grace window. Derived from the backend code (`auth.controller.ts` `refresh`, `auth.service.ts` grace handling), not reproduced without the lock.
- A deliberate sign-out does not keep `?next=`, so the next person signing in on the same browser does not land on the previous user's workspace URL; an expired session keeps it.
- Follow-up in Part 03: a first visit without a cookie wrongly showed "Your session has ended" — fixed there; and a reload during a refresh signs the user out (backend, reproduced 5/5).
- Browser checks used a scratch Playwright script (not committed); the committed E2E suite arrives in Part 13.
