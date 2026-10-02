import { useQuery } from '@tanstack/react-query';
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
