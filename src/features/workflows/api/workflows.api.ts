import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreateWorkflowRequest,
  DraftSaveResult,
  NodeTypeInfo,
  Page,
  UpdateWorkflowRequest,
  ValidationResult,
  VersionDetail,
  VersionSummary,
  WorkflowDetail,
  WorkflowStatus,
  WorkflowSummary,
} from '@/types/api';
import type { WorkflowDefinition } from '../types/workflow-definition';

export interface WorkflowListFilters {
  status?: WorkflowStatus;
  includeArchived?: boolean;
  limit?: number;
  cursor?: string;
}

const base = (ws: string) => `/workspaces/${ws}/workflows`;
const one = (ws: string, id: string) => `${base(ws)}/${id}`;

export const workflowsApi = {
  list: (ws: string, filters: WorkflowListFilters = {}) =>
    api.get<Page<WorkflowSummary>>(base(ws), { query: { ...filters } }),
  get: (ws: string, id: string) => api.get<WorkflowDetail>(one(ws, id)),
  create: (ws: string, input: CreateWorkflowRequest) => api.post<WorkflowDetail>(base(ws), input),
  update: (ws: string, id: string, input: UpdateWorkflowRequest) =>
    api.patch<WorkflowSummary>(one(ws, id), input),
  remove: (ws: string, id: string) => api.delete<void>(one(ws, id)),
  saveDraft: (ws: string, id: string, expectedRevision: number, definition: WorkflowDefinition) =>
    api.put<DraftSaveResult>(`${one(ws, id)}/draft`, { expectedRevision, definition }),
  /** Validates the saved draft, or the given definition without saving it. */
  validate: (ws: string, id: string, definition?: WorkflowDefinition) =>
    api.post<ValidationResult>(`${one(ws, id)}/validate`, definition ? { definition } : {}),
  publish: (ws: string, id: string, expectedRevision: number) =>
    api.post<VersionSummary>(`${one(ws, id)}/publish`, { expectedRevision }),
  /** Keyset by version number: pass the previous page's `nextCursor` as `cursor`. */
  versions: (ws: string, id: string, query: { limit?: number; cursor?: string } = {}) =>
    api.get<Page<VersionSummary>>(`${one(ws, id)}/versions`, { query }),
  version: (ws: string, id: string, version: number) =>
    api.get<VersionDetail>(`${one(ws, id)}/versions/${version}`),
  duplicate: (ws: string, id: string) => api.post<WorkflowDetail>(`${one(ws, id)}/duplicate`),
  archive: (ws: string, id: string) => api.post<WorkflowSummary>(`${one(ws, id)}/archive`),
  unarchive: (ws: string, id: string) => api.post<WorkflowSummary>(`${one(ws, id)}/unarchive`),
  nodeTypes: () => api.get<NodeTypeInfo[]>('/node-types'),
};

export function useWorkflows(ws: string, filters: WorkflowListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.workflows.list(ws, filters),
    queryFn: () => workflowsApi.list(ws, filters),
  });
}

export function useWorkflow(ws: string, id: string) {
  return useQuery({
    queryKey: queryKeys.workflows.detail(ws, id),
    queryFn: () => workflowsApi.get(ws, id),
  });
}

export function useNodeTypes() {
  return useQuery({
    queryKey: queryKeys.nodeTypes,
    queryFn: workflowsApi.nodeTypes,
    staleTime: 5 * 60_000,
  });
}

export function useCreateWorkflow(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkflowRequest) => workflowsApi.create(ws, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all(ws) }),
  });
}

/** Keyset-paginated list: each page passes the previous page's `nextCursor` (Part 04). */
export function useWorkflowList(ws: string, filters: Omit<WorkflowListFilters, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.workflows.list(ws, { ...filters, paged: true }),
    queryFn: ({ pageParam }) => workflowsApi.list(ws, { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Mutations that change a workflow's row refetch every list of the workspace. */
function useWorkflowMutation<TArgs, TResult>(ws: string, fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all(ws) }),
  });
}

/** Rename / description, shown in the list immediately and rolled back on failure. */
export function useUpdateWorkflow(ws: string) {
  const qc = useQueryClient();
  type Pages = InfiniteData<Page<WorkflowSummary>>;
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateWorkflowRequest) =>
      workflowsApi.update(ws, id, input),
    onMutate: async ({ id, ...input }) => {
      const key = queryKeys.workflows.all(ws);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueriesData<Pages>({ queryKey: key });
      qc.setQueriesData<Pages>({ queryKey: key }, (data) =>
        data?.pages
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((w) => (w.id === id ? { ...w, ...input } : w)),
              })),
            }
          : data,
      );
      return { previous };
    },
    onError: (_err, _vars, context) =>
      context?.previous.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all(ws) }),
  });
}

export const useDuplicateWorkflow = (ws: string) =>
  useWorkflowMutation(ws, (id: string) => workflowsApi.duplicate(ws, id));
export const useArchiveWorkflow = (ws: string) =>
  useWorkflowMutation(ws, (id: string) => workflowsApi.archive(ws, id));
export const useUnarchiveWorkflow = (ws: string) =>
  useWorkflowMutation(ws, (id: string) => workflowsApi.unarchive(ws, id));
export const useDeleteWorkflow = (ws: string) =>
  useWorkflowMutation(ws, (id: string) => workflowsApi.remove(ws, id));

/**
 * Explicit draft save (Part 05). The response's `draftRevision` becomes the next
 * `expectedRevision`; autosave and conflict handling come with Part 07.
 */
export function useSaveDraft(ws: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ revision, definition }: { revision: number; definition: WorkflowDefinition }) =>
      workflowsApi.saveDraft(ws, id, revision, definition),
    onSuccess: ({ draftRevision, issues }, { definition }) => {
      qc.setQueryData<WorkflowDetail>(queryKeys.workflows.detail(ws, id), (current) =>
        current ? { ...current, draftRevision, draftDefinition: definition, issues } : current,
      );
      void qc.invalidateQueries({ queryKey: queryKeys.workflows.list(ws) });
    },
  });
}

/** Publishes the saved draft at `revision` as a new immutable version (ADMIN, Part 07). */
export function usePublish(ws: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (revision: number) => workflowsApi.publish(ws, id, revision),
    onSuccess: (version) => {
      qc.setQueryData<WorkflowDetail>(queryKeys.workflows.detail(ws, id), (current) =>
        current
          ? {
              ...current,
              status: 'PUBLISHED',
              activeVersion: {
                id: version.id,
                version: version.version,
                publishedAt: version.publishedAt,
              },
            }
          : current,
      );
      void qc.invalidateQueries({ queryKey: queryKeys.workflows.versions(ws, id) });
      void qc.invalidateQueries({ queryKey: queryKeys.workflows.list(ws) });
    },
  });
}

/** Versions, newest first, keyset by version number ("Load more"). */
export function useVersions(ws: string, id: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.workflows.versions(ws, id), 'list'],
    queryFn: ({ pageParam }) => workflowsApi.versions(ws, id, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

/** One version with its frozen definition (immutable, so it never goes stale). */
export function useVersion(ws: string, id: string, version: number | undefined) {
  return useQuery({
    queryKey: queryKeys.workflows.version(ws, id, version ?? 0),
    queryFn: () => workflowsApi.version(ws, id, version!),
    enabled: version !== undefined,
    staleTime: Infinity,
  });
}
