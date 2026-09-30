import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState } from './error-state';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong while rendering this page. Reload to try again.';
  return (
    <div className="p-8">
      <ErrorState message={message} onRetry={() => window.location.reload()} />
    </div>
  );
}
