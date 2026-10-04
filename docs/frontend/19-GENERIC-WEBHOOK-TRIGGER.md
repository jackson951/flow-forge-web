# 19 — Generic Webhook Trigger

**Status:** NOT STARTED — awaiting product-owner approval of this spec. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Let any system start a workflow by calling a URL: configure how deliveries are verified and filtered, get the URL and secret safely, test it before publishing, and see every delivery with its outcome. Backend: [Part 24](../../../flowforge-api/flowforge-api/docs/backend/24-HTTP-REQUEST-AND-CUSTOM-API.md) (`webhook.received`).

## Scope

`webhook.received` node form; the workflow's **Webhook** panel (URL, secret shown once, rotation with grace, test capture, delivery log, replay); webhook runs in history.

## Functional Requirements

### Node form

| ID | Requirement |
| --- | --- |
| FR-19.1 | **Verification** (required choice, recommended first): *Shared secret* (`token`: in a header — header name — or as `Authorization: Bearer`), *HMAC signature* (algorithm sha256/sha1/sha512, encoding hex/base64, signature header, optional prefix such as `sha256=`, optional timestamp header with tolerance 30–3600 s and the signed-payload format `{timestamp}.{body}` or `v0:{timestamp}:{body}` — presets **GitHub-style**, **Slack-style**, **Stripe-style** fill these), *Basic auth*, *None* (requires ticking "Anyone with the URL can start this workflow"). |
| FR-19.2 | **Methods** (POST default; GET/PUT/PATCH/DELETE optional), **IP allow list** (IPs/CIDRs, validated), **filters** (deliveries that don't match are stored as *Ignored* and start no run), **deduplication** (*none*, *header* name, or *body* dot path such as `event.id`), **response** (status 200/202/204, optional small static JSON body), **GET validation challenge** (query parameter echoed back, for providers that verify the URL), **extra headers to keep** in the trigger output (credentials/signatures are always dropped — say so), **rate limit per minute** (1–600, default 120). |
| FR-19.3 | Reference catalogue: `trigger.method`, `trigger.headers.<name>`, `trigger.query.<name>`, `trigger.body` (free-form, dot paths below), `trigger.contentType`, `trigger.receivedAt`. When a test capture exists (FR-19.7), its body keys are offered as suggestions. |

### Webhook panel (workflow page)

| ID | Requirement |
| --- | --- |
| FR-19.4 | Shows the endpoint state from `GET …/workflows/:id/webhook`: provisioned or not ("Publish to create the URL" / "Use Listen to test before publishing"), active, verification mode, **URL** with copy button, secret hint. |
| FR-19.5 | A newly generated secret is shown **once** to an admin, in a reveal-and-copy box with "I've stored it" to dismiss; afterwards only the hint. It is never cached by the query layer or written to storage. |
| FR-19.6 | **Rotate secret** and **Rotate URL** (ADMIN) with confirmation explaining that the old one keeps working for the grace period (showing until when, from `previousSecretExpiresAt` / `previousUrlExpiresAt`); the new secret follows FR-19.5. |
| FR-19.7 | **Listen for a test delivery** (`POST …/listen`, unpublished workflows): shows the URL to call and a 10-minute countdown, polls `GET …/listen`, and shows the captured request (method, kept headers, query, body) once it arrives — usable to pick fields for mapping. Cancel/expiry handled. |
| FR-19.8 | **Delivery log** (`GET …/deliveries`, newest first, Load more): received time, status (*Received* / *Processed* / *Ignored* / *Failed* / *Rejected*) with icon + text, reason (e.g. "signature mismatch", "filter did not match"). A duplicate delivery is answered by the backend without a new row, so the log notes that repeats of the same delivery id are not listed twice, size, source IP, link to the run. Filter by status. No payload secrets shown. |
| FR-19.9 | **Replay** (ADMIN) on a stored delivery: confirmation that it starts a **new** run from the stored request (not a duplicate); then links the new run. |
| FR-19.10 | Webhook-started runs show the `WEBHOOK` badge and, in run detail, the delivery (method, kept headers, body). |

## Backend Endpoints

`GET …/workflows/:workflowId/webhook`, `POST …/rotate-secret`, `POST …/rotate-url`, `GET …/deliveries`, `POST …/deliveries/:deliveryId/replay`, `POST …/listen`, `GET …/listen`; draft/validate/publish. Public intake `…/webhooks/hooks/:hookId` is never called by the app.

## Security Requirements

Secret shown once and held only in component state; copy uses the clipboard API without logging. The URL itself is a credential-like value for *None* mode — the panel labels it as such and the log never prints it in full outside the copy box.

## Testing Requirements

Component (MSW): every verification mode and preset ↔ config, *None* requires the acknowledgement, filters/dedup/response/challenge fields, server issues on fields. Panel: not provisioned, provisioned, secret-once flow (absent after dismiss and reload), rotate with grace text, listen countdown → captured delivery → expiry, delivery log statuses and Load more, replay. MEMBER read-only.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-19.1 | A user configures a verified webhook, tests it with Listen before publishing, publishes, and a real `curl` delivery starts a run | QA against the real backend |
| AC-19.2 | The secret is visible once only and never stored client-side | Component test + browser storage check |
| AC-19.3 | Rotation states the grace period; old and new both work during it | QA |
| AC-19.4 | Every stored delivery outcome (received, processed, ignored, failed, rejected) is visible with its reason; replay starts a new run | Component tests + QA |
| AC-19.5 | Captured test-delivery fields can be picked in later steps' mappings | Component test |

## Dependencies

Parts 16, 06–08.

## Risks / Design Questions

- Listen polling interval (proposal: 2 s, stop on capture/expiry/unmount).
- Presets must match the backend's HMAC options exactly; anything else stays custom.
