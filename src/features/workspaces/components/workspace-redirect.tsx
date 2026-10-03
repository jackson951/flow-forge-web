import { useState } from 'react';
import { Navigate } from 'react-router';
import { ErrorState } from '@/components/feedback/error-state';
import { Button, Spinner } from '@/components/ui';
import { useSession } from '@/features/auth/session/use-session';
import { isApiError } from '@/lib/api-client';
import { paths } from '@/lib/routes';
import { useWorkspaces } from '../api/workspaces.api';
import { lastWorkspace } from '../last-workspace';
import { CreateWorkspaceDialog } from './create-workspace-dialog';

/**
 * `/` → the workspace the user last opened, if they still belong to it, else their first one
 * (Part 03, FR-03.2). With no workspace at all (e.g. they left their last one) they create one.
 */
export function WorkspaceRedirect() {
  const workspaces = useWorkspaces();
  const { user } = useSession();
  const [creating, setCreating] = useState(false);

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

  const remembered = user ? lastWorkspace.get(user.id) : null;
  const target = workspaces.data.find((w) => w.id === remembered) ?? workspaces.data[0];
  if (target) return <Navigate to={paths.workspace(target.id)} replace />;

  return (
    <div className="flex min-h-full flex-col items-start justify-center gap-4 p-10">
      <h1 className="text-2xl font-semibold">Create your first workspace</h1>
      <p className="text-muted max-w-prose text-sm">
        You are not a member of any workspace. Create one, or ask a workspace admin to add you.
      </p>
      <Button onClick={() => setCreating(true)}>Create workspace</Button>
      <CreateWorkspaceDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
