import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Dashboard } from '@/types/api';

export const dashboardApi = {
  summary: (ws: string) => api.get<Dashboard>(`/workspaces/${ws}/dashboard`),
};

/** Metrics always come from the API — the UI never invents operational numbers. */
export function useDashboard(ws: string) {
  return useQuery({ queryKey: queryKeys.dashboard(ws), queryFn: () => dashboardApi.summary(ws) });
}
