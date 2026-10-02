import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
