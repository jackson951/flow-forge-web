import { Database, Zap } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { optionId } from '../config-scope';
import type { ReferenceSuggestion } from '../references';

const GAP = 4;

interface SuggestionListProps {
  id: string;
  anchor: RefObject<HTMLElement | null>;
  items: ReferenceSuggestion[];
  active: number;
  onPick: (item: ReferenceSuggestion) => void;
  onHover: (index: number) => void;
  onDismiss: () => void;
  /** Shown when nothing matches. */
  empty: string;
}

/**
 * Listbox of data references for a combobox input. Portal + fixed position (never clipped by
 * the scrolling panel), flips upward without room below, follows the input's width. Focus
 * stays in the input; the input owns the keyboard (aria-activedescendant).
 */
export function SuggestionList(props: SuggestionListProps) {
  const { id, anchor, items, active, onPick, onHover, onDismiss, empty } = props;
  const list = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      if (!anchor.current || !list.current) return;
      const a = anchor.current.getBoundingClientRect();
      const height = list.current.offsetHeight;
      const below = window.innerHeight - a.bottom >= height + GAP || a.top < height + GAP;
      setBox({ top: below ? a.bottom + GAP : a.top - height - GAP, left: a.left, width: a.width });
    };
    place();
    const onScroll = (event: Event) => {
      if (list.current?.contains(event.target as Node)) return; // scrolling the list itself
      onDismiss();
    };
    window.addEventListener('resize', onDismiss);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onDismiss);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor, items.length, onDismiss]);

  // Keep the active option visible while arrowing through a long list.
  useLayoutEffect(() => {
    list.current
      ?.querySelector(`#${CSS.escape(optionId(id, active))}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [active, id]);

  return createPortal(
    <ul
      ref={list}
      id={id}
      role="listbox"
      aria-label="Data from earlier steps"
      style={
        box
          ? { top: box.top, left: box.left, width: Math.max(box.width, 280) }
          : { visibility: 'hidden' }
      }
      className="border-line bg-surface fixed z-50 max-h-64 overflow-y-auto rounded-lg border py-1 shadow-lg"
      // Keep focus in the input when clicking an option.
      onMouseDown={(e) => e.preventDefault()}
    >
      {items.length === 0 && <li className="text-muted px-3 py-2 text-sm">{empty}</li>}
      {items.map((item, i) => {
        const Icon = item.ref.startsWith('trigger.') ? Zap : Database;
        return (
          <li
            key={item.ref}
            id={optionId(id, i)}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => onHover(i)}
            onClick={() => onPick(item)}
            className={cn(
              'flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm',
              i === active && 'bg-primary-soft',
            )}
          >
            <Icon className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate font-mono text-xs">{item.ref}</span>
              <span className="text-muted block truncate text-xs">
                {item.description} · {item.source}
              </span>
            </span>
          </li>
        );
      })}
    </ul>,
    document.body,
  );
}
