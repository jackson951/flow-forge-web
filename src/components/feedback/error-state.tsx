import { Button } from '@/components/ui';

interface ErrorStateProps {
  title?: string;
  message: string;
  requestId?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Couldn’t load this',
  message,
  requestId,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="border-status-failed/30 bg-status-failed/5 rounded-lg border px-6 py-5"
    >
      <h2 className="text-status-failed text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm">{message}</p>
      {requestId && <p className="text-muted mt-2 font-mono text-xs">Request {requestId}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
