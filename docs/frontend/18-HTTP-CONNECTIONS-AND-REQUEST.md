# 18 — HTTP Connections and the HTTP Request Action

**Status:** NOT STARTED — awaiting product-owner approval of this spec. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Let a workspace call any HTTPS API from a workflow: save the API's credentials once as an **HTTP connection** (never pasted into a node), then use `http.request` steps that build requests from trigger and step data and feed the response to later steps. Backend: [Part 24](../../../flowforge-api/flowforge-api/docs/backend/24-HTTP-REQUEST-AND-CUSTOM-API.md) (outbound slice).

## Scope

HTTP connections on the Integrations page (create, test, edit, replace credentials, disconnect); the `http.request` node form; response data in the reference picker; HTTP step results in run detail. Egress-guard errors explained.

## Functional Requirements

### HTTP connections (ADMIN; MEMBER read-only)

| ID | Requirement |
| --- | --- |
| FR-18.1 | An **HTTP** provider card (`connectionType: CREDENTIALS`, Part 16) lists the workspace's HTTP connections: name, auth type, secret hint ("…a1b2"), base URL, allowed hosts, status, created by, last used. Several connections allowed. |
| FR-18.2 | **New connection** dialog: name (1–100), optional base URL (relative URLs in steps resolve against it), optional allowed hosts (credentials are only sent to these hosts; defaults to the base URL's host — say so), and an auth type: *None*, *Bearer token*, *Basic (username + password)*, *API key in a header* (header name + value), *API key in the query string* (parameter name + value), *Custom headers* (up to N name → secret value pairs). Secret inputs are password fields. |
| FR-18.3 | **Test connection** (`POST …/integrations/:id/test { url, method: GET\|HEAD }`): URL absolute or relative to the base URL; shows only the outcome — OK + status + duration, or the category and message (auth rejected, not found, rate limited, blocked by egress policy, timeout, TLS/DNS error). Never shows the response body or headers (the backend does not return them). |
| FR-18.4 | **Edit** (`PATCH`): name, base URL, allowed hosts. **Replace credentials** (`PUT …/credentials`): write-only dialog; the current secret is never shown, only its hint. |
| FR-18.5 | Disconnect with the Part 10 warning listing workflows whose `http.request`/`http.poll` nodes use the connection. |
| FR-18.6 | Secret handling as Part 10's API-key rules: plaintext only in the open dialog; cleared on success, cancel and close; not kept in the mutation cache, URL, storage, logs or toasts. |

### `http.request` action

| ID | Requirement |
| --- | --- |
| FR-18.7 | Form fields: **connection** (optional; picker of HTTP connections + "Create connection" that returns to the node), **method** (GET, POST, PUT, PATCH, DELETE, HEAD), **URL** (template input; absolute, or relative when a connection with a base URL is chosen), **query** and **headers** (key/value editors with template values, max 50 each), **body** (*None*, *JSON* editor with templates and syntax check, *Text*, *Form fields*) — disabled for GET/HEAD with the reason, **timeout** (1–30 s, default 10 s). |
| FR-18.8 | Advanced (collapsed): *Follow redirects* (default on), *Response type* (Auto / JSON / Text), *Fail the step on 4xx* (default on; off → the 4xx response becomes the step output for a condition to inspect), *The API de-duplicates retries* (POST/PATCH only; explains that FlowForge then sends a stable `Idempotency-Key` and may retry automatically; otherwise a failed POST is not retried and may be reported as an uncertain outcome), *Large responses* (truncate / fail). |
| FR-18.9 | Headers that carry credentials (Authorization, Cookie, API-key-like names) typed by hand show a warning to use a connection instead; the step never offers to store a secret inline. |
| FR-18.10 | Static URLs are checked as the user types for obvious problems (not https, IP literal, `localhost`) with the egress-policy wording; the server's validation issues (e.g. "URL must be a valid absolute URL", blocked destination) are shown on the URL field. |
| FR-18.11 | Reference catalogue: `steps.<key>.output.status`, `.statusText`, `.headers.<name>`, `.body` (free-form; dot paths allowed below it), `.bodyTruncated`, `.durationMs`, `.finalUrl`. The suggester offers `status` and `body.` first. |
| FR-18.12 | Run detail for an HTTP step: method + final URL (query values with secret-like names masked), status with colour **and** text, duration, response headers, body viewer (JSON tree / text) with the truncated badge; errors show the category (egress blocked, timeout, 4xx/5xx, rate limited with the Retry-After honoured, uncertain outcome for non-idempotent writes). |

## Backend Endpoints

`GET /integrations/providers`, `GET …/integrations`, `POST …/integrations/http`, `POST …/integrations/:connectionId/test`, `PATCH …/integrations/:connectionId`, `PUT …/integrations/:connectionId/credentials`, `DELETE …/integrations/:connectionId`; draft/validate/publish; run steps.

## Security Requirements

Secrets never leave the dialog except in the request body; the test endpoint returns outcome only. Masks query parameters named like secrets (`key`, `token`, `api_key`, `signature`, …) in run detail, matching the backend's redaction list.

## Testing Requirements

Component (MSW): each auth type's form ↔ payload, test outcomes for every category, edit, replace credentials, secret absent from storage/URL/query cache after success/cancel/error, MEMBER read-only. Node form: body disabled for GET/HEAD, templates in URL/headers/body, idempotent toggle only for POST/PATCH, server issues on fields. Run detail: success, 4xx as output, egress-blocked error, truncated body.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-18.1 | An admin creates, tests, edits and replaces the credentials of an HTTP connection for every auth type; secrets never reappear | Component tests + QA |
| AC-18.2 | A workflow with `http.request` → condition on `status` → action is built entirely in the UI, published and run against a real public API | QA against the real backend |
| AC-18.3 | Response fields appear in `{{ }}` suggestions for later steps | Component test |
| AC-18.4 | After success, cancel or error, no credential is in storage, the URL or the query cache | Component test + browser storage check |
| AC-18.5 | Run detail shows status, duration, headers and body (or the categorised error) for HTTP steps | Component test + QA |

## Dependencies

Parts 16, 06, 08, 10.

## Risks / Design Questions

- JSON body editor: a light textarea with validation + template highlighting (no heavy editor dependency) — confirm.
- The allowed-hosts default (base URL host) must be stated in the dialog so users understand why another host gets no credentials.
