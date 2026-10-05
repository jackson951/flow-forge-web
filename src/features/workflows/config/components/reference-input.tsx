import { Database } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { filterSuggestions, optionId, useConfigScope } from '../config-scope';
import { ReferenceProblems } from './reference-problems';
import { SuggestionList } from './suggestion-list';

interface ReferenceInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  placeholder?: string;
}

/**
 * One data reference without braces (`steps.classify.output.label`), as used by condition
 * operands and AI "pass as-is" inputs. Suggests upstream data while typing or on focus.
 */
export function ReferenceInput({
  id,
  value,
  onChange,
  label,
  invalid,
  placeholder,
}: ReferenceInputProps) {
  const { suggestions, readOnly } = useConfigScope();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const items = useMemo(() => filterSuggestions(suggestions, value), [suggestions, value]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' && !open) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (items.length ? (i + step + items.length) % items.length : 0));
    } else if (event.key === 'Enter' && items[active]) {
      event.preventDefault();
      onChange(items[active].ref);
      setOpen(false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="relative">
        <Database
          className="text-muted pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <input
          id={id}
          ref={input}
          type="text"
          value={value}
          aria-label={label}
          placeholder={placeholder ?? 'Choose data…'}
          disabled={readOnly}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-refs`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && items[active] ? optionId(listId, active) : undefined}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            onChange(e.target.value.trim());
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'border-line bg-surface aria-[invalid=true]:border-status-failed h-9 w-full rounded-md border pr-2 pl-8 font-mono text-xs disabled:opacity-60',
          )}
        />
      </div>
      <ReferenceProblems id={`${id}-refs`} refs={value ? [value] : []} />
      {open && !readOnly && (
        <SuggestionList
          id={listId}
          anchor={input}
          items={items}
          active={active}
          onHover={setActive}
          onPick={(item) => {
            onChange(item.ref);
            setOpen(false);
          }}
          empty={
            suggestions.length
              ? 'No matching data — type a path like trigger.name'
              : 'No data from earlier steps yet'
          }
        />
      )}
    </div>
  );
}
