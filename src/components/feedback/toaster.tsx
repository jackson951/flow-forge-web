import { CircleAlert, CircleCheckBig, Info, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { toastStore, type ToastTone } from '@/lib/toast';

const STYLE: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheckBig, className: 'text-status-succeeded' },
  error: { icon: CircleAlert, className: 'text-status-failed' },
  info: { icon: Info, className: 'text-primary' },
};

/** Renders the toasts in a polite live region (errors assertive) at the bottom right. */
export function Toaster() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);
  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => {
        const s = STYLE[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="border-line bg-surface pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg"
          >
            <s.icon className={cn('mt-0.5 size-4 shrink-0', s.className)} aria-hidden />
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => toastStore.dismiss(t.id)}
              className="text-muted hover:text-ink rounded p-0.5"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </section>
  );
}
