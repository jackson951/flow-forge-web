import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { Spinner } from '@/components/ui';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { session } from '@/features/auth/session/session';
import { useSession } from '@/features/auth/session/use-session';
import { parseCallback } from '@/features/integrations/connect-flow';
import { IntegrationCallbackPage } from '@/features/integrations/pages/integration-callback-page';
import { WorkspaceRedirect } from '@/features/workspaces/components/workspace-redirect';
import { HomePage } from './home-page';
import { PublicIntegrationsPage } from './info-pages';
import { PublicLayout } from './public-layout';

/**
 * `/`: signed-in users go to their workspace (as before); signed-out visitors see the public
 * homepage instead of being sent straight to sign in (Part 12).
 */
export function HomeGate() {
  const { status } = useSession();
  useEffect(() => {
    if (status === 'unknown') void session.restore();
  }, [status]);

  if (status === 'authenticated') return <WorkspaceRedirect />;
  if (status === 'anonymous') {
    return (
      <PublicLayout>
        <HomePage />
      </PublicLayout>
    );
  }
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner label="Loading FlowForge" />
    </div>
  );
}

/**
 * `/integrations` is both the public integration catalogue and where the backend sends the
 * browser after connecting an account (with `?status=…`); the callback needs a session.
 */
export function IntegrationsEntry() {
  const location = useLocation();
  if (parseCallback(location.search)) {
    return (
      <RequireAuth>
        <IntegrationCallbackPage />
      </RequireAuth>
    );
  }
  return (
    <PublicLayout>
      <PublicIntegrationsPage />
    </PublicLayout>
  );
}
