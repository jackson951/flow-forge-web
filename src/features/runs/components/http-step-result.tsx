import { CircleAlert, CircleCheckBig, Globe, Scissors, Timer } from 'lucide-react';
import { maskUrl } from '@/features/workflows/config/http-request-model';
import { cn } from '@/lib/cn';
import { formatDuration } from '../run-helpers';

interface HttpOutput {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  finalUrl?: string;
  durationMs?: number;
  bodyTruncated?: boolean;
}

function httpOutput(output: unknown): HttpOutput | null {
  if (!output || typeof output !== 'object') return null;
  const o = output as Record<string, unknown>;
  return typeof o.status === 'number' ? (o as unknown as HttpOutput) : null;
}

/**
 * Summary of an `http.request` step's response (Part 18, FR-18.12): status with icon and text,
 * the final URL (secret-looking query values masked), duration, headers, truncation. The body
 * stays in the step's Output view.
 */
export function HttpStepResult({ input, output }: { input: unknown; output: unknown }) {
  const out = httpOutput(output);
  if (!out) return null;
  const ok = out.status < 400;
  const method =
    input && typeof input === 'object' && typeof (input as { method?: unknown }).method === 'string'
      ? (input as { method: string }).method
      : null;
  const headers = Object.entries(out.headers ?? {});
  return (
    <section
      aria-label="HTTP response"
      className="border-line bg-canvas space-y-1.5 rounded-lg border px-3 py-2 text-sm"
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium',
            ok ? 'text-status-succeeded' : 'text-status-failed',
          )}
        >
          {ok ? (
            <CircleCheckBig className="size-4" aria-hidden />
          ) : (
            <CircleAlert className="size-4" aria-hidden />
          )}
          HTTP {out.status}
          {out.statusText ? ` ${out.statusText}` : ''}
        </span>
        {out.finalUrl && (
          <span className="inline-flex min-w-0 items-center gap-1 font-mono text-xs">
            <Globe className="text-muted size-3.5 shrink-0" aria-hidden />
            {method && <span className="font-semibold">{method}</span>}
            <span className="truncate">{maskUrl(out.finalUrl)}</span>
          </span>
        )}
        {out.durationMs !== undefined && (
          <span className="text-muted inline-flex items-center gap-1 text-xs">
            <Timer className="size-3.5" aria-hidden />
            {formatDuration(out.durationMs)}
          </span>
        )}
        {out.bodyTruncated && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-800">
            <Scissors className="size-3.5" aria-hidden />
            Body truncated
          </span>
        )}
      </p>
      {headers.length > 0 && (
        <details>
          <summary className="text-muted cursor-pointer text-xs">
            Response headers ({headers.length})
          </summary>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-xs">
            {headers.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="truncate">{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  );
}
