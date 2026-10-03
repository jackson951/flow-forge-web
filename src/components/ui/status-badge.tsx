import type { RunStatus, StepStatus } from '@/types/api';
import { cn } from '@/lib/cn';

const styles: Record<RunStatus | StepStatus, string> = {
  QUEUED: 'text-status-queued',
  PENDING: 'text-status-queued',
  RUNNING: 'text-status-running',
  RETRYING: 'text-status-warning',
  SUCCEEDED: 'text-status-succeeded',
  FAILED: 'text-status-failed',
  CANCELLED: 'text-status-cancelled',
  SKIPPED: 'text-status-cancelled',
};

const labels: Record<RunStatus | StepStatus, string> = {
  QUEUED: 'Queued',
  PENDING: 'Pending',
  RUNNING: 'Running',
  RETRYING: 'Retrying',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  SKIPPED: 'Skipped',
};

export function StatusBadge({ status }: { status: RunStatus | StepStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', styles[status])}>
      <span aria-hidden className="size-2 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
