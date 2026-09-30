import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border-line flex flex-col items-start gap-3 rounded-lg border border-dashed px-6 py-10">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted max-w-prose text-sm">{description}</p>
      {action}
    </div>
  );
}
