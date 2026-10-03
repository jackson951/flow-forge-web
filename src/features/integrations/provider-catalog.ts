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
];

export const providerInfo = (key: string) => PROVIDER_CATALOG.find((p) => p.key === key);
