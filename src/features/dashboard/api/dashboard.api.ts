import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { DashboardSummary } from '@/types/api';

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard'),
};

/** Metrics always come from the API — the UI never invents operational numbers. */
export function useDashboardSummary() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: dashboardApi.summary });
}
