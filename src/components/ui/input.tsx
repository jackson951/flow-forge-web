import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'border-line bg-surface placeholder:text-muted/70 aria-[invalid=true]:border-status-failed h-10 w-full rounded-md border px-3 text-sm',
        className,
      )}
      {...props}
    />
  );
}
