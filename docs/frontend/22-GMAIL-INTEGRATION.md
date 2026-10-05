# 22 — Gmail Integration

**Status:** COMPLETE — implemented and verified 2026-10-05. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Connect Gmail mailboxes and use them in workflows: start a workflow when an email arrives (or gets a label), and send, reply, read and organise mail — while making it obvious what FlowForge can see and that email content is handled minimally. Backend: [Part 26](../../../flowforge-api/flowforge-api/docs/backend/26-GMAIL-INTEGRATION.md) (verified against a real mailbox on 2026-10-04).

## Scope

Gmail on the Integrations page (connect, scopes explained, watch health, disconnect); forms for 2 triggers and 7 actions; email data in references and run detail with privacy-conscious display.

## Functional Requirements

### Connection

| ID | Requirement |
| --- | --- |
| FR-22.1 | Gmail card with the Gmail logo; **Connect** via the OAuth redirect flow, returning to the origin. Several mailboxes per workspace; each shows its address (account label) and status. |
| FR-22.2 | Before connecting, a short **what FlowForge can access** note: read and modify mail (labels, read state) and send mail; only the fields needed by your workflows are kept in run data; attachment contents are never fetched; run data is trimmed by retention. Google's "unverified app" screen in testing mode is mentioned for self-hosted setups. |
| FR-22.3 | `NEEDS_ATTENTION` reasons, notably `WATCH_RENEWAL_FAILED` ("Gmail stopped sending notifications") with Reconnect; disconnect warns that the mailbox watch stops and lists affected workflows. |
| FR-22.4 | If the server lacks the Pub/Sub settings, the Gmail **triggers** are disabled in the palette with the backend's `unavailableReason`, while actions stay available (Part 16). |

### Triggers

| ID | Requirement |
| --- | --- |
| FR-22.5 | **New email** (`gmail.email.received`, INBOX) and **Email gets a label** (`gmail.email.labelReceived`, label picker from `…/gmail/labels`, system and user labels with icons). Both: connection, *include emails sent by this mailbox* (default off — explained: avoids loops when a workflow sends mail), filters *from* and *subject contains*. |
| FR-22.6 | After publishing, the panel explains that FlowForge watches the mailbox through Google push notifications and renews the watch automatically. |
| FR-22.7 | Reference catalogue (minimised email): `trigger.event`, `trigger.messageId`, `trigger.threadId`, `trigger.labelIds`, `trigger.from`, `trigger.to`, `trigger.cc`, `trigger.replyTo`, `trigger.subject`, `trigger.snippet`, `trigger.date`, `trigger.textBody` (plain text, capped), `trigger.textTruncated`, `trigger.hasAttachments`, `trigger.attachmentNames` (names only), `trigger.mailbox`. |

### Actions

| ID | Requirement |
| --- | --- |
| FR-22.8 | **Send email**: to (comma-separated, templates allowed, validated after rendering), cc, bcc, reply-to, subject (≤ 998), text body (required), optional HTML body. Shows the per-workspace **daily send cap** and that a failed send whose delivery is uncertain is not retried automatically (uncertain outcome). |
| FR-22.9 | **Reply to email**: message id (default suggestion `{{trigger.messageId}}`), text, optional HTML, *reply all* (the mailbox itself is never added). Explains the reply stays in the same thread. |
| FR-22.10 | **Get email**: message id → the minimised email (same fields as FR-22.7). |
| FR-22.11 | **Add label** / **Remove label**: message id + label picker. **Mark as read** / **Mark as unread**: message id. |
| FR-22.12 | Reference catalogue for actions: send/reply → `messageId`, `threadId` (+ `inReplyTo`); labels/read state → `messageId`, `labelIds`; get → FR-22.7 fields. |
| FR-22.13 | Run detail shows email data compactly (from, subject, snippet; body collapsed behind "Show body"), never renders HTML (plain text only), and labels the attachment list as names only. |

## Backend Endpoints

`POST …/integrations/GMAIL/connect`, callback (backend), `GET …/integrations/:connectionId/gmail/labels`, `DELETE …/integrations/:connectionId`; draft/validate/publish; runs.

## Security Requirements

No Google tokens in the browser. Email bodies are displayed as text only (no HTML rendering, no remote images). Email content is never sent to analytics, logs or toasts.

## Testing Requirements

Component (MSW): connect callback, access note, status reasons incl. watch failure, triggers disabled when unavailable, label picker states, each trigger and action form ↔ config, reply defaults, run detail body collapsed and HTML shown as text. QA: real mailbox (as backend Part 26) — email in → run; send/reply/label/read actions on the product owner's own address only.

Implementation verification (2026-10-05): client schemas and forms for both triggers and all seven actions, Gmail label API/picker, minimized references, access/watch/disconnect messaging, and privacy-safe run rendering are implemented. Typecheck and lint pass for the changed files; 550 frontend tests pass; the production build and bundle budget pass. The repository-wide format check still reports 12 pre-existing Part 20 files outside this part.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-22.1 | Gmail connects from the UI with the access note shown first, and the mailbox is listed | QA with a real mailbox |
| AC-22.2 | A published "New email" workflow runs for an incoming email; mail sent by the mailbox itself does not trigger it unless enabled | QA |
| AC-22.3 | All seven actions are configured through the form (label picker, reply defaults) and succeed against the real mailbox | QA |
| AC-22.4 | Email fields appear in `{{ }}` suggestions; run detail never renders HTML | Component tests |
| AC-22.5 | Triggers show the server's unavailable reason when Pub/Sub is not configured | Component test |

## Dependencies

Parts 16, 06–08, 10.

## Risks / Design Questions

- Daily send cap value: shown from a backend field if exposed; otherwise described generically ("a daily limit per workspace applies") — confirm whether to add it to `/node-types` or the provider list.
