import type { Workspace } from '@/types/api';
import { useWorkspaces } from '../api/workspaces.api';
import { useWorkspaceId } from './use-workspace-id';

export type CurrentWorkspace =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  /** The URL names a workspace the user is not a member of (or that does not exist). */
  | { status: 'not-found' }
  | { status: 'ready'; workspace: Workspace };

/** The workspace in the URL, resolved against the user's memberships (with their role). */
export function useCurrentWorkspace(): CurrentWorkspace {
  const id = useWorkspaceId();
  const workspaces = useWorkspaces();
  if (workspaces.isPending) return { status: 'loading' };
  if (workspaces.isError) {
    return { status: 'error', error: workspaces.error, retry: () => void workspaces.refetch() };
  }
  const workspace = workspaces.data.find((w) => w.id === id);
  return workspace ? { status: 'ready', workspace } : { status: 'not-found' };
}

/** Inside pages rendered by WorkspaceGuard the workspace is always resolved. */
export function useWorkspace(): Workspace {
  const current = useCurrentWorkspace();
  if (current.status !== 'ready') throw new Error('useWorkspace used outside WorkspaceGuard');
  return current.workspace;
}
