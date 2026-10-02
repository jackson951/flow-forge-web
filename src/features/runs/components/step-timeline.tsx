import { StatusBadge } from '@/components/ui';
import type { StepRun } from '@/types/api';

/** Ordered list of executed steps. A real sequence, so it's an <ol>. */
export function StepTimeline({ steps }: { steps: StepRun[] }) {
  return (
    <ol className="divide-line border-line bg-surface divide-y rounded-lg border">
      {steps.map((step) => (
        <li key={step.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
          <span className="text-muted w-6 text-sm tabular-nums">{step.sequence}</span>
          <span className="font-mono text-sm">{step.nodeKey}</span>
          <StatusBadge status={step.status} />
          <span className="text-muted ml-auto text-sm tabular-nums">
            {step.durationMs !== null ? `${step.durationMs} ms` : '—'}
          </span>
          {step.error && (
            <p className="text-status-failed w-full pl-12 text-sm">
              {step.error.description}
              {step.error.message && <span className="text-muted"> — {step.error.message}</span>}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
