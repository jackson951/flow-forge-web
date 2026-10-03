import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Section icon, shown in a tile next to the title. */
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <header className="border-line flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div className="flex items-start gap-4">
        {Icon && (
          <span
            aria-hidden
            className="bg-primary-soft text-primary flex size-11 shrink-0 items-center justify-center rounded-xl"
          >
            <Icon className="size-5" />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-muted mt-1 max-w-prose text-sm">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
