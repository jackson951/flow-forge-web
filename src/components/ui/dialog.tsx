import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** `lg` for forms with two columns (wider, scrolls inside when taller than the screen). */
  size?: 'md' | 'lg';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog: labelled by its title, focus moves inside and is trapped there, Escape and
 * the backdrop close it, and focus returns to the element that opened it.
 */
export function Dialog({ open, onClose, title, description, children, size = 'md' }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4',
        size === 'lg' ? 'pt-[6vh]' : 'pt-[10vh]',
      )}
    >
      <div aria-hidden className="bg-sidebar/50 fixed inset-0" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'border-line bg-surface relative flex w-full flex-col rounded-xl border p-6 shadow-xl',
          size === 'lg' ? 'max-h-[88vh] max-w-3xl' : 'max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink -m-1 rounded p-1"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {description && (
          <div id={descriptionId} className="text-muted mt-1 text-sm">
            {description}
          </div>
        )}
        <div className={cn('mt-5', size === 'lg' && '-mx-1 overflow-y-auto px-1')}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
