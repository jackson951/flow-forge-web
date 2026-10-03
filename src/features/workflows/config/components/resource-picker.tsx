import { CircleAlert, CircleCheck, RotateCcw, Search, type LucideIcon } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useConfigScope } from '../config-scope';

export interface ResourceItem {
  id: string;
  label: string;
  detail?: string;
  icon?: LucideIcon;
}

interface ResourcePickerProps {
  id: string;
  /** Accessible name of the list, e.g. "Repositories". */
  label: string;
  items: ResourceItem[] | undefined;
  value: string | undefined;
  onChange: (id: string) => void;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  emptyText: string;
  /** Shown instead of the list until a connection is chosen. */
  waitingText?: string;
  invalid?: boolean;
}

/**
 * Searchable list of resources from a connected account (repositories, channels, lists) with
 * loading, empty, error and "load more" states (Part 06, FR-06.3). Inline, not a popup, so
 * it can never be clipped.
 */
export function ResourcePicker(props: ResourcePickerProps) {
  const { id, label, items, value, onChange, isLoading, error, onRetry, emptyText } = props;
  const { readOnly } = useConfigScope();
  const [query, setQuery] = useState('');
  const listId = useId();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((i) => !q || i.label.toLowerCase().includes(q));
  }, [items, query]);
  const selected = items?.find((i) => i.id === value);

  if (props.waitingText) {
    return <p className="text-muted bg-canvas rounded-lg px-3 py-2 text-sm">{props.waitingText}</p>;
  }
  if (isLoading) {
    return (
      <div className="space-y-1.5" aria-label={`Loading ${label.toLowerCase()}`}>
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    );
  }
  if (error) {
    return (
      <div
        role="alert"
        className="border-status-failed/30 bg-status-failed/5 space-y-2 rounded-lg border p-3 text-sm"
      >
        <p className="text-status-failed flex items-start gap-1.5">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Could not load {label.toLowerCase()}: {error.message}
        </p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('border-line rounded-lg border', props.invalid && 'border-status-failed')}>
      <label className="border-line relative block border-b">
        <span className="sr-only">Search {label.toLowerCase()}</span>
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          aria-controls={listId}
          aria-describedby={`${id}-msg`}
          className="h-9 w-full rounded-t-lg pr-3 pl-8 text-sm outline-none"
        />
      </label>
      <ul id={listId} role="listbox" aria-label={label} className="max-h-52 overflow-y-auto py-1">
        {!filtered.length && (
          <li className="text-muted px-3 py-2 text-sm">
            {items?.length ? 'Nothing matches.' : emptyText}
          </li>
        )}
        {filtered.map((item) => {
          const Icon = item.icon;
          const isSelected = item.id === value;
          return (
            <li
              key={item.id}
              role="option"
              aria-selected={isSelected}
              aria-disabled={readOnly || undefined}
              tabIndex={readOnly ? -1 : 0}
              onClick={() => !readOnly && onChange(item.id)}
              onKeyDown={(e) => {
                if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onChange(item.id);
                }
              }}
              className={cn(
                'focus-visible:bg-canvas flex items-center gap-2 px-3 py-1.5 text-sm outline-none',
                readOnly ? 'cursor-default' : 'hover:bg-canvas cursor-pointer',
                isSelected && 'bg-primary-soft font-medium',
              )}
            >
              {Icon && <Icon className="text-muted size-4 shrink-0" aria-hidden />}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.detail && <span className="text-muted shrink-0 text-xs">{item.detail}</span>}
              {isSelected && <CircleCheck className="text-primary size-4 shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ul>
      {props.hasMore && (
        <div className="border-line border-t p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={props.onLoadMore}
            disabled={props.loadingMore}
          >
            {props.loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
      {value && !selected && !props.hasMore && (
        <p className="text-status-warning border-line border-t px-3 py-2 text-xs">
          The selected item ({value}) is not in this list any more. Choose another.
        </p>
      )}
    </div>
  );
}
