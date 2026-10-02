import { useParams } from 'react-router';

/** The workspace in the URL (`/w/:workspaceId/...`). Only call inside workspace routes. */
export function useWorkspaceId(): string {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  if (!workspaceId) throw new Error('useWorkspaceId used outside a /w/:workspaceId route');
  return workspaceId;
}
