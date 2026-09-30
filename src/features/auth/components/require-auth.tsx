import type { ReactNode } from 'react';

/**
 * Route guard for the authenticated app.
 * UX only — the API enforces authorization on every request.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  // TODO: use useMe(); show a spinner while loading, <Navigate to="/login" /> on 401.
  return <>{children}</>;
}
