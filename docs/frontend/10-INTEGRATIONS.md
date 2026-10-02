# 10 — Integrations

**Status:** NOT STARTED (see [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md))

## Objective

Connect, inspect and disconnect GitHub, Slack and Microsoft accounts for a workspace, including the OAuth round trip back into the app.

## Scope

Integrations page, provider availability, connect flow, callback landing handling, connection details, reconnect, disconnect.

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

## Backend Endpoints

`GET /integrations/providers`, `GET /workspaces/:ws/integrations`, `POST …/integrations/:provider/connect`, `DELETE …/integrations/:connectionId`; callback is handled by the backend (`GET /integrations/:provider/callback`), which redirects to the frontend.

## Security Requirements

The callback query string carries no secrets (backend keeps `code`/`state` server-side); the app still strips it from the URL and history. Connect URLs are only followed if they come from the backend response.

## Testing Requirements

Component: provider states, connection statuses, callback parsing for every `status`/`reason` (MSW). Browser: real connect for GitHub and Slack (Microsoft connect as far as the account allows).

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-10.1 | Connecting Slack and GitHub from the UI returns to the app with a success message and the connection listed | Browser with real providers (ngrok/redirect URLs as in backend Parts 10/13) |
| AC-10.2 | Every callback error reason shows a specific, actionable message | Component tests |
| AC-10.3 | Starting a connection from a node config panel returns to that panel | Browser |
| AC-10.4 | Disconnect removes the connection and warns about affected workflows | Browser |
| AC-10.5 | No token appears anywhere in the UI or network responses | Browser network inspection recorded |

## Dependencies

Parts 01–03.

## Risks / Design Questions

- Microsoft To Do cannot be fully verified until a mailbox-enabled account is available (same blocker as backend Part 14).
