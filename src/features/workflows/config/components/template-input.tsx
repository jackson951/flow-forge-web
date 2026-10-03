import { Braces } from 'lucide-react';
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { filterSuggestions, optionId, useConfigScope } from '../config-scope';
import { templateReferences, type ReferenceSuggestion } from '../references';
import { ReferenceProblems } from './reference-problems';
import { SuggestionList } from './suggestion-list';

interface TemplateInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  invalid?: boolean;
  onBlur?: () => void;
}

/** `{{` + what was typed so far, right before the caret. */
const OPEN_PLACEHOLDER = /\{\{\s*([A-Za-z0-9_.]*)$/;

const controlClass =
  'border-line bg-surface aria-[invalid=true]:border-status-failed w-full rounded-md border px-3 text-sm disabled:opacity-60';

/**
 * Text with `{{ reference }}` placeholders (Part 06, FR-06.4). Typing `{{` suggests the data
 * available at this step (upstream only); "Insert data" opens the same list. References that
 * will not resolve are listed under the field.
 */
export function TemplateInput({
  id,
  value,
  onChange,
  multiline = false,
  maxLength,
  placeholder,
  invalid,
  onBlur,
}: TemplateInputProps) {
  const { suggestions, readOnly } = useConfigScope();
  const listId = useId();
  const field = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const pendingCaret = useRef<number | null>(null);
  // null: closed; otherwise the typed query and where the `{{` starts (-1: "Insert data").
  const [open, setOpen] = useState<{ query: string; start: number } | null>(null);
  const [active, setActive] = useState(0);
  const items = useMemo(
    () => (open ? filterSuggestions(suggestions, open.query) : []),
    [open, suggestions],
  );

  // Put the caret after an inserted reference once the new value is rendered.
  useLayoutEffect(() => {
    if (pendingCaret.current === null || !field.current) return;
    field.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [value]);

  const detect = (text: string, at: number) => {
    caret.current = at;
    const match = OPEN_PLACEHOLDER.exec(text.slice(0, at));
    if (match) {
      setOpen({ query: match[1], start: at - match[0].length });
      setActive(0);
    } else if (open && open.start >= 0) setOpen(null);
  };

  const pick = (item: ReferenceSuggestion) => {
    const at = caret.current ?? value.length;
    const start = open && open.start >= 0 ? open.start : at;
    const inserted = `{{ ${item.ref} }}`;
    pendingCaret.current = start + inserted.length;
    onChange(value.slice(0, start) + inserted + value.slice(at));
    setOpen(null);
    field.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (items.length ? (i + step + items.length) % items.length : 0));
    } else if ((event.key === 'Enter' || event.key === 'Tab') && items[active]) {
      event.preventDefault();
      pick(items[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(null);
    }
  };

  const common = {
    id,
    ref: field,
    value,
    placeholder,
    disabled: readOnly,
    'aria-invalid': invalid || undefined,
    'aria-describedby': `${id}-msg ${id}-refs`,
    role: 'combobox' as const,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': !!open,
    'aria-controls': open ? listId : undefined,
    'aria-activedescendant': open && items[active] ? optionId(listId, active) : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
    },
    onKeyDown,
    onSelect: (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      caret.current = e.currentTarget.selectionStart;
    },
    onBlur: () => {
      setOpen(null);
      onBlur?.();
    },
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        {multiline ? (
          <textarea {...common} rows={4} className={cn(controlClass, 'py-2 pr-10')} />
        ) : (
          <input {...common} type="text" className={cn(controlClass, 'h-10 pr-10')} />
        )}
        {!readOnly && (
          <button
            type="button"
            title="Insert data from earlier steps"
            aria-label="Insert data"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              // Not typing in the field yet: insert at the end rather than where focus lands.
              if (document.activeElement !== field.current) {
                field.current?.focus();
                field.current?.setSelectionRange(value.length, value.length);
                caret.current = value.length;
              }
              setOpen(open ? null : { query: '', start: -1 });
              setActive(0);
            }}
            className="text-muted hover:text-primary absolute top-2 right-2 rounded p-1"
          >
            <Braces className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <ReferenceProblems id={`${id}-refs`} refs={templateReferences(value)} />
        {maxLength !== undefined && (
          <span
            className={cn(
              'text-muted ml-auto shrink-0 text-xs tabular-nums',
              value.length > maxLength && 'text-status-failed font-medium',
            )}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {open && (
        <SuggestionList
          id={listId}
          anchor={field}
          items={items}
          active={active}
          onHover={setActive}
          onPick={pick}
          onDismiss={() => setOpen(null)}
          empty={
            suggestions.length
              ? 'No matching data'
              : 'No data yet — connect this step below an earlier step to use its output'
          }
        />
      )}
    </div>
  );
}
