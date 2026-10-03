import {
  Ban,
  CircleCheckBig,
  CircleDashed,
  CircleSlash,
  CircleX,
  Clock,
  LoaderCircle,
  RotateCw,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { RunStatus, StepStatus } from '@/types/api';

const STYLES: Record<
  RunStatus | StepStatus,
  { label: string; icon: LucideIcon; className: string; spin?: boolean }
> = {
  QUEUED: { label: 'Queued', icon: Clock, className: 'bg-canvas text-status-queued ring-line' },
  PENDING: {
    label: 'Pending',
    icon: CircleDashed,
    className: 'bg-canvas text-status-queued ring-line',
  },
  RUNNING: {
    label: 'Running',
    icon: LoaderCircle,
    spin: true,
    className: 'bg-blue-50 text-status-running ring-blue-600/20',
  },
  RETRYING: {
    label: 'Retrying',
    icon: RotateCw,
    className: 'bg-amber-50 text-status-warning ring-amber-600/20',
  },
  SUCCEEDED: {
    label: 'Succeeded',
    icon: CircleCheckBig,
    className: 'bg-emerald-50 text-status-succeeded ring-emerald-600/20',
  },
  FAILED: {
    label: 'Failed',
    icon: CircleX,
    className: 'bg-rose-50 text-status-failed ring-rose-600/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: Ban,
    className: 'bg-canvas text-status-cancelled ring-line',
  },
  SKIPPED: {
    label: 'Skipped',
    icon: CircleSlash,
    className: 'bg-canvas text-status-cancelled ring-line',
  },
};

/** Run/step status pill: icon + text (colour only supports them). */
export function StatusBadge({ status }: { status: RunStatus | StepStatus }) {
  const { label, icon: Icon, className, spin } = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        className,
      )}
    >
      <Icon className={cn('size-3.5', spin && 'animate-spin')} aria-hidden />
      {label}
    </span>
  );
}
