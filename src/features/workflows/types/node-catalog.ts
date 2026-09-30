import type { NodeCategory } from './workflow-definition';

export interface NodeCatalogEntry {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
}

/** What the palette offers. Config schemas per type are added as each node is built. */
export const NODE_CATALOG: NodeCatalogEntry[] = [
  {
    type: 'github.issue.created',
    label: 'GitHub issue opened',
    category: 'trigger',
    description: 'Starts when an issue is opened in a repository.',
  },
  {
    type: 'webhook.received',
    label: 'Webhook received',
    category: 'trigger',
    description: 'Starts when a signed request reaches your webhook URL.',
  },
  {
    type: 'ai.summarize',
    label: 'Summarize text',
    category: 'action',
    description: 'Condenses text into a short summary.',
  },
  {
    type: 'ai.classify',
    label: 'Classify text',
    category: 'action',
    description: 'Sorts text into one of the categories you set.',
  },
  {
    type: 'ai.extract',
    label: 'Extract fields',
    category: 'action',
    description: 'Pulls structured fields out of text.',
  },
  {
    type: 'slack.sendMessage',
    label: 'Send Slack message',
    category: 'action',
    description: 'Posts a message to a channel.',
  },
  {
    type: 'microsoft.sendMail',
    label: 'Send email (Outlook)',
    category: 'action',
    description: 'Sends an email from the connected Microsoft account.',
  },
  {
    type: 'condition',
    label: 'Condition',
    category: 'condition',
    description: 'Continues down the true or false branch.',
  },
];
