import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Spinner } from '@/components/ui';
import { paths } from '@/lib/routes';
import { session } from '../session/session';
import { useSession } from '../session/use-session';

/**
 * Guard for the authenticated app. On first load the session is restored from the refresh
 * cookie; without one the user goes to /login?next=<this page>. UX only — the API enforces
 * authorization on every request.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, endReason } = useSession();
  const location = useLocation();

  useEffect(() => {
    if (status === 'unknown') void session.restore();
  }, [status]);

  if (status === 'authenticated') return <>{children}</>;
  if (status === 'anonymous') {
    // Return here after signing in — unless the user signed out on purpose: the next person to
    // sign in on this browser should not land on the previous user's workspace.
    const next = `${location.pathname}${location.search}`;
    const signedOut = endReason === 'logout' || endReason === 'other-tab';
    const search = signedOut || next === paths.home ? '' : `?next=${encodeURIComponent(next)}`;
    return <Navigate to={`${paths.login}${search}`} replace />;
  }
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner label="Checking your session" />
    </div>
  );
}
