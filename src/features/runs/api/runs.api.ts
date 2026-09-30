import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Paginated, RunDetail, RunStatus, RunSummary } from '@/types/api';

export interface RunFilters {
  workflowId?: string;
  status?: RunStatus;
  from?: string;
  to?: string;
  cursor?: string;
}

function toQuery(filters: RunFilters): string {
  const params = new URLSearchParams(
    Object.entries(filters).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const runsApi = {
  list: (filters: RunFilters) => api.get<Paginated<RunSummary>>(`/runs${toQuery(filters)}`),
  get: (id: string) => api.get<RunDetail>(`/runs/${id}`),
  retry: (id: string) => api.post<RunSummary>(`/runs/${id}/retry`),
  cancel: (id: string) => api.post<RunSummary>(`/runs/${id}/cancel`),
};

export function useRuns(filters: RunFilters) {
  return useQuery({ queryKey: queryKeys.runs.list(filters), queryFn: () => runsApi.list(filters) });
}

export function useRun(id: string) {
  return useQuery({ queryKey: queryKeys.runs.detail(id), queryFn: () => runsApi.get(id) });
}

export function useRetryRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runsApi.retry,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runs.all }),
  });
}
