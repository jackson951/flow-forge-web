import type { IntegrationProviderKey } from '@/types/api';

export const PROVIDER_NAMES: Record<IntegrationProviderKey, string> = {
  GITHUB: 'GitHub',
  SLACK: 'Slack',
  MICROSOFT: 'Microsoft',
  JIRA: 'Jira',
  GMAIL: 'Gmail',
  HTTP: 'HTTP',
  WEBHOOK: 'Webhook',
};
