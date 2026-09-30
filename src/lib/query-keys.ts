/** Central query-key factory so cache invalidation stays consistent. */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  dashboard: ['dashboard'] as const,
  workflows: {
    all: ['workflows'] as const,
    detail: (id: string) => ['workflows', id] as const,
    versions: (id: string) => ['workflows', id, 'versions'] as const,
  },
  runs: {
    all: ['runs'] as const,
    list: (filters: object) => ['runs', 'list', filters] as const,
    detail: (id: string) => ['runs', id] as const,
  },
  integrations: {
    providers: ['integrations', 'providers'] as const,
    connections: ['integrations', 'connections'] as const,
  },
};
