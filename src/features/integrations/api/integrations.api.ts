import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowsApi } from '@/features/workflows/api/workflows.api';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  Connection,
  ConnectStart,
  GitHubRepository,
  IntegrationProvider,
  IntegrationProviderKey,
  Page,
  SlackChannel,
  TodoList,
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
