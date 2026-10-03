import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="border-line bg-surface flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <span
        aria-hidden
        className="bg-primary-soft text-primary flex size-12 items-center justify-center rounded-full"
      >
        <Icon className="size-6" />
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted max-w-prose text-sm">{description}</p>
      {action}
    </div>
  );
}
