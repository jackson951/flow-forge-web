import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/** After leaving or deleting: drop everything cached for the workspace and refetch the list. */
function useForgetWorkspace() {
  const qc = useQueryClient();
  return async (ws: string) => {
    await qc.cancelQueries({ queryKey: queryKeys.ws(ws) });
    qc.removeQueries({ queryKey: queryKeys.ws(ws) });
    await qc.invalidateQueries({ queryKey: queryKeys.workspaces });
  };
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.create,
    meta: { success: 'Workspace created' },
    onSuccess: (created) => {
      qc.setQueryData<Workspace[]>(queryKeys.workspaces, (list) => [...(list ?? []), created]);
      void qc.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
}

export function useRenameWorkspace(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => workspacesApi.rename(ws, { name }),
    meta: { success: 'Workspace renamed' },
    onSuccess: (updated) => {
      qc.setQueryData<Workspace[]>(queryKeys.workspaces, (list) =>
        list?.map((w) => (w.id === updated.id ? updated : w)),
      );
    },
  });
}

export function useDeleteWorkspace(ws: string) {
  const forget = useForgetWorkspace();
  return useMutation({
    mutationFn: () => workspacesApi.remove(ws),
    meta: { success: 'Workspace deleted' },
    onSuccess: () => forget(ws),
  });
}

export function useMembers(ws: string) {
  return useQuery({ queryKey: queryKeys.members(ws), queryFn: () => workspacesApi.members(ws) });
}

export function useAddMember(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddMemberRequest) => workspacesApi.addMember(ws, input),
    meta: { success: 'Member added' },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.members(ws) }),
  });
}

export function useChangeRole(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string } & UpdateMemberRoleRequest) =>
      workspacesApi.changeRole(ws, userId, { role }),
    meta: { success: 'Role changed' },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.members(ws) }),
  });
}

/** Removing someone else refreshes the list; removing yourself (leave) forgets the workspace. */
export function useRemoveMember(ws: string, selfId: string | undefined) {
  const qc = useQueryClient();
  const forget = useForgetWorkspace();
  return useMutation({
    mutationFn: (userId: string) => workspacesApi.removeMember(ws, userId),
    meta: {
      success: (_d, userId) => (userId === selfId ? 'You left the workspace' : 'Member removed'),
    },
    onSuccess: (_, userId) =>
      userId === selfId ? forget(ws) : qc.invalidateQueries({ queryKey: queryKeys.members(ws) }),
  });
}
