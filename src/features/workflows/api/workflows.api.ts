import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Paginated, WorkflowSummary } from '@/types/api';
import type { WorkflowDefinition } from '../types/workflow-definition';

export interface CreateWorkflowInput {
  name: string;
  description?: string;
}

export const workflowsApi = {
  list: () => api.get<Paginated<WorkflowSummary>>('/workflows'),
  get: (id: string) =>
    api.get<WorkflowSummary & { draftDefinition: WorkflowDefinition | null }>(`/workflows/${id}`),
  create: (input: CreateWorkflowInput) => api.post<WorkflowSummary>('/workflows', input),
  saveDraft: (id: string, def: WorkflowDefinition) => api.put<void>(`/workflows/${id}/draft`, def),
  validate: (id: string) =>
    api.post<{ issues: { nodeId?: string; message: string }[] }>(`/workflows/${id}/validate`),
  publish: (id: string) => api.post<{ version: number }>(`/workflows/${id}/publish`),
};

export function useWorkflows() {
  return useQuery({ queryKey: queryKeys.workflows.all, queryFn: workflowsApi.list });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: queryKeys.workflows.detail(id),
    queryFn: () => workflowsApi.get(id),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workflowsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflows.all }),
  });
}
