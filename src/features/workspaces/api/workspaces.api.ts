import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  AddMemberRequest,
  CreateWorkspaceRequest,
  Member,
  UpdateMemberRoleRequest,
  UpdateWorkspaceRequest,
  Workspace,
} from '@/types/api';

const base = (ws: string) => `/workspaces/${ws}`;

export const workspacesApi = {
  list: () => api.get<Workspace[]>('/workspaces'),
  get: (ws: string) => api.get<Workspace>(base(ws)),
  create: (input: CreateWorkspaceRequest) => api.post<Workspace>('/workspaces', input),
  rename: (ws: string, input: UpdateWorkspaceRequest) => api.patch<Workspace>(base(ws), input),
  remove: (ws: string) => api.delete<void>(base(ws)),
  members: (ws: string) => api.get<Member[]>(`${base(ws)}/members`),
  addMember: (ws: string, input: AddMemberRequest) =>
    api.post<Member>(`${base(ws)}/members`, input),
  changeRole: (ws: string, userId: string, input: UpdateMemberRoleRequest) =>
    api.patch<Member>(`${base(ws)}/members/${userId}`, input),
  removeMember: (ws: string, userId: string) => api.delete<void>(`${base(ws)}/members/${userId}`),
};

export function useWorkspaces(enabled = true) {
  return useQuery({ queryKey: queryKeys.workspaces, queryFn: workspacesApi.list, enabled });
}
