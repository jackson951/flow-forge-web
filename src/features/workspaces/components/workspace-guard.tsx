import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ErrorState } from '@/components/feedback/error-state';
import { buttonClasses, Spinner } from '@/components/ui';
import { useSession } from '@/features/auth/session/use-session';
import { isApiError } from '@/lib/api-client';
import { paths } from '@/lib/routes';
import { useCurrentWorkspace } from '../hooks/use-current-workspace';
import { lastWorkspace } from '../last-workspace';

/**
 * Renders the workspace pages only for a workspace the user belongs to (Part 03, FR-03.2).
 * Any other id — someone else's workspace or a made-up one — shows "not found" and no data,
 * the same answer the backend gives (404, never 403).
 */
export function WorkspaceGuard({ children }: { children: ReactNode }) {
  const current = useCurrentWorkspace();
  const { user } = useSession();
  const workspaceId = current.status === 'ready' ? current.workspace.id : null;

  useEffect(() => {
    if (workspaceId && user) lastWorkspace.set(user.id, workspaceId);
  }, [workspaceId, user]);

  if (current.status === 'ready') return <>{children}</>;
  if (current.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Loading workspace" />
      </div>
    );
  }
  if (current.status === 'error') {
    return (
      <div className="p-8">
        <ErrorState
          message={current.error.message}
          requestId={isApiError(current.error) ? current.error.requestId : undefined}
          onRetry={current.retry}
        />
      </div>
    );
  }
  return (
    <div className="flex min-h-full flex-col items-start justify-center gap-4 p-10">
      <h1 className="text-2xl font-semibold">Workspace not found</h1>
      <p className="text-muted max-w-prose text-sm">
        It does not exist, or you are not a member of it. Ask an admin of that workspace to add you.
      </p>
      <Link to={paths.home} className={buttonClasses()}>
        Go to your workspace
      </Link>
    </div>
  );
}
