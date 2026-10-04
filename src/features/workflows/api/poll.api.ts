import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { PollStatus } from '@/types/api';

export const pollApi = {
  status: (ws: string, wf: string) => api.get<PollStatus>(`/workspaces/${ws}/workflows/${wf}/poll`),
};

/** Poll trigger state (Part 20, FR-20.8); refreshed every minute while the editor is open. */
export function usePollStatus(ws: string, wf: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.workflows.poll(ws, wf),
    queryFn: () => pollApi.status(ws, wf),
    enabled,
    refetchInterval: 60_000,
  });
}
