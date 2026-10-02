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
];
