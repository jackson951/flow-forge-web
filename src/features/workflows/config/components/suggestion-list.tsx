import { Braces, Database, Zap } from 'lucide-react';
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
  /** Shown when nothing matches. */
  empty: string;
}

/**
 * Listbox of data references for a combobox input. Portal + fixed position (never clipped by
 * the scrolling panel), flips upward without room below, follows the input's width. Focus
 * stays in the input; the input owns the keyboard (aria-activedescendant).
 */
export function SuggestionList(props: SuggestionListProps) {
  const { id, anchor, items, active, onPick, onHover, empty } = props;
  const list = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      if (!anchor.current || !list.current) return;
      const a = anchor.current.getBoundingClientRect();
      if (a.bottom < 0 || a.top > window.innerHeight) {
        setBox(null);
        return;
      }
      const height = list.current.offsetHeight;
      const below = window.innerHeight - a.bottom >= height + GAP || a.top < height + GAP;
      const width = Math.min(Math.max(a.width, 340), window.innerWidth - 24);
      const left = Math.min(Math.max(12, a.left), Math.max(12, window.innerWidth - width - 12));
      setBox({ top: below ? a.bottom + GAP : a.top - height - GAP, left, width });
    };
    place();
    const onScroll = (event: Event) => {
      if (list.current?.contains(event.target as Node)) return; // scrolling the list itself
      // Editing can grow the configuration summary above the active field and scroll its panel.
      // Keep the suggestions attached to the field instead of closing them mid-typing.
      place();
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor, items.length]);

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
      style={box ? { top: box.top, left: box.left, width: box.width } : { visibility: 'hidden' }}
      className="border-line bg-surface fixed z-50 max-h-72 overflow-y-auto rounded-xl border shadow-xl"
      // Keep focus in the input when clicking an option.
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.preventDefault()}
    >
      <li
        role="presentation"
        className="border-line bg-surface sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-3 py-2"
      >
        <span className="text-ink flex items-center gap-1.5 text-xs font-semibold">
          <Braces className="text-primary size-3.5" aria-hidden />
          Available data
        </span>
        <span className="text-muted text-[11px] tabular-nums">
          {items.length} {items.length === 1 ? 'value' : 'values'}
        </span>
      </li>
      {items.length === 0 && <li className="text-muted px-3 py-3 text-sm">{empty}</li>}
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
              <span className="block font-mono text-xs font-medium wrap-break-word">
                {item.ref}
              </span>
              <span className="text-muted mt-0.5 block text-xs leading-snug">
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
