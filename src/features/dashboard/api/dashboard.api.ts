import { useQuery } from '@tanstack/react-query';
import { runsApi } from '@/features/runs/api/runs.api';
import { workflowsApi } from '@/features/workflows/api/workflows.api';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Dashboard } from '@/types/api';

export const dashboardApi = {
  summary: (ws: string) => api.get<Dashboard>(`/workspaces/${ws}/dashboard`),
};

/** Dashboard refresh while the tab is visible (Part 09, FR-09.6). */
export const DASHBOARD_REFRESH_MS = 30_000;

/** Metrics always come from the API — the UI never invents operational numbers. */
export function useDashboard(ws: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(ws),
    queryFn: () => dashboardApi.summary(ws),
    refetchInterval: DASHBOARD_REFRESH_MS,
  });
}

/**
 * Onboarding progress from real data (FR-09.5): one cheap request per step — any workflow,
 * any published workflow, any run (connections come from the integrations query).
 */
export function useOnboarding(ws: string) {
  return useQuery({
    queryKey: [...queryKeys.dashboard(ws), 'onboarding'],
    queryFn: async () => {
      const [anyWorkflow, published, anyRun] = await Promise.all([
        workflowsApi.list(ws, { limit: 1, includeArchived: true }),
        workflowsApi.list(ws, { status: 'PUBLISHED', limit: 1 }),
        runsApi.list(ws, { limit: 1 }),
      ]);
      return {
        hasWorkflow: anyWorkflow.items.length > 0,
        hasPublished: published.items.length > 0,
        hasRun: anyRun.items.length > 0,
      };
    },
    refetchInterval: DASHBOARD_REFRESH_MS,
  });
}
