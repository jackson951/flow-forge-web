import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** A bordered surface. Deliberately flat — structure comes from borders, not shadows. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-line bg-surface rounded-lg border', className)} {...props} />;
}
