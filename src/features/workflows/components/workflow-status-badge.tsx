import { Archive, CircleCheckBig, PencilLine, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { WorkflowStatus } from '@/types/api';

const STYLES: Record<WorkflowStatus, { label: string; icon: LucideIcon; className: string }> = {
  PUBLISHED: {
    label: 'Published',
    icon: CircleCheckBig,
    className: 'bg-emerald-50 text-status-succeeded ring-emerald-600/20',
  },
  DRAFT: { label: 'Draft', icon: PencilLine, className: 'bg-canvas text-muted ring-line' },
  ARCHIVED: {
    label: 'Archived',
    icon: Archive,
    className: 'bg-amber-50 text-status-warning ring-amber-600/20',
  },
};

/** Status pill: icon + text; colour only supports them. */
export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const { label, icon: Icon, className } = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
