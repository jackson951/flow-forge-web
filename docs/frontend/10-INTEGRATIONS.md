# 10 — Integrations

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

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
| FR-10.8 | The page is built from `GET /integrations/providers` (`category`, `connectionType: OAUTH \| API_KEY`); each provider card lists **all** its connections (name, status, key hint "…a1b2" for API keys, created by, last used). No provider or connection count is hard-coded. Logos: GitHub, Slack, Microsoft, OpenAI, Anthropic. |
| FR-10.9 | API-key connect (ADMIN): a dialog with a connection name and a password-type API key field; **Test connection** (`POST …/integrations/:provider/test`) shows the normalised result (OK / invalid key / rate limited / provider unavailable / timed out); **Connect** (`POST …/integrations/:provider/api-key`) stores it. The key is sent only in the JSON body. It is never put in the URL, localStorage, sessionStorage, IndexedDB, the query cache, logs or analytics. The field is cleared on success, cancel and close, and the form state is reset. |
| FR-10.10 | API-key connections can be renamed, tested again (saved key), rotated (new key, same dialog rules) and disconnected, the last with the FR-10.6 warning about workflows that use them. A connection the backend marks `NEEDS_ATTENTION` (key rejected) explains why and offers **Replace key**. |
| FR-10.11 | Coming from an AI node ("Connect OpenAI" in Part 06) returns to that node after connecting and offers the new connection there (same return-to-origin rule as OAuth). |

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
| AC-10.6 | A workspace connects two OpenAI keys and one Anthropic key, sees all three listed with key hints, and can test, rename, rotate and disconnect them | Component tests + browser |
| AC-10.7 | After connecting, cancelling or failing, the API key is not in localStorage, sessionStorage, IndexedDB, the URL, the query cache or any response | Component test + browser storage/network inspection |
| AC-10.8 | AI status on the page comes from the workspace's connections, never from `/node-types` or server configuration | Component test |

## Dependencies

Parts 01–03.

## Risks / Design Questions

- Microsoft To Do cannot be fully verified until a mailbox-enabled account is available (same blocker as backend Part 14).
- This part is not complete until BYOK AI connection management is implemented (backend Part 23) and tested.
