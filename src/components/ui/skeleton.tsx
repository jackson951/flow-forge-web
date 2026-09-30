import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('bg-line/60 animate-pulse rounded-md', className)} />;
}
