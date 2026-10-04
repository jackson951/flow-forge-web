import type { NodeKind } from '@/types/api';

/**
 * Client-side descriptions of the backend's node types (flowforge-api node-type catalog).
 * Which types exist and whether the server can run them comes from GET /node-types (Part 05);
 * this adds the help text the API does not provide. Only real backend types are listed.
 */
export interface NodeCatalogEntry {
  type: string;
  label: string;
  kind: NodeKind;
  description: string;
}

export const NODE_CATALOG: NodeCatalogEntry[] = [
  {
    type: 'manual.trigger',
    label: 'Manual trigger',
    kind: 'TRIGGER',
    description: 'Starts when someone runs the workflow from FlowForge, with optional input.',
  },
  {
    type: 'github.issue.created',
    label: 'GitHub issue opened',
    kind: 'TRIGGER',
    description: 'Starts when an issue is opened in a repository of a connected GitHub App.',
  },
  {
    type: 'condition',
    label: 'Condition',
    kind: 'CONDITION',
    description: 'Continues down the true or false branch.',
  },
  {
    type: 'util.log',
    label: 'Log a message',
    kind: 'ACTION',
    description: 'Writes a message to the run history; useful for testing mappings.',
  },
  {
    type: 'slack.sendMessage',
    label: 'Send Slack message',
    kind: 'ACTION',
    description: 'Posts a message to a channel in a connected Slack workspace.',
  },
  {
    type: 'microsoft.todo.createTask',
    label: 'Create Microsoft To Do task',
    kind: 'ACTION',
    description: 'Adds a task to a To Do list of the connected Microsoft account.',
  },
  {
    type: 'ai.summarize',
    label: 'Summarize text',
    kind: 'ACTION',
    description: 'Condenses text into a short summary.',
  },
  {
    type: 'ai.classify',
    label: 'Classify text',
    kind: 'ACTION',
    description: 'Sorts text into one of the labels you set.',
  },
  {
    type: 'ai.extract',
    label: 'Extract fields',
    kind: 'ACTION',
    description: 'Pulls structured fields out of text.',
  },
  {
    type: 'schedule.trigger',
    label: 'Schedule',
    kind: 'TRIGGER',
    description: 'Starts on a schedule in a timezone you choose, e.g. every weekday at 07:00.',
  },
  {
    type: 'webhook.received',
    label: 'Webhook received',
    kind: 'TRIGGER',
    description: "Starts when another system calls this workflow's webhook URL.",
  },
  {
    type: 'http.poll',
    label: 'Poll an HTTP API',
    kind: 'TRIGGER',
    description: 'Checks an API on a schedule and starts one run per new item.',
  },
  {
    type: 'http.request',
    label: 'HTTP request',
    kind: 'ACTION',
    description: 'Calls an HTTPS API and passes the response to later steps.',
  },
  {
    type: 'jira.issue.created',
    label: 'Jira issue created',
    kind: 'TRIGGER',
    description: 'Starts when an issue is created in the chosen Jira projects.',
  },
  {
    type: 'jira.issue.updated',
    label: 'Jira issue updated',
    kind: 'TRIGGER',
    description: 'Starts when an issue in the chosen Jira projects changes.',
  },
  {
    type: 'jira.issue.transitioned',
    label: 'Jira issue moved',
    kind: 'TRIGGER',
    description: 'Starts when an issue moves between statuses.',
  },
  {
    type: 'jira.createIssue',
    label: 'Create Jira issue',
    kind: 'ACTION',
    description: 'Creates an issue in a Jira project.',
  },
  {
    type: 'jira.updateIssue',
    label: 'Update Jira issue',
    kind: 'ACTION',
    description: 'Changes fields of an existing issue.',
  },
  {
    type: 'jira.getIssue',
    label: 'Get Jira issue',
    kind: 'ACTION',
    description: 'Reads an issue for later steps.',
  },
  {
    type: 'jira.addComment',
    label: 'Comment on Jira issue',
    kind: 'ACTION',
    description: 'Adds a comment to an issue.',
  },
  {
    type: 'jira.transitionIssue',
    label: 'Move Jira issue',
    kind: 'ACTION',
    description: 'Moves an issue to another status.',
  },
  {
    type: 'jira.assignIssue',
    label: 'Assign Jira issue',
    kind: 'ACTION',
    description: 'Assigns an issue to a person, or unassigns it.',
  },
  {
    type: 'jira.searchIssues',
    label: 'Search Jira issues',
    kind: 'ACTION',
    description: 'Finds issues with a JQL query.',
  },
  {
    type: 'gmail.email.received',
    label: 'New email',
    kind: 'TRIGGER',
    description: 'Starts when an email arrives in a connected Gmail inbox.',
  },
  {
    type: 'gmail.email.labelReceived',
    label: 'Email gets a label',
    kind: 'TRIGGER',
    description: 'Starts when an email gets the chosen Gmail label.',
  },
  {
    type: 'gmail.sendEmail',
    label: 'Send email',
    kind: 'ACTION',
    description: 'Sends an email from a connected Gmail mailbox.',
  },
  {
    type: 'gmail.replyToEmail',
    label: 'Reply to email',
    kind: 'ACTION',
    description: 'Replies in the same Gmail thread.',
  },
  {
    type: 'gmail.getEmail',
    label: 'Get email',
    kind: 'ACTION',
    description: 'Reads an email for later steps.',
  },
  {
    type: 'gmail.addLabel',
    label: 'Add Gmail label',
    kind: 'ACTION',
    description: 'Adds a label to an email.',
  },
  {
    type: 'gmail.removeLabel',
    label: 'Remove Gmail label',
    kind: 'ACTION',
    description: 'Removes a label from an email.',
  },
  {
    type: 'gmail.markAsRead',
    label: 'Mark email as read',
    kind: 'ACTION',
    description: 'Marks an email as read.',
  },
  {
    type: 'gmail.markAsUnread',
    label: 'Mark email as unread',
    kind: 'ACTION',
    description: 'Marks an email as unread.',
  },
];
