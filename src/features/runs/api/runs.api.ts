import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  CancelResult,
  DispatchedRun,
  ManualRunRequest,
  Page,
  RetriedRun,
  RetryRunRequest,
  RunDetail,
  RunFilters,
  RunSummary,
  StepRun,
} from '@/types/api';

const base = (ws: string) => `/workspaces/${ws}/runs`;

export const runsApi = {
  list: (ws: string, filters: RunFilters = {}) =>
    api.get<Page<RunSummary>>(base(ws), { query: { ...filters } }),
  get: (ws: string, runId: string) => api.get<RunDetail>(`${base(ws)}/${runId}`),
  steps: (ws: string, runId: string) => api.get<StepRun[]>(`${base(ws)}/${runId}/steps`),
  /** Manual run of the active version; reuse the same key when retrying the request. */
  start: (ws: string, workflowId: string, input: ManualRunRequest, idempotencyKey: string) =>
    api.post<DispatchedRun>(`/workspaces/${ws}/workflows/${workflowId}/runs`, input, {
      idempotencyKey,
    }),
  retry: (ws: string, runId: string, input: RetryRunRequest, idempotencyKey?: string) =>
    api.post<RetriedRun>(`${base(ws)}/${runId}/retry`, input, { idempotencyKey }),
  cancel: (ws: string, runId: string) => api.post<CancelResult>(`${base(ws)}/${runId}/cancel`),
};

export function useRuns(ws: string, filters: RunFilters = {}) {
  return useQuery({
    queryKey: queryKeys.runs.list(ws, filters),
    queryFn: () => runsApi.list(ws, filters),
  });
}

export function useRun(ws: string, runId: string) {
  return useQuery({
    queryKey: queryKeys.runs.detail(ws, runId),
    queryFn: () => runsApi.get(ws, runId),
  });
}

export function useRunSteps(ws: string, runId: string) {
  return useQuery({
    queryKey: queryKeys.runs.steps(ws, runId),
    queryFn: () => runsApi.steps(ws, runId),
  });
}

export function useCancelRun(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => runsApi.cancel(ws, runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runs.all(ws) }),
  });
}
