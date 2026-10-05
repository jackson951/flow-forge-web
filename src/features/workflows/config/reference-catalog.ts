/**
 * What each node type outputs, for `{{ }}` suggestions and reference checks (Part 16,
 * FR-16.9). Triggers describe the run's trigger data (`trigger.<path>`); actions and
 * conditions describe `steps.<key>.output.<path>`, optionally depending on the step's config.
 * Parts 17–22 register their node types here.
 */

export interface OutputField {
  path: string;
  description: string;
}

interface CatalogEntry {
  /** Trigger nodes: fields of the trigger data. */
  trigger?: OutputField[];
  /** Action / condition nodes: fields of the step output (may depend on its config). */
  output?: (config: Record<string, unknown>) => OutputField[];
}

const CATALOG = new Map<string, CatalogEntry>();

export function registerOutputs(type: string, entry: CatalogEntry) {
  CATALOG.set(type, entry);
}

/** Known trigger fields; none for unknown triggers (any path is then accepted). */
export function triggerFields(type: string): OutputField[] {
  return CATALOG.get(type)?.trigger ?? [];
}

/** Known output fields, or null when the shape is unknown (any path is accepted). */
export function outputFields(type: string, config: Record<string, unknown>): OutputField[] | null {
  const output = CATALOG.get(type)?.output;
  return output ? output(config) : null;
}

// ── Part 17: schedule trigger (system-built trigger data, never user input) ─────

registerOutputs('schedule.trigger', {
  trigger: [
    { path: 'scheduledFor', description: 'The occurrence this run is for (ISO 8601)' },
    { path: 'triggeredAt', description: 'When the scheduler started it (ISO 8601)' },
    { path: 'timezone', description: 'The schedule’s timezone' },
    { path: 'scheduleId', description: 'Id of the schedule' },
    { path: 'triggerType', description: '"SCHEDULE"' },
  ],
});

// ── Part 18: HTTP request (the body's shape depends on the API: any path below it) ─

registerOutputs('http.request', {
  output: () => [
    { path: 'status', description: 'HTTP status code, e.g. 200' },
    { path: 'body', description: 'Response body (parsed JSON or text); use body.<field>' },
    { path: 'statusText', description: 'Status text, e.g. OK' },
    { path: 'headers', description: 'Response headers; use headers.<name>' },
    { path: 'bodyTruncated', description: 'true when the body was cut to fit' },
    { path: 'durationMs', description: 'How long the request took' },
    { path: 'finalUrl', description: 'URL after redirects' },
  ],
});

// ── Part 19: generic webhook (the body's shape is the sender's) ──────────────────

registerOutputs('webhook.received', {
  trigger: [
    { path: 'body', description: 'Request body (JSON, form or text); use body.<field>' },
    { path: 'method', description: 'HTTP method, e.g. POST' },
    { path: 'headers', description: 'Kept headers (no credentials); use headers.<name>' },
    { path: 'query', description: 'Query string values; use query.<name>' },
    { path: 'contentType', description: 'Content-Type of the request' },
    { path: 'receivedAt', description: 'When it arrived (ISO 8601)' },
  ],
});

// ── Part 20: HTTP poll (one run per new item; the item's shape is the API's) ───

registerOutputs('http.poll', {
  trigger: [
    { path: 'item', description: 'The new item from the response; use item.<field>' },
    { path: 'itemId', description: 'Its id (or content hash)' },
    { path: 'polledAt', description: 'When the poll ran (ISO 8601)' },
    { path: 'scheduleId', description: 'Id of the poll schedule' },
    { path: 'triggerType', description: '"POLL"' },
  ],
});

// ── Node types of Parts 01–15 ────────────────────────────────────────────────

// Part 21: Jira normalized issue and event contract.
const jiraIssueFields: OutputField[] = [
  { path: 'id', description: 'Jira issue id' },
  { path: 'key', description: 'Issue key, e.g. ENG-123' },
  { path: 'summary', description: 'Issue summary' },
  { path: 'description', description: 'Plain-text issue description' },
  { path: 'status', description: 'Current status name' },
  { path: 'statusCategory', description: 'Status category' },
  { path: 'type', description: 'Issue type' },
  { path: 'priority', description: 'Priority name' },
  { path: 'project.key', description: 'Project key' },
  { path: 'project.name', description: 'Project name' },
  { path: 'assignee.accountId', description: 'Assignee account id' },
  { path: 'assignee.displayName', description: 'Assignee name' },
  { path: 'reporter.accountId', description: 'Reporter account id' },
  { path: 'reporter.displayName', description: 'Reporter name' },
  { path: 'labels', description: 'Issue labels (list)' },
  { path: 'url', description: 'Link to the issue on its Jira site' },
  { path: 'created', description: 'When the issue was created' },
  { path: 'updated', description: 'When the issue was updated' },
];
const jiraTriggerFields: OutputField[] = [
  { path: 'event', description: 'Jira event type' },
  ...jiraIssueFields.map((field) => ({ ...field, path: `issue.${field.path}` })),
  { path: 'changes', description: 'Changed fields (list)' },
  { path: 'changes[].field', description: 'Changed field name' },
  { path: 'changes[].from', description: 'Value before the change' },
  { path: 'changes[].to', description: 'Value after the change' },
  { path: 'transition.from', description: 'Previous status' },
  { path: 'transition.to', description: 'New status' },
  { path: 'actor.accountId', description: 'Actor account id' },
  { path: 'actor.displayName', description: 'Actor name' },
  { path: 'site.cloudId', description: 'Jira site cloud id' },
];
for (const type of ['jira.issue.created', 'jira.issue.updated', 'jira.issue.transitioned'])
  registerOutputs(type, { trigger: jiraTriggerFields });
for (const type of ['jira.createIssue', 'jira.updateIssue', 'jira.getIssue'])
  registerOutputs(type, { output: () => jiraIssueFields });
registerOutputs('jira.addComment', {
  output: () => [
    { path: 'issueKey', description: 'Issue key' },
    { path: 'commentId', description: 'Created comment id' },
    { path: 'created', description: 'When the comment was created' },
  ],
});
registerOutputs('jira.transitionIssue', {
  output: () => [
    { path: 'issueKey', description: 'Issue key' },
    { path: 'transitionId', description: 'Applied transition id' },
    { path: 'toStatus', description: 'New status' },
  ],
});
registerOutputs('jira.assignIssue', {
  output: () => [
    { path: 'issueKey', description: 'Issue key' },
    { path: 'assigneeAccountId', description: 'New assignee or null' },
  ],
});
registerOutputs('jira.searchIssues', {
  output: () => [
    { path: 'issues', description: 'Matching normalized issues' },
    { path: 'issues[].key', description: 'Issue key' },
    { path: 'issues[].summary', description: 'Issue summary' },
    { path: 'issues[].status', description: 'Issue status' },
    { path: 'issues[].url', description: 'Link to the issue' },
    { path: 'count', description: 'Number of returned issues' },
    { path: 'hasMore', description: 'Whether Jira has more matches' },
  ],
});

registerOutputs('github.issue.created', {
  trigger: [
    { path: 'issue.number', description: 'Issue number' },
    { path: 'issue.title', description: 'Issue title' },
    { path: 'issue.body', description: 'Issue text' },
    { path: 'issue.url', description: 'Link to the issue' },
    { path: 'issue.state', description: 'open / closed' },
    { path: 'issue.createdAt', description: 'When it was opened (ISO 8601)' },
    { path: 'issue.labels', description: 'Label names (list)' },
    { path: 'issue.author.login', description: 'Who opened it' },
    { path: 'repository.fullName', description: 'owner/name' },
    { path: 'repository.private', description: 'true for private repositories' },
    { path: 'sender.login', description: 'Who triggered the event' },
  ],
});
// Manual runs: whatever JSON the run is started with — no fixed fields.
registerOutputs('manual.trigger', { trigger: [] });
registerOutputs('util.log', {
  output: () => [{ path: 'message', description: 'The logged message' }],
});
registerOutputs('condition', {
  output: () => [{ path: 'result', description: 'true or false' }],
});
registerOutputs('slack.sendMessage', {
  output: () => [
    { path: 'ts', description: 'Message timestamp (its id in Slack)' },
    { path: 'channelId', description: 'Channel it was posted to' },
  ],
});
registerOutputs('microsoft.todo.createTask', {
  output: () => [
    { path: 'taskId', description: 'Id of the new task' },
    { path: 'listId', description: 'List it was added to' },
  ],
});
registerOutputs('ai.summarize', {
  output: () => [{ path: 'summary', description: 'The summary' }],
});
registerOutputs('ai.classify', {
  output: () => [
    { path: 'label', description: 'The chosen label' },
    { path: 'confidence', description: 'Model confidence 0–1, when given' },
  ],
});
// ai.extract's outputs are the fields it is configured to extract.
registerOutputs('ai.extract', {
  output: (config) => {
    const fields = Array.isArray(config.fields) ? config.fields : [];
    return fields
      .filter(
        (f): f is { name: string; description?: string } => typeof f?.name === 'string' && !!f.name,
      )
      .map((f) => ({ path: f.name, description: f.description || 'Extracted field' }));
  },
});
