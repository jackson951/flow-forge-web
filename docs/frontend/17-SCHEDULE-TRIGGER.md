# 17 — Schedule Trigger

**Status:** NOT STARTED — awaiting product-owner approval of this spec. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Let a user make a workflow run on a schedule — "every weekday at 07:00 Johannesburg time" — without knowing cron, see when it will run next, and understand what happened to scheduled runs. Backend: [Part 23](../../../flowforge-api/flowforge-api/docs/backend/23-SCHEDULE-TRIGGER.md).

## Scope

`schedule.trigger` configuration form, next-occurrence preview, the workflow page's schedule summary, scheduled runs in history, and the archive/unarchive/new-version effects explained in the UI. The same schedule picker is reused by `http.poll` (Part 20).

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-17.1 | **Schedule picker** with the seven backend kinds, friendly first: *Every N minutes* (`interval`, N from the allowed list 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60, 120, 180, 240, 360, 480, 720, 1440 — values below the server minimum, default 5, are hidden or disabled with the reason), *Hourly at minute*, *Daily at*, *Weekdays at*, *Weekly on days at* (ISO days Mon–Sun, multi-select, no repeats), *Monthly on day* (1–31 or *last day*) *at*, and *Custom cron* (5 fields) as the advanced option. Times are 24-hour `HH:mm`. |
| FR-17.2 | **Timezone** is required and explicit: searchable IANA list, defaulting to the browser's timezone, showing the current UTC offset (e.g. "Africa/Johannesburg (UTC+02:00)"). Never a raw offset. |
| FR-17.3 | **Preview**: plain-language summary ("Every weekday at 07:00, Africa/Johannesburg") and the next 5 occurrences in the chosen timezone *and* the viewer's local time when they differ. Computed client-side with the same cron library family as the backend (croner) for display only; the backend's draft validation remains the authority and its issues are shown on the fields. |
| FR-17.4 | DST notes when the preview crosses a transition: a time that does not exist runs once, shifted forward; a time that occurs twice runs once (wording mirrors backend Part 23). |
| FR-17.5 | Monthly on day 29–31 explains months without that day are skipped; *last day* is offered as the alternative. |
| FR-17.6 | Validation from `PUT …/draft` / `validate` issues is mapped to the picker's fields (e.g. "everyMinutes must divide the hour or the day", minimum gap, invalid cron). |
| FR-17.7 | **Workflow page schedule summary** (from `workflow.schedule`): status (Active / Stopped), description, timezone, **next run** (relative + absolute), **last occurrence** with a link to its run (`lastRunId`). Shown for published workflows whose active version has a schedule; a draft-only schedule shows "Publish to start the schedule". |
| FR-17.8 | Lifecycle explained where it happens: publishing a new version replaces the schedule; archiving stops it; unarchiving resumes **from now without catching up** missed occurrences; a manual run ("Run now") does not affect the schedule. |
| FR-17.9 | Scheduled runs show the `SCHEDULE` badge (Part 16) and, in run detail, the trigger data: *scheduled for*, *triggered at*, timezone and lag ("started 22 s after its scheduled time"). |
| FR-17.10 | Reference catalogue entries: `trigger.scheduledFor`, `trigger.triggeredAt`, `trigger.timezone`, `trigger.scheduleId`, `trigger.triggerType`. |

## Backend Endpoints

Draft save/validate/publish (existing); `GET …/workflows/:id` (`schedule` summary); runs list/detail (existing). No schedule-specific endpoint.

## Security Requirements

None beyond existing (ADMIN publishes; MEMBER sees the summary read-only).

## Testing Requirements

Unit: picker state ↔ backend config for every kind (round trip), preview against fixed instants incl. a DST change in a zone that has one (e.g. America/New_York), monthly 31 and *last*. Component: field-level server issues, summary states (active, stopped, draft-only, never run), run detail lag.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-17.1 | Every schedule kind can be configured, saved, reloaded and published without seeing cron | Component tests + QA |
| AC-17.2 | The preview shows the next occurrences in the schedule's timezone and the viewer's, with DST notes | Unit tests |
| AC-17.3 | Server validation issues appear on the right picker field | Component test |
| AC-17.4 | A published scheduled workflow shows its next run and links its last scheduled run | QA against the real backend and worker |
| AC-17.5 | Archive / unarchive / new version messages match backend behaviour | Component test + QA |

## Dependencies

Part 16; Parts 06–08.

## Risks / Design Questions

- Client-side preview could disagree with the server in edge cases; the preview is labelled "preview" and the saved workflow's `nextRunAt` is the truth after publishing.
- Bundle size of a timezone list: use `Intl.supportedValuesOf('timeZone')` (no data file).
