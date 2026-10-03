import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Spinner } from '@/components/ui';
import { useSession } from '@/features/auth/session/use-session';
import { useWorkspaces } from '@/features/workspaces/api/workspaces.api';
import { lastWorkspace } from '@/features/workspaces/last-workspace';
import { paths } from '@/lib/routes';
import {
  clearReturn,
  parseCallback,
  peekReturn,
  type IntegrationReturnState,
} from '../connect-flow';

/**
 * Landing route for the backend's integration callback (Part 10, FR-10.4):
 * `/integrations?provider=&status=&connectionId=&reason=`. Goes back to where the connection
 * was started (remembered before leaving), or the workspace's Integrations page, carrying the
 * result in router state — the query string is dropped from the URL and history (replace).
 */
export function IntegrationCallbackPage() {
  const location = useLocation();
  const { user } = useSession();
  const workspaces = useWorkspaces();
  // Read once; cleared after we navigate (initialisers may run twice in development).
  const [target] = useState(peekReturn);
  const [result] = useState(() => parseCallback(location.search));
  useEffect(() => () => clearReturn(), []);

  if (!result) return <Navigate to={paths.home} replace />;

  const workspaceId =
    target?.workspaceId ?? (user && lastWorkspace.get(user.id)) ?? workspaces.data?.[0]?.id;
  if (!workspaceId) {
    return workspaces.isPending ? (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Finishing the connection" />
      </div>
    ) : (
      <Navigate to={paths.home} replace />
    );
  }

  const state: IntegrationReturnState = { integrationResult: result, selectStep: target?.stepKey };
  return (
    <Navigate to={target?.returnTo ?? paths.integrations(workspaceId)} replace state={state} />
  );
}
