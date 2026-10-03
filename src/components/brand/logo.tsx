import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * The FlowForge mark: an "F" made of two flowing bands — purple→blue on top, blue→cyan below
 * (docs/frontend/design/DESIGN-DIRECTION.md, "Logo"). Same drawing as public/favicon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  const top = `${id}-top`;
  const bottom = `${id}-bottom`;
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn('size-8 shrink-0', className)}>
      <defs>
        <linearGradient id={top} x1="4" y1="26" x2="37" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="1" stopColor="#9333EA" />
        </linearGradient>
        <linearGradient id={bottom} x1="6" y1="37" x2="30" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <path
        d="M4 19C4 10.2 10.7 3 19.5 3H35a1.5 1.5 0 0 1 1.5 1.5C36.5 10.4 31.9 15 26 15h-6.8C12.4 15 7 19.4 4 26.5Z"
        fill={`url(#${top})`}
      />
      <path
        d="M4 26.5C6.8 20.4 11.3 17 16.5 17H29a1.5 1.5 0 0 1 1.5 1.5c0 5.4-4.4 9.5-9.5 9.5h-2.7c-4.3 0-6.5 4.2-7.6 8.2a1.2 1.2 0 0 1-1.3.9C6.2 36.7 4 33.7 4 30.5Z"
        fill={`url(#${bottom})`}
      />
    </svg>
  );
}

/**
 * Mark + wordmark ("Flow" solid, "Forge" in the brand gradient), optionally with the tagline.
 * `tone="light"` on the navy rail and brand panel, `"dark"` on white. The name is real text.
 */
export function Logo({
  tone = 'light',
  tagline = false,
  className,
}: {
  tone?: 'light' | 'dark';
  tagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className={tagline ? 'size-10' : undefined} />
      <span className="flex flex-col">
        <span className="text-lg leading-tight font-bold tracking-tight">
          <span className={tone === 'light' ? 'text-white' : 'text-ink'}>Flow</span>
          <span
            className={cn(
              'bg-gradient-to-r bg-clip-text text-transparent',
              // Lighter stops on navy keep the contrast readable.
              tone === 'light' ? 'from-sky-400 to-violet-400' : 'from-blue-600 to-violet-700',
            )}
          >
            Forge
          </span>
        </span>
        {tagline && (
          <span
            className={cn(
              'mt-0.5 text-[10px] font-medium tracking-[0.25em] uppercase',
              tone === 'light' ? 'text-sidebar-text' : 'text-muted',
            )}
          >
            Automate what matters
          </span>
        )}
      </span>
    </span>
  );
}
