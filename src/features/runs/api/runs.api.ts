import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  RunStatus,
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

/** Runs that can still change. */
export const isActive = (status: RunStatus) => status === 'QUEUED' || status === 'RUNNING';

/** Poll intervals for live updates (Part 08, FR-08.5); TanStack pauses them in hidden tabs. */
export const POLL = { detailMs: 1_500, listMs: 5_000 } as const;

/** Run history, newest first, keyset "Load more"; polls while a listed run is active. */
export function useRunList(ws: string, filters: Omit<RunFilters, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.runs.list(ws, { ...filters, paged: true }),
    queryFn: ({ pageParam }) => runsApi.list(ws, { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: (query) =>
      query.state.data?.pages.some((p) => p.items.some((r) => isActive(r.status)))
        ? POLL.listMs
        : false,
  });
}

/** One run; polls every 1.5 s until it is terminal. */
export function useRun(ws: string, runId: string) {
  return useQuery({
    queryKey: queryKeys.runs.detail(ws, runId),
    queryFn: () => runsApi.get(ws, runId),
    refetchInterval: (query) =>
      query.state.data && isActive(query.state.data.status) ? POLL.detailMs : false,
  });
}

/** The run's steps; polls together with the run while it is active. */
export function useRunSteps(ws: string, runId: string, active: boolean) {
  return useQuery({
    queryKey: queryKeys.runs.steps(ws, runId),
    queryFn: () => runsApi.steps(ws, runId),
    refetchInterval: active ? POLL.detailMs : false,
  });
}

export function useStartRun(ws: string, workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: ManualRunRequest; idempotencyKey: string }) =>
      runsApi.start(ws, workflowId, input, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runs.all(ws) }),
  });
}

export function useRetryRun(ws: string, runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: RetryRunRequest; idempotencyKey: string }) =>
      runsApi.retry(ws, runId, input, idempotencyKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runs.all(ws) }),
  });
}

export function useCancelRun(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => runsApi.cancel(ws, runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runs.all(ws) }),
  });
}
