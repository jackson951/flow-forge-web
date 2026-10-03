# 10 — Integrations

**Status:** IMPLEMENTED for the current backend (GitHub, Slack, Microsoft) — awaiting product-owner QA for the browser criteria (AC-10.1, AC-10.3–10.5). BYOK AI connections (FR-10.8–10.11, AC-10.6–10.8) are a later enhancement that needs backend Part 23. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Manage a workspace's integration connections of every kind, driven by the provider list rather than hard-coded around OAuth:

- **OAuth / app-based:** GitHub, Slack, Microsoft. Includes the OAuth round trip back into the app.
- **API key (BYOK):** OpenAI and Anthropic. The workspace brings its own key, and can have several connections per provider (e.g. "Development OpenAI", "Production OpenAI").

Product rule (2026-10-03): AI runs on the workspace's own keys. The Integrations page shows **what this workspace has connected**, never server-wide AI configuration. `/node-types` says what FlowForge *can* run; the integrations endpoints say what *this workspace* has connected. These two are never conflated.

## Scope

Integrations page grouped by category (Developer tools: GitHub · Communication: Slack · Productivity: Microsoft To Do · AI: OpenAI, Anthropic), provider availability, OAuth connect flow and callback landing, API-key connect/test/rename/rotate dialogs, several connections per provider, connection details, reconnect, disconnect. Requires backend [Part 23](../../../flowforge-api/flowforge-api/docs/backend/23-AI-BYOK-CONNECTIONS.md) for the AI providers.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-10.1 | Provider cards from `GET /integrations/providers`: name, what it enables (trigger/actions), whether this server has it configured (unconfigured → disabled with an explanation for the operator). |
| FR-10.2 | Connections from `GET /workspaces/:ws/integrations`: provider, account label, status (`CONNECTED` / `NEEDS_ATTENTION` / `DISCONNECTED`), scopes, connected by, last used — never any token. |
| FR-10.3 | Connect (ADMIN): `POST …/integrations/:provider/connect` → `{ url }` → full-page navigation to the provider. Before leaving, remember the workspace and where the user came from (e.g. a node's config panel) so they return there. |
| FR-10.4 | Callback landing: the backend redirects to `/integrations?provider=&status=connected|error&connectionId=&reason=`; the app maps it to the right workspace page, shows success ("Slack connected: <workspace>") or a specific error per `reason` (e.g. `provider_error`, `access_denied`, `state_expired`), then removes the query string. |
| FR-10.5 | `NEEDS_ATTENTION` connections show why (token revoked/expired, app uninstalled) and a Reconnect button (same connect flow). |
| FR-10.6 | Disconnect (ADMIN) with confirmation that names the workflows using the connection (from workflow drafts/versions referencing `connectionId`, best effort) and states that their steps will fail until reconnected. |
| FR-10.7 | Provider-specific notes: GitHub is an App installation (choose repositories on GitHub); Slack needs the bot invited to private channels; Microsoft To Do needs a mailbox-enabled account. |
| FR-10.8 | **Later (needs backend Part 23).** The page is built from `GET /integrations/providers` (`category`, `connectionType: OAUTH \| API_KEY`); each provider card lists **all** its connections (name, status, key hint "…a1b2" for API keys, created by, last used). No provider or connection count is hard-coded. Logos: GitHub, Slack, Microsoft, OpenAI, Anthropic. |
| FR-10.9 | **Later (needs backend Part 23).** API-key connect (ADMIN): a dialog with a connection name and a password-type API key field; **Test connection** (`POST …/integrations/:provider/test`) shows the normalised result (OK / invalid key / rate limited / provider unavailable / timed out); **Connect** (`POST …/integrations/:provider/api-key`) stores it. The key is sent only in the JSON body. It is never put in the URL, localStorage, sessionStorage, IndexedDB, the query cache, logs or analytics. The field is cleared on success, cancel and close, and the form state is reset. |
| FR-10.10 | **Later (needs backend Part 23).** API-key connections can be renamed, tested again (saved key), rotated (new key, same dialog rules) and disconnected, the last with the FR-10.6 warning about workflows that use them. A connection the backend marks `NEEDS_ATTENTION` (key rejected) explains why and offers **Replace key**. |
| FR-10.11 | **Later (needs backend Part 23).** Coming from an AI node ("Connect OpenAI" in Part 06) returns to that node after connecting and offers the new connection there (same return-to-origin rule as OAuth). |

## Backend Endpoints

`GET /integrations/providers`, `GET /workspaces/:ws/integrations`, `POST …/integrations/:provider/connect`, `DELETE …/integrations/:connectionId`; callback is handled by the backend (`GET /integrations/:provider/callback`), which redirects to the frontend. API keys (backend Part 23): `POST …/integrations/:provider/api-key`, `POST …/integrations/:provider/test`, `POST …/integrations/:connectionId/test`, `PATCH …/integrations/:connectionId`, `PUT …/integrations/:connectionId/api-key`.

## Security Requirements

The callback query string carries no secrets (backend keeps `code`/`state` server-side); the app still strips it from the URL and history. Connect URLs are only followed if they come from the backend response. API keys: plaintext lives only in the dialog's input while it is open; mutations do not keep the key in TanStack Query's mutation cache (variables cleared after settle), and error messages and toasts never echo it.

## Testing Requirements

Component: provider states and categories, several connections per provider, connection statuses, callback parsing for every `status`/`reason` (MSW). API-key dialog: test results for every outcome, connect, the key absent from storage, URL and query cache after success, cancel and error, rename, rotate, disconnect warning, MEMBER read-only. Browser: real connect for GitHub and Slack (Microsoft connect as far as the account allows); OpenAI and Anthropic with the product owner's keys (never committed).

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-10.1 | Connecting Slack and GitHub from the UI returns to the app with a success message and the connection listed | Browser with real providers (ngrok/redirect URLs as in backend Parts 10/13) |
| AC-10.2 | Every callback error reason shows a specific, actionable message | Component tests |
| AC-10.3 | Starting a connection from a node config panel returns to that panel | Browser |
| AC-10.4 | Disconnect removes the connection and warns about affected workflows | Browser |
| AC-10.5 | No token appears anywhere in the UI or network responses | Browser network inspection recorded |
| AC-10.6 | **Later (needs backend Part 23).** A workspace connects two OpenAI keys and one Anthropic key, sees all three listed with key hints, and can test, rename, rotate and disconnect them | Component tests + browser |
| AC-10.7 | **Later (needs backend Part 23).** After connecting, cancelling or failing, the API key is not in localStorage, sessionStorage, IndexedDB, the URL, the query cache or any response | Component test + browser storage/network inspection |
| AC-10.8 | **Later (needs backend Part 23).** AI status on the page comes from the workspace's connections, never from `/node-types` or server configuration | Component test |

## Dependencies

Parts 01–03.

## Risks / Design Questions

- Microsoft To Do cannot be fully verified until a mailbox-enabled account is available (same blocker as backend Part 14).
- Product owner decision (2026-10-03): build the frontend for what the backend has now; BYOK AI connections (backend Part 23 + FR-10.8–10.11) are a later enhancement and do not block this part.

## As implemented

| Area | Implementation |
| --- | --- |
| Providers | `pages/integrations-page.tsx`: one card per provider the backend lists and the app knows (`provider-catalog.ts`: GitHub, Slack, Microsoft To Do; the backend's TEST provider is never shown), with logo, what it enables (trigger / actions), provider notes (GitHub App + choosing repositories, inviting the Slack bot to private channels, Microsoft mailbox / admin approval). Not configured on this server → "Not available on this server" with an explanation for the operator, no connect button |
| Connections | Every connection of the provider (several per provider supported): account label, safe metadata (GitHub personal/organization and all/selected repositories; Microsoft display name), status with icon (Connected / Needs attention / Disconnected), permissions (scopes), connected and last-used times. Never a token. "Connected by" is not shown: the backend does not return it |
| Connect | ADMIN/OWNER: `POST …/:provider/connect` → the URL is followed only if it is https (or localhost in development) — `connect-flow.ts`; before leaving, the workspace, return path and step are remembered in sessionStorage (this tab only). From a step's settings, "Connect Slack" starts the flow directly and returns to that step (the editor reselects it and shows the result); members are told to ask an admin |
| Callback | New route `/integrations` (where the backend redirects): reads `provider/status/connectionId/reason`, goes back to the remembered place (or the user's last-used / first workspace), passes the result in router state and replaces the URL so the query string leaves the address bar and history. Success: "Slack connected: Acme Slack." with the new connection highlighted; errors: a specific message per backend reason (`denied`, `not_authorized`, `invalid_state`, `unknown_provider`, `provider_error`, anything else) |
| Needs attention | Explains why (revoked/expired token or app uninstalled; steps fail until reconnected) and offers **Reconnect** (same flow; the backend updates the existing connection) |
| Disconnect | ADMIN/OWNER: dialog lists the workflows whose saved draft uses the connection (best effort: the 50 most recent workflows' drafts; published versions are not checked — the backend has no "where used" endpoint) and says their steps fail until reconnected; `DELETE …/:connectionId` then the list refreshes |

## Implementation Evidence

Implemented 2026-10-03 on branch `feat/part-10-integrations`, for the providers the backend has. Browser criteria are left for the product owner's QA (real GitHub/Slack apps and redirect URLs as in backend Parts 10/13).

| ID | Result | Evidence |
| --- | --- | --- |
| AC-10.1 | Awaiting QA | Component: connect follows the backend URL and remembers the workspace; the callback lands on Integrations with "Slack connected: Acme Slack." and the query string removed. Real Slack/GitHub round trips need the browser |
| AC-10.2 | PASS | Component tests: each backend reason (and an unknown one) shows its specific message |
| AC-10.3 | Awaiting QA | Component: "Connect Slack" from a step stores the return path and step key; the callback returns to the stored path with `selectStep` in state (the editor selects it). Browser round trip pending |
| AC-10.4 | Awaiting QA | Component: the dialog lists the workflow whose draft uses the connection and the consequence; DELETE sent and the connection disappears. Browser pending |
| AC-10.5 | Awaiting QA | The UI renders only connection metadata (component test asserts no token-like text on the page); the backend never returns tokens. Network inspection in the browser pending |
| AC-10.6–10.8 | Later | BYOK AI connections — need backend Part 23 |

Tests: `integrations/integrations.test.tsx` (20); Part 06 settings tests updated for connect-from-step (admin starts the flow and returns; members are pointed to an admin).

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `npm test` 25 files / 346 tests ✔, `build` ✔.

