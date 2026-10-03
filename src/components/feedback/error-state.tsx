import { Check, CircleAlert, Copy, RotateCcw, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { isApiError } from '@/lib/api-client';
import { presentError } from '@/lib/error-presentation';

interface ErrorStateProps {
  /** The error to present (mapped by `presentError`); title/message override it. */
  error?: unknown;
  title?: string;
  message?: string;
  requestId?: string;
  onRetry?: () => void;
}

/** A failed load with the reason, a copyable request id and "Try again" (Part 12, FR-12.1/12.2). */
export function ErrorState({ error, title, message, requestId, onRetry }: ErrorStateProps) {
  const presented = error !== undefined ? presentError(error) : null;
  const shownTitle = title ?? presented?.title ?? 'Couldn’t load this';
  const shownMessage = message ?? presented?.message ?? 'Something went wrong. Please try again.';
  const id = requestId ?? presented?.requestId;
  const offline = isApiError(error) && error.status === 0;
  const Icon = offline ? WifiOff : CircleAlert;
  const [copied, setCopied] = useState(false);

  return (
    <div
      role="alert"
      className="border-status-failed/30 bg-status-failed/5 rounded-lg border px-6 py-5"
    >
      <h2 className="text-status-failed flex items-center gap-1.5 text-base font-semibold">
        <Icon className="size-4 shrink-0" aria-hidden />
        {shownTitle}
      </h2>
      <p className="mt-1 text-sm">{shownMessage}</p>
      {id && (
        <p className="text-muted mt-2 flex items-center gap-1.5 font-mono text-xs">
          Request {id}
          <button
            type="button"
            aria-label="Copy request id"
            title="Copy request id"
            onClick={() =>
              void navigator.clipboard?.writeText(id).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1_500);
              })
            }
            className="hover:text-ink rounded p-0.5"
          >
            {copied ? (
              <Check className="text-status-succeeded size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
          </button>
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}
