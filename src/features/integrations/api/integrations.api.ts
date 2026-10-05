import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowsApi } from '@/features/workflows/api/workflows.api';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  Connection,
  ConnectionTestResult,
  ConnectStart,
  CreateHttpConnectionRequest,
  HttpCredentials,
  UpdateHttpConnectionRequest,
  GitHubRepository,
  IntegrationProvider,
  IntegrationProviderKey,
  Page,
  SlackChannel,
  TodoList,
  JiraSite,
  JiraProject,
  JiraIssueType,
  JiraStatus,
  JiraUser,
} from '@/types/api';
import { browser, isSafeProviderUrl, rememberReturn, type ConnectReturn } from '../connect-flow';

const base = (ws: string) => `/workspaces/${ws}/integrations`;

export const integrationsApi = {
  providers: () => api.get<IntegrationProvider[]>('/integrations/providers'),
  connections: (ws: string) => api.get<Connection[]>(base(ws)),
  /** Returns the provider URL; the browser then navigates there (Part 10). */
  connect: (ws: string, provider: IntegrationProviderKey) =>
    api.post<ConnectStart>(`${base(ws)}/${provider}/connect`),
  disconnect: (ws: string, connectionId: string) => api.delete<void>(`${base(ws)}/${connectionId}`),
  repositories: (ws: string, connectionId: string) =>
    api.get<GitHubRepository[]>(`${base(ws)}/${connectionId}/github/repositories`),
  slackChannels: (ws: string, connectionId: string, cursor?: string) =>
    api.get<Page<SlackChannel>>(`${base(ws)}/${connectionId}/slack/channels`, {
      query: { cursor },
    }),
  todoLists: (ws: string, connectionId: string) =>
    api.get<TodoList[]>(`${base(ws)}/${connectionId}/microsoft/todo-lists`),
  jiraSites: (ws: string, connectionId: string) =>
    api.get<JiraSite[]>(`${base(ws)}/${connectionId}/jira/sites`),
  jiraProjects: (ws: string, connectionId: string, siteId: string, query?: string) =>
    api.get<JiraProject[]>(`${base(ws)}/${connectionId}/jira/projects`, {
      query: { siteId, query },
    }),
  jiraIssueTypes: (ws: string, connectionId: string, siteId: string, project: string) =>
    api.get<JiraIssueType[]>(`${base(ws)}/${connectionId}/jira/issue-types`, {
      query: { siteId, project },
    }),
  jiraStatuses: (ws: string, connectionId: string, siteId: string, project: string) =>
    api.get<JiraStatus[]>(`${base(ws)}/${connectionId}/jira/statuses`, {
      query: { siteId, project },
    }),
  jiraUsers: (ws: string, connectionId: string, siteId: string, project: string, query?: string) =>
    api.get<JiraUser[]>(`${base(ws)}/${connectionId}/jira/users`, {
      query: { siteId, project, query },
    }),
  createHttp: (ws: string, body: CreateHttpConnectionRequest) =>
    api.post<Connection>(`${base(ws)}/http`, body),
  testHttp: (ws: string, connectionId: string, body: { url: string; method?: 'GET' | 'HEAD' }) =>
    api.post<ConnectionTestResult>(`${base(ws)}/${connectionId}/test`, body),
  updateHttp: (ws: string, connectionId: string, body: UpdateHttpConnectionRequest) =>
    api.patch<Connection>(`${base(ws)}/${connectionId}`, body),
  rotateHttp: (ws: string, connectionId: string, credentials: HttpCredentials) =>
    api.put<Connection>(`${base(ws)}/${connectionId}/credentials`, { credentials }),
};

export function useProviders() {
  return useQuery({ queryKey: queryKeys.providers, queryFn: integrationsApi.providers });
}

export function useConnections(ws: string) {
  return useQuery({
    queryKey: queryKeys.integrations.connections(ws),
    queryFn: () => integrationsApi.connections(ws),
  });
}

/** Repositories the GitHub App installation can access (trigger configuration, Part 06). */
export function useGitHubRepositories(ws: string, connectionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.integrations.repositories(ws, connectionId ?? ''),
    queryFn: () => integrationsApi.repositories(ws, connectionId!),
    enabled: !!connectionId,
  });
}

/** Slack channels the bot can post to, page by page (Slack's cursor). */
export function useSlackChannels(ws: string, connectionId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.integrations.slackChannels(ws, connectionId ?? ''),
    queryFn: ({ pageParam }) => integrationsApi.slackChannels(ws, connectionId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!connectionId,
  });
}

/** Microsoft To Do lists of the connected account. */
export function useTodoLists(ws: string, connectionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.integrations.todoLists(ws, connectionId ?? ''),
    queryFn: () => integrationsApi.todoLists(ws, connectionId!),
    enabled: !!connectionId,
  });
}

export function useJiraSites(ws: string, connectionId?: string) {
  return useQuery({
    queryKey: queryKeys.integrations.jira(ws, connectionId ?? '', 'sites'),
    queryFn: () => integrationsApi.jiraSites(ws, connectionId!),
    enabled: !!connectionId,
  });
}

export function useJiraProjects(ws: string, connectionId?: string, siteId?: string, query = '') {
  return useQuery({
    queryKey: queryKeys.integrations.jira(ws, connectionId ?? '', 'projects', { siteId, query }),
    queryFn: () => integrationsApi.jiraProjects(ws, connectionId!, siteId!, query || undefined),
    enabled: !!connectionId && !!siteId,
  });
}

export function useJiraIssueTypes(
  ws: string,
  connectionId?: string,
  siteId?: string,
  project?: string,
) {
  return useQuery({
    queryKey: queryKeys.integrations.jira(ws, connectionId ?? '', 'issue-types', {
      siteId,
      project,
    }),
    queryFn: () => integrationsApi.jiraIssueTypes(ws, connectionId!, siteId!, project!),
    enabled: !!connectionId && !!siteId && !!project,
  });
}

export function useJiraStatuses(
  ws: string,
  connectionId?: string,
  siteId?: string,
  project?: string,
) {
  return useQuery({
    queryKey: queryKeys.integrations.jira(ws, connectionId ?? '', 'statuses', { siteId, project }),
    queryFn: () => integrationsApi.jiraStatuses(ws, connectionId!, siteId!, project!),
    enabled: !!connectionId && !!siteId && !!project,
  });
}

export function useJiraUsers(
  ws: string,
  connectionId?: string,
  siteId?: string,
  project?: string,
  query = '',
) {
  return useQuery({
    queryKey: queryKeys.integrations.jira(ws, connectionId ?? '', 'users', {
      siteId,
      project,
      query,
    }),
    queryFn: () =>
      integrationsApi.jiraUsers(ws, connectionId!, siteId!, project!, query || undefined),
    enabled: !!connectionId && !!siteId && !!project,
  });
}

/**
 * Starts the provider round trip (ADMIN): asks the backend for the provider URL, remembers
 * where to come back to, then leaves the app. Only a URL from the backend is followed.
 */
export function useStartConnect(ws: string) {
  return useMutation({
    mutationFn: async (target: Omit<ConnectReturn, 'workspaceId'>) => {
      const { url } = await integrationsApi.connect(ws, target.provider);
      if (!isSafeProviderUrl(url))
        throw new Error('The server returned an unexpected connect address');
      rememberReturn({ ...target, workspaceId: ws });
      browser.assign(url);
      return url;
    },
  });
}

export function useDisconnect(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => integrationsApi.disconnect(ws, connectionId),
    meta: { success: 'Disconnected' },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.integrations.connections(ws) }),
  });
}

/** Most workflows scanned for the disconnect warning (each needs its draft). */
export const USAGE_SCAN_LIMIT = 50;

/**
 * Best effort (FR-10.6): workflows whose saved draft uses the connection. Published versions
 * are not scanned; the backend has no "where used" endpoint.
 */
export function useConnectionUsage(ws: string, connectionId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.integrations.connections(ws), connectionId, 'usage'],
    enabled: !!connectionId,
    queryFn: async () => {
      const page = await workflowsApi.list(ws, { limit: USAGE_SCAN_LIMIT });
      const details = await Promise.all(page.items.map((w) => workflowsApi.get(ws, w.id)));
      const using = details.filter((d) =>
        d.draftDefinition.nodes.some((n) => n.config.connectionId === connectionId),
      );
      return {
        workflows: using.map((d) => ({ id: d.id, name: d.name, status: d.status })),
        partial: page.nextCursor !== null,
      };
    },
  });
}

/**
 * HTTP connection mutations (Part 18). Those carrying secrets keep nothing afterwards:
 * `gcTime: 0` drops the finished mutation (and its variables) from the mutation cache at once.
 */
export function useCreateHttpConnection(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateHttpConnectionRequest) => integrationsApi.createHttp(ws, body),
    gcTime: 0,
    meta: { success: 'HTTP connection created' },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.integrations.connections(ws) }),
  });
}

export function useRotateHttpCredentials(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, credentials }: { id: string; credentials: HttpCredentials }) =>
      integrationsApi.rotateHttp(ws, id, credentials),
    gcTime: 0,
    meta: { success: 'Credentials replaced' },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.integrations.connections(ws) }),
  });
}

export function useUpdateHttpConnection(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateHttpConnectionRequest }) =>
      integrationsApi.updateHttp(ws, id, body),
    meta: { success: 'Connection updated' },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.integrations.connections(ws) }),
  });
}

export function useTestHttpConnection(ws: string) {
  return useMutation({
    mutationFn: ({ id, url, method }: { id: string; url: string; method?: 'GET' | 'HEAD' }) =>
      integrationsApi.testHttp(ws, id, { url, method }),
  });
}
