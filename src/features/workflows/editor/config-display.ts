export interface ConfigDisplayEntry {
  path: string;
  label: string;
  value: string;
  template: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  connectionId: 'Connection ID',
  siteId: 'Jira site',
  projectKey: 'Project',
  projectKeys: 'Projects',
  issueType: 'Issue type',
  issueTypes: 'Issue types',
  issueKey: 'Issue key',
  channelId: 'Channel',
  listId: 'To Do list',
  labelId: 'Label',
  messageId: 'Message ID',
  includeSentByMe: 'Include sent mail',
  subjectContains: 'Subject contains',
  maxResults: 'Maximum results',
  maxWords: 'Maximum words',
  replyAll: 'Reply all',
  allowBroadcastMentions: 'Allow broadcast mentions',
};

const IMPORTANT_FIELDS: Record<string, string[]> = {
  'github.issue.created': ['repository'],
  'slack.sendMessage': ['channelId', 'text'],
  'microsoft.todo.createTask': ['listId', 'title', 'dueDate'],
  'schedule.trigger': ['kind', 'time', 'timezone', 'weekdays', 'dayOfMonth'],
  'webhook.received': ['methods', 'verification.type', 'deduplication.type'],
  'http.poll': ['url', 'method', 'schedule.kind', 'itemsPath', 'idPath'],
  'http.request': ['method', 'url', 'bodyType'],
  'jira.issue.created': ['projectKeys', 'issueTypes'],
  'jira.issue.updated': ['projectKeys', 'issueTypes'],
  'jira.issue.transitioned': ['projectKeys', 'fromStatus', 'toStatus'],
  'jira.createIssue': ['projectKey', 'issueType', 'summary'],
  'jira.updateIssue': ['issueKey', 'summary', 'toStatus'],
  'jira.getIssue': ['issueKey', 'fields'],
  'jira.addComment': ['issueKey', 'text'],
  'jira.transitionIssue': ['issueKey', 'toStatus', 'transitionId'],
  'jira.assignIssue': ['issueKey', 'assigneeAccountId'],
  'jira.searchIssues': ['jql', 'maxResults'],
  'gmail.email.received': ['filter.from', 'filter.subjectContains', 'includeSentByMe'],
  'gmail.email.labelReceived': ['labelId', 'filter.from', 'filter.subjectContains'],
  'gmail.sendEmail': ['to', 'subject', 'text'],
  'gmail.replyToEmail': ['messageId', 'replyAll', 'text'],
  'gmail.getEmail': ['messageId'],
  'gmail.addLabel': ['messageId', 'labelId'],
  'gmail.removeLabel': ['messageId', 'labelId'],
  'gmail.markAsRead': ['messageId'],
  'gmail.markAsUnread': ['messageId'],
  'ai.summarize': ['text', 'maxWords'],
  'ai.classify': ['text', 'labels', 'field'],
  'ai.extract': ['text', 'fields'],
  'util.log': ['message'],
};

export function configDisplayEntries(config: Record<string, unknown>): ConfigDisplayEntry[] {
  const entries: ConfigDisplayEntry[] = [];
  flatten(config, '', entries, 0);
  return entries;
}

export function configHighlights(
  type: string,
  config: Record<string, unknown>,
  limit = 3,
): ConfigDisplayEntry[] {
  const entries = configDisplayEntries(config);
  const priorities = IMPORTANT_FIELDS[type] ?? [];
  return [...entries]
    .sort((a, b) => {
      const ai = priorities.indexOf(a.path);
      const bi = priorities.indexOf(b.path);
      const ar = ai < 0 ? Number.MAX_SAFE_INTEGER : ai;
      const br = bi < 0 ? Number.MAX_SAFE_INTEGER : bi;
      if (ar !== br) return ar - br;
      // A connection proves setup but is rarely the most useful canvas summary.
      if (a.path === 'connectionId') return 1;
      if (b.path === 'connectionId') return -1;
      return a.path.localeCompare(b.path);
    })
    .slice(0, limit);
}

export function compactConfigValue(value: string, max = 48): string {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return singleLine.length > max ? `${singleLine.slice(0, max - 1)}…` : singleLine;
}

function flatten(
  value: Record<string, unknown>,
  parent: string,
  entries: ConfigDisplayEntry[],
  depth: number,
) {
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === '') continue;
    const path = parent ? `${parent}.${key}` : key;
    if (isPlainObject(item) && !('ref' in item) && depth < 3) {
      flatten(item, path, entries, depth + 1);
      continue;
    }
    const formatted = formatValue(item);
    entries.push({
      path,
      label: labelForPath(path),
      value: formatted,
      template: formatted.includes('{{'),
    });
  }
}

function formatValue(value: unknown): string {
  if (value === null) return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    if (!value.length) return 'None';
    return value
      .map((item) =>
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
          ? String(item)
          : JSON.stringify(item),
      )
      .join(', ');
  }
  if (isPlainObject(value) && typeof value.ref === 'string') return `{{ ${value.ref} }}`;
  return JSON.stringify(value);
}

function labelForPath(path: string): string {
  return path
    .split('.')
    .map((part) => FIELD_LABELS[part] ?? humanize(part))
    .join(' · ');
}

function humanize(value: string): string {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
