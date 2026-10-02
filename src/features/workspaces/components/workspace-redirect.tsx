import { Navigate } from 'react-router';
import { ErrorState } from '@/components/feedback/error-state';
import { Spinner } from '@/components/ui';
import { isApiError } from '@/lib/api-client';
import { paths } from '@/lib/routes';
import { useWorkspaces } from '../api/workspaces.api';

/**
 * `/` → the user's workspace. Part 03 adds "last used workspace" and creating one when the
 * list is empty; for now the first workspace (every user gets one at registration).
 */
export function WorkspaceRedirect() {
  const workspaces = useWorkspaces();

  if (workspaces.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Loading your workspaces" />
      </div>
    );
  }
  if (workspaces.isError) {
    const error = workspaces.error;
    return (
      <div className="p-8">
        <ErrorState
          message={error.message}
          requestId={isApiError(error) ? error.requestId : undefined}
          onRetry={() => void workspaces.refetch()}
        />
      </div>
    );
  }
  const first = workspaces.data[0];
  if (!first) {
    return <p className="text-muted p-8 text-sm">You are not a member of any workspace yet.</p>;
  }
  return <Navigate to={paths.workspace(first.id)} replace />;
}
