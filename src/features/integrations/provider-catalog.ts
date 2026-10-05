import type { IntegrationProviderKey } from '@/types/api';

/**
 * What each backend provider enables and what to know before connecting (Part 10, FR-10.1/10.7).
 * The API only says which providers exist and whether this server has them configured; the
 * descriptions live here. Providers the app does not know (e.g. the backend's TEST provider)
 * are not shown.
 */
export interface ProviderInfo {
  key: IntegrationProviderKey;
  name: string;
  summary: string;
  trigger?: string;
  actions: string[];
  /** Shown on the card: what to know before / after connecting. */
  notes: string[];
  connectLabel: string;
}

export const PROVIDER_CATALOG: ProviderInfo[] = [
  {
    key: 'GITHUB',
    name: 'GitHub',
    summary: 'Start workflows when issues are opened in your repositories.',
    trigger: 'Issue opened',
    actions: [],
    notes: [
      'Connecting installs the FlowForge GitHub App. Choose which repositories it can see on GitHub; you can change that later in the app’s settings on GitHub.',
    ],
    connectLabel: 'Install on GitHub',
  },
  {
    key: 'SLACK',
    name: 'Slack',
    summary: 'Post messages to your channels.',
    actions: ['Send message'],
    notes: [
      'The FlowForge bot posts to public channels; invite it (/invite @FlowForge) to post in private channels.',
    ],
    connectLabel: 'Connect Slack',
  },
  {
    key: 'MICROSOFT',
    name: 'Microsoft To Do',
    summary: 'Create tasks in a To Do list of your Microsoft account.',
    actions: ['Create task'],
    notes: [
      'Needs a Microsoft account with a mailbox (To Do). Work accounts may need an administrator to approve Tasks access.',
    ],
    connectLabel: 'Connect Microsoft',
  },
  {
    key: 'JIRA',
    name: 'Jira',
    summary: 'Start workflows from Jira issues and create, update or move issues.',
    trigger: 'Issue created, updated or moved',
    actions: [
      'Create issue',
      'Update issue',
      'Comment',
      'Transition',
      'Assign',
      'Get issue',
      'Search',
    ],
    notes: [
      'Connect with an Atlassian account that can see the projects you want to use. FlowForge registers and renews the Jira webhooks for your triggers itself.',
    ],
    connectLabel: 'Connect Jira',
  },
  {
    key: 'GMAIL',
    name: 'Gmail',
    summary: 'Start workflows from incoming email and send, reply to or organise mail.',
    trigger: 'New email, email gets a label',
    actions: ['Send', 'Reply', 'Get email', 'Add / remove label', 'Mark read / unread'],
    notes: [
      'FlowForge asks to read and modify mail (labels, read state) and to send mail. Only the fields your workflows need are kept in run data; attachment contents are never fetched, and run data is trimmed by retention.',
      'On a self-hosted server whose Google OAuth app is still in testing, Google may show an “unverified app” screen.',
    ],
    connectLabel: 'Connect Gmail',
  },
  {
    key: 'HTTP',
    name: 'HTTP connections',
    summary: 'Save an API’s credentials once and use them in HTTP request and poll steps.',
    trigger: 'Poll for new items',
    actions: ['HTTP request'],
    notes: ['Credentials are encrypted, never shown again, and only sent to the hosts you allow.'],
    connectLabel: 'New HTTP connection',
  },
];

export const providerInfo = (key: string) => PROVIDER_CATALOG.find((p) => p.key === key);
