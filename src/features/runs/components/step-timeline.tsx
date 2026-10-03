import { CircleAlert, Timer } from 'lucide-react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { StatusBadge } from '@/components/ui';
import type { StepRun } from '@/types/api';

/** Ordered list of executed steps. A real sequence, so it's an <ol>. */
export function StepTimeline({ steps }: { steps: StepRun[] }) {
  return (
    <ol className="divide-line border-line bg-surface divide-y rounded-xl border">
      {steps.map((step) => (
        <li key={step.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <NodeTypeIcon type={step.nodeType} size="sm" />
          <span className="font-mono text-sm">{step.nodeKey}</span>
          <StatusBadge status={step.status} />
          <span className="text-muted ml-auto inline-flex items-center gap-1 text-sm tabular-nums">
            <Timer className="size-3.5" aria-hidden />
            {step.durationMs !== null ? `${step.durationMs} ms` : '—'}
          </span>
          {step.error && (
            <p className="text-status-failed flex w-full items-start gap-1.5 pl-11 text-sm">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {step.error.description}
                {step.error.message && <span className="text-muted"> — {step.error.message}</span>}
              </span>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
