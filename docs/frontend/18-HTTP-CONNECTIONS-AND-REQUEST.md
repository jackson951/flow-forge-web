# 18 — HTTP Connections and the HTTP Request Action

**Status:** IN PROGRESS — implemented 2026-10-04, local gate green; awaiting product-owner QA. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

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

## As implemented

| Area | Implementation |
| --- | --- |
| API | `integrations.api.ts`: `createHttp` / `testHttp` / `updateHttp` / `rotateHttp` and hooks; mutations that carry secrets use `gcTime: 0` and are `reset()` on success, so neither the mutation cache nor the component keeps the plaintext |
| Integrations page | HTTP card (`connectionType: CREDENTIALS`): **New HTTP connection** opens the form; each connection row shows auth type, secret hint and base URL with **Test**, **Edit**, **Replace credentials** (secondary when the connection needs attention) and Disconnect (Part 10 warning). Members see the rows without actions |
| Create dialog | `components/http-connection-dialogs.tsx`, wide two-column layout (product-owner feedback: the first version was too tall): left — name, base URL, allowed hosts (prefilled with the base URL's host until edited); right — authentication. Five auth types as the backend defines them: bearer, basic, API key header, API key query, custom headers (1–10, unique names). Secrets are password inputs; server 422 `details` map to fields; a warning when allowed hosts are empty |
| Edit / replace / test | Edit: name, base URL, allowed hosts (`PATCH`, empty → `null`). Replace: write-only, shows only the current hint, keeps the auth type and header/param names. Test: GET/HEAD to an absolute or relative URL; shows only OK + status + duration or the failure category/message |
| `http.request` form | `components/http-request-form.tsx`: optional connection (the picker offers "No connection"; with none in the workspace, **New HTTP connection** opens the same dialog in place and selects the result), method, URL (template input, quick egress checks), query and headers (name → template value, up to 50, credential-header warning), body None/JSON (validated, templates inside strings, invalid JSON kept locally and not saved)/Text/Form — disabled for GET/HEAD and dropped when switching to them, timeout 1–30 s; Advanced: follow redirects, response type, fail on 4xx, idempotent (POST/PATCH only, dropped otherwise), large responses |
| References | `http.request` registered: `status`, `body` (free-form below), `statusText`, `headers`, `bodyTruncated`, `durationMs`, `finalUrl` |
| Run detail | `runs/components/http-step-result.tsx` above an HTTP step's input/output: status with icon and text, method + final URL with secret-looking query values masked (the backend's redaction list), duration, truncated badge, response headers (collapsible); the body stays in the Output view; errors keep the Part 08 category explanation |

## Implementation Evidence

Implemented 2026-10-04 on branch `feat/part-18-http-connections-and-request`. Browser criteria are left for the product owner's QA.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-18.1 | PASS (component) / QA | `integrations.test.tsx` "HTTP connections": create (hosts follow base URL, exact POST body), server field errors, test outcome, edit (`allowedHosts: null`), replace (`PUT { credentials }`), member read-only; `http-credentials.test.ts` covers all five auth types and their validation |
| AC-18.2 | QA | Needs the real backend: build `http.request` → condition on `status` → action, publish, run |
| AC-18.3 | PASS | `node-settings.test.tsx` "registers its output for later steps"; catalogue entries |
| AC-18.4 | PASS (component) / QA | Create test: the secret is absent from localStorage, sessionStorage, the URL and the DOM after saving; mutations use `gcTime: 0` + `reset()`. Browser storage/network inspection left for QA |
| AC-18.5 | PASS (component) / QA | `http-step-result.test.tsx`: status/URL masking/duration/headers/truncation; 4xx stated in text |

Deviations, recorded:

- **Five auth types, not six:** the backend has no "none" type — an API without authentication needs no connection (the step's connection is optional).
- **Allowed hosts do not default on the backend:** with none, credentials go to any host. The spec assumed a default; the form prefills the base URL's host and warns when the list is empty.
- **FR-18.7 "Create connection that returns to the node":** implemented as the same dialog opened inside the step's settings (no page change), which also selects the new connection.

Tests added: `http-credentials.test.ts` (3), `http-request-model.test.ts` (16), `http-step-result.test.tsx` (3), integrations +4, HTTP request form +5; Part 16 HTTP-card test updated.

Gate: `format:check` ✔, `lint` ✔, `typecheck` ✔, `test:cov` 40 files / **508 tests** ✔ (coverage thresholds met), `build` ✔, `check:bundle` ✔ — main chunk **194.4 KB** gzip of the 200 KB budget. Before Part 19 adds more, the Integrations page and dialogs should move to a lazy route chunk.
