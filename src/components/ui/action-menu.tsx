import { MoreHorizontal } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

const MENU_WIDTH = 192; // w-48
const GAP = 4;

/**
 * "…" menu for row actions. Rendered in a portal with fixed positioning, so table cards with
 * `overflow-hidden` (or any scroll container) can never clip it; it opens upward when there is
 * no room below and closes on scroll/resize instead of drifting away from its row.
 * Keyboard: ArrowDown on the button opens it, arrows move, Escape closes and refocuses the button.
 */
export function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const menuId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Measure after the menu renders (hidden), then place it next to the button.
  useLayoutEffect(() => {
    if (!open || !button.current || !menu.current) return;
    const anchor = button.current.getBoundingClientRect();
    const height = menu.current.offsetHeight;
    const roomBelow = window.innerHeight - anchor.bottom;
    const top =
      roomBelow >= height + GAP || anchor.top < height + GAP
        ? anchor.bottom + GAP
        : anchor.top - height - GAP;
    const left = Math.min(
      Math.max(GAP, anchor.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - GAP,
    );
    setPosition({ top, left });
  }, [open]);

  // Focus the first item once the menu is placed (a hidden element cannot take focus).
  useEffect(() => {
    if (open && position) itemRefs.current.find((el) => el && !el.disabled)?.focus();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const onMove = () => setOpen(false);
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  const close = (focusButton = true) => {
    setOpen(false);
    setPosition(null);
    if (focusButton) button.current?.focus();
  };

  const onMenuKey = (event: React.KeyboardEvent) => {
    const enabled = itemRefs.current.filter((el): el is HTMLButtonElement => !!el && !el.disabled);
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      enabled[(index + 1) % enabled.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      enabled[(index - 1 + enabled.length) % enabled.length]?.focus();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  if (!items.length) return null;
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="text-muted hover:bg-canvas hover:text-ink rounded-md p-1.5"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            style={{
              position: 'fixed',
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              width: MENU_WIDTH,
              // Hidden for the first measuring render.
              visibility: position ? 'visible' : 'hidden',
            }}
            className="border-line bg-surface z-50 rounded-lg border py-1 shadow-lg"
          >
            {items.map((item, i) => (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close(false);
                  item.onSelect();
                }}
                className={cn(
                  'hover:bg-canvas flex w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:opacity-50',
                  item.danger && 'text-status-failed',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
