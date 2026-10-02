import { useEffect, type ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { paths, safeNextPath } from '@/lib/routes';
import { session } from '../session/session';
import { useSession } from '../session/use-session';

/**
 * Login/register pages: a user who is already signed in (or whose session the refresh cookie
 * can restore) continues to `?next=` or home. The form shows while that is being checked.
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [params] = useSearchParams();

  useEffect(() => {
    if (status === 'unknown') void session.restore();
  }, [status]);

  if (status === 'authenticated') {
    return <Navigate to={safeNextPath(params.get('next')) ?? paths.home} replace />;
  }
  return <>{children}</>;
}
