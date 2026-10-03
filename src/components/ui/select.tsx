import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'border-line bg-surface aria-[invalid=true]:border-status-failed h-10 w-full rounded-md border px-3 text-sm disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
