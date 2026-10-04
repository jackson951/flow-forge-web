import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  DispatchedRun,
  Page,
  WebhookCapture,
  WebhookDelivery,
  WebhookDetails,
} from '@/types/api';

const base = (ws: string, wf: string) => `/workspaces/${ws}/workflows/${wf}/webhook`;

export const webhookApi = {
  details: (ws: string, wf: string) => api.get<WebhookDetails>(base(ws, wf)),
  rotateSecret: (ws: string, wf: string) =>
    api.post<{ secret?: string; secretHint: string; previousSecretExpiresAt: string | null }>(
      `${base(ws, wf)}/rotate-secret`,
      {},
    ),
  rotateUrl: (ws: string, wf: string) =>
    api.post<{ url: string; path: string; previousUrlExpiresAt: string | null }>(
      `${base(ws, wf)}/rotate-url`,
      {},
    ),
  deliveries: (ws: string, wf: string, cursor?: string) =>
    api.get<Page<WebhookDelivery>>(`${base(ws, wf)}/deliveries`, { query: { limit: 20, cursor } }),
  replay: (ws: string, wf: string, deliveryId: string) =>
    api.post<DispatchedRun>(`${base(ws, wf)}/deliveries/${deliveryId}/replay`),
  listen: (ws: string, wf: string) =>
    api.post<{ url: string; path: string; expiresAt: string }>(`${base(ws, wf)}/listen`),
  captured: (ws: string, wf: string) => api.get<WebhookCapture>(`${base(ws, wf)}/listen`),
};

/**
 * Webhook details (Part 19, FR-19.4/19.5). A generated secret is handed to `onSecret` and
 * removed before the response is cached, so it never sits in the query cache.
 */
export function useWebhookDetails(
  ws: string,
  wf: string,
  enabled: boolean,
  onSecret: (secret: string) => void,
) {
  return useQuery({
    queryKey: queryKeys.workflows.webhook(ws, wf),
    enabled,
    queryFn: async () => {
      const { secret, ...details } = await webhookApi.details(ws, wf);
      if (secret) onSecret(secret);
      return details;
    },
  });
}

export function useRotateWebhook(ws: string, wf: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.workflows.webhook(ws, wf) });
  return {
    secret: useMutation({
      mutationFn: () => webhookApi.rotateSecret(ws, wf),
      gcTime: 0,
      meta: { success: 'New secret generated' },
      onSuccess: refresh,
    }),
    url: useMutation({
      mutationFn: () => webhookApi.rotateUrl(ws, wf),
      meta: { success: 'New URL generated' },
      onSuccess: refresh,
    }),
  };
}

export function useWebhookDeliveries(ws: string, wf: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.workflows.webhookDeliveries(ws, wf),
    enabled,
    queryFn: ({ pageParam }) => webhookApi.deliveries(ws, wf, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useReplayDelivery(ws: string, wf: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => webhookApi.replay(ws, wf, deliveryId),
    meta: { success: 'Replay started as a new run' },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.runs.all(ws) }),
  });
}

/** Starts a 10-minute test capture; the capture query then polls until an event arrives. */
export function useListen(ws: string, wf: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => webhookApi.listen(ws, wf),
    onSuccess: () => {
      qc.removeQueries({ queryKey: queryKeys.workflows.webhookCapture(ws, wf) });
      void qc.invalidateQueries({ queryKey: queryKeys.workflows.webhook(ws, wf) });
    },
  });
}

export const LISTEN_POLL_MS = 2_000;

export function useCapture(ws: string, wf: string, polling: boolean) {
  return useQuery({
    queryKey: queryKeys.workflows.webhookCapture(ws, wf),
    queryFn: () => webhookApi.captured(ws, wf),
    enabled: polling,
    refetchInterval: (q) => (polling && !q.state.data?.event ? LISTEN_POLL_MS : false),
  });
}
