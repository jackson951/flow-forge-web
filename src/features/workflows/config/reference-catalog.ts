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

// ── Node types of Parts 01–15 ────────────────────────────────────────────────

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
