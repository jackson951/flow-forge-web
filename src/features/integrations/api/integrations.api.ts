import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { IntegrationConnection, IntegrationProviderKey } from '@/types/api';

export const integrationsApi = {
  providers: () => api.get<IntegrationProviderKey[]>('/integrations/providers'),
  connections: () => api.get<IntegrationConnection[]>('/integrations'),
  /** Returns the provider's OAuth URL; the browser then navigates to it. */
  connect: (provider: IntegrationProviderKey) =>
    api.post<{ url: string }>(`/integrations/${provider}/connect`),
  disconnect: (id: string) => api.delete<void>(`/integrations/${id}`),
};

export function useConnections() {
  return useQuery({
    queryKey: queryKeys.integrations.connections,
    queryFn: integrationsApi.connections,
  });
}
