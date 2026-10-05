import type { RunFilters } from '@/types/api';

/**
 * Central query-key factory (Part 01, FR-01.8). Every tenant key starts with
 * `['ws', workspaceId]`, so data from one workspace can never be served for another and a
 * workspace's whole cache can be dropped with `queryKeys.ws(id)`.
 */
const ws = (workspaceId: string) => ['ws', workspaceId] as const;

export const queryKeys = {
  // Not tenant-scoped.
  me: ['auth', 'me'] as const,
  workspaces: ['workspaces'] as const,
  nodeTypes: ['node-types'] as const,
  providers: ['integrations', 'providers'] as const,

  // Tenant-scoped.
  ws,
  workspace: (workspaceId: string) => [...ws(workspaceId), 'workspace'] as const,
  members: (workspaceId: string) => [...ws(workspaceId), 'members'] as const,
  dashboard: (workspaceId: string) => [...ws(workspaceId), 'dashboard'] as const,
  workflows: {
    all: (workspaceId: string) => [...ws(workspaceId), 'workflows'] as const,
    list: (workspaceId: string, filters: object = {}) =>
      [...ws(workspaceId), 'workflows', 'list', filters] as const,
    detail: (workspaceId: string, workflowId: string) =>
      [...ws(workspaceId), 'workflows', workflowId] as const,
    versions: (workspaceId: string, workflowId: string) =>
      [...ws(workspaceId), 'workflows', workflowId, 'versions'] as const,
    version: (workspaceId: string, workflowId: string, version: number) =>
      [...ws(workspaceId), 'workflows', workflowId, 'versions', version] as const,
    webhook: (workspaceId: string, workflowId: string) =>
      [...ws(workspaceId), 'workflows', workflowId, 'webhook'] as const,
    webhookDeliveries: (workspaceId: string, workflowId: string) =>
      [...ws(workspaceId), 'workflows', workflowId, 'webhook', 'deliveries'] as const,
    poll: (workspaceId: string, workflowId: string) =>
      [...ws(workspaceId), 'workflows', workflowId, 'poll'] as const,
    webhookCapture: (workspaceId: string, workflowId: string) =>
      [...ws(workspaceId), 'workflows', workflowId, 'webhook', 'capture'] as const,
  },
  runs: {
    all: (workspaceId: string) => [...ws(workspaceId), 'runs'] as const,
    list: (workspaceId: string, filters: RunFilters | object = {}) =>
      [...ws(workspaceId), 'runs', 'list', filters] as const,
    detail: (workspaceId: string, runId: string) => [...ws(workspaceId), 'runs', runId] as const,
    steps: (workspaceId: string, runId: string) =>
      [...ws(workspaceId), 'runs', runId, 'steps'] as const,
  },
  integrations: {
    connections: (workspaceId: string) => [...ws(workspaceId), 'connections'] as const,
    repositories: (workspaceId: string, connectionId: string) =>
      [...ws(workspaceId), 'connections', connectionId, 'repositories'] as const,
    slackChannels: (workspaceId: string, connectionId: string) =>
      [...ws(workspaceId), 'connections', connectionId, 'slack-channels'] as const,
    todoLists: (workspaceId: string, connectionId: string) =>
      [...ws(workspaceId), 'connections', connectionId, 'todo-lists'] as const,
    jira: (workspaceId: string, connectionId: string, resource: string, params: object = {}) =>
      [...ws(workspaceId), 'connections', connectionId, 'jira', resource, params] as const,
  },
};
