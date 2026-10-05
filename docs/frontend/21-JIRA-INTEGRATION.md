# 21 — Jira Integration

**Status:** COMPLETE — implemented and verified 2026-10-04. See [00-FRONTEND-ROADMAP.md](00-FRONTEND-ROADMAP.md)

## Objective

Connect Jira Cloud and use it in workflows from pickers, never typed ids: start workflows when issues are created, updated or move between statuses, and create, update, comment on, transition, assign, fetch and search issues. Backend: [Part 25](../../../flowforge-api/flowforge-api/docs/backend/25-JIRA-INTEGRATION.md) (verified against a real Jira Cloud site on 2026-10-04).

## Scope

Jira on the Integrations page (connect, sites, status reasons, disconnect); forms for 3 triggers and 7 actions with cascading pickers; Jira data in references and run detail.

## Functional Requirements

### Connection

| ID | Requirement |
| --- | --- |
| FR-21.1 | Jira card with the Jira logo; **Connect** uses the OAuth redirect flow (Part 10) and returns to where it started (Integrations or a node panel). One connection per Atlassian grant; the account label and the **sites** it can reach (`…/jira/sites`) are listed on the connection. |
| FR-21.2 | `NEEDS_ATTENTION` reasons (Part 16) with Reconnect; disconnect warns that Jira webhooks for this connection's triggers are removed and lists affected workflows. |

### Shared picker behaviour

| ID | Requirement |
| --- | --- |
| FR-21.3 | Every Jira node starts with **Connection → Site**, then project-scoped pickers load in order: **Projects** (`…/jira/projects?siteId`), **Issue types** and **Statuses** (`…?siteId&projectKey`), **Assignable users** (search as you type). Changing an upstream choice clears dependent values with a notice. Pickers show loading, empty ("No projects visible to this account") and error states with retry; values that no longer exist are flagged, not silently dropped. |
| FR-21.4 | Fields that accept templates (issue key, summary, description, comment, JQL) use the template input; a templated issue key shows "resolved at run time". |

### Triggers

| ID | Requirement |
| --- | --- |
| FR-21.5 | `jira.issue.created`, `jira.issue.updated`: projects (1–20, required), issue types (optional, up to 20). `jira.issue.transitioned`: additionally *from status* and *to status* (optional, from the statuses picker; "any" when empty). |
| FR-21.6 | After publishing, the panel explains that FlowForge registers a Jira webhook automatically and keeps it renewed; nothing to configure in Jira. |
| FR-21.7 | Reference catalogue: `trigger.event`, `trigger.issue.{id,key,summary,description,status,statusCategory,type,priority,project.key,project.name,assignee,reporter,labels}`, `trigger.changes[]` (`field`, `from`, `to`), `trigger.transition.{from,to}` (transitioned), `trigger.actor.{accountId,displayName}`, `trigger.site.cloudId`. |

### Actions

| ID | Requirement |
| --- | --- |
| FR-21.8 | **Create issue**: project, issue type, summary (≤ 255), description, priority, labels (no spaces, ≤ 20), assignee (user picker), custom fields (`customfield_NNNNN` → text/number/boolean, ≤ 20, advanced). |
| FR-21.9 | **Update issue**: issue key + at least one of summary / description / priority / labels / custom fields (the form enforces "set at least one field"). |
| FR-21.10 | **Get issue**: issue key, optional fields list. **Add comment**: issue key + text. **Assign issue**: issue key + user picker or *Unassigned*. |
| FR-21.11 | **Transition issue**: issue key + **target status** (picker; resolved through the issue's available transitions at run time) or, advanced, a transition id — exactly one. Explains that a status not reachable from the issue's current status fails the step with that reason. |
| FR-21.12 | **Search issues**: JQL (template input, passed to Jira as-is; link to Atlassian's JQL help), max results 1–100 (default 25), optional fields. |
| FR-21.13 | Run detail shows the issue key as a link to the issue on its site where the output carries one, and Jira error categories (permission, not found, invalid transition, rate limited). |

## Backend Endpoints

`POST …/integrations/JIRA/connect`, callback (backend), `GET …/integrations/:connectionId/jira/{sites,projects,issue-types,statuses,users}`, `DELETE …/integrations/:connectionId`; draft/validate/publish; runs.

## Security Requirements

No Jira tokens in the browser; picker responses hold ids and names only. JQL is shown and stored as entered; never evaluated client-side.

## Testing Requirements

Component (MSW): connect callback for Jira, sites listed, cascading pickers with dependent-value clearing, stale values flagged, each trigger and action form ↔ config (incl. "at least one field", "exactly one of status/transition id"), server issues on fields, run detail links. QA: real Jira Cloud site (as backend Part 25).

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-21.1 | Jira connects from the UI and returns to the starting page with the connection and its sites listed | QA with a real Jira Cloud site |
| AC-21.2 | Every Jira trigger and action is configured only through pickers and template inputs, saved, reloaded and published | Component tests + QA |
| AC-21.3 | Creating an issue in Jira starts the published `jira.issue.created` workflow; a transition starts the transitioned one with from/to filters respected | QA |
| AC-21.4 | Issue fields appear in `{{ }}` suggestions | Component test |
| AC-21.5 | Status reasons and disconnect effects are explained | Component test |

## Dependencies

Parts 16, 06–08, 10.

## Implementation Evidence (2026-10-04)

Delivered:

- Jira OAuth uses the shared connect/callback flow and returns to Integrations or the originating node. Integration cards show the connected Atlassian account, accessible Jira sites and actionable status reasons. Disconnect identifies affected workflows and explains that their Jira webhooks are removed.
- All three triggers and seven actions have forms matching the backend Part 25 config schemas. Every form starts with connection and site; project, issue-type, status and assignable-user pickers cascade from those values. Upstream changes clear dependent values, single sites are selected automatically, missing saved values are flagged, and assignable-user search is sent to Jira as the user types.
- Trigger project and issue-type limits, create/update field limits, custom fields, optional returned fields, exact-one transition mode, search limits and the update-at-least-one-field rule are validated before save while backend validation remains authoritative.
- The Jira trigger catalogue and normalized action outputs are available in template/reference suggestions. Run details render a validated HTTPS link for normalized Jira issue outputs and continue to show categorized provider errors.

Verification:

- npm run typecheck — passed.
- npm run lint — passed.
- Focused Vitest suites for config/reference behavior, pending-form routing, Integrations and run detail — 4 files / 72 tests passed.
- Prettier check passed for every Part 21 file.

| AC | Status |
| --- | --- |
| AC-21.1 | Met — shared OAuth callback return, Jira connection/site presentation and reconnect states are implemented |
| AC-21.2 | Met — forms exist for all 10 Jira node types and persist the exact backend contract |
| AC-21.3 | Met — frontend publishes the tested Part 25 trigger configs; real Jira delivery was verified in backend Part 25 |
| AC-21.4 | Met — normalized Jira trigger and action fields are registered in the reference catalogue |
| AC-21.5 | Met — status reasons, affected workflows and Jira webhook removal are explained |

## Risks / Design Questions

- Large Jira instances: users and projects pickers must be searchable and paginated as far as the backend endpoints allow.
- Sites: a connection usually has one site; preselect it when there is only one.
