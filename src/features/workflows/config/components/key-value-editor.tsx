import { Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useConfigScope } from '../config-scope';
import { TemplateInput } from './template-input';

/** Name → template value pairs (query, headers, form fields); at most 50. */
export function KeyValueEditor({
  id,
  legend,
  value,
  onChange,
  error,
  warnFor,
  plain = false,
}: {
  id: string;
  legend: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  error?: string;
  warnFor?: (name: string) => string | null;
  /** Plain values (no {{ }} data): http.poll requests have no upstream data. */
  plain?: boolean;
}) {
  const { readOnly } = useConfigScope();
  // Rows are kept locally so a half-typed (empty-name) row is not lost.
  const [rows, setRows] = useState(() => Object.entries(value).map(([k, v]) => ({ k, v })));
  const commit = (next: { k: string; v: string }[]) => {
    setRows(next);
    onChange(Object.fromEntries(next.filter((r) => r.k.trim()).map((r) => [r.k.trim(), r.v])));
  };
  const warnings = warnFor ? rows.map((r) => warnFor(r.k)).filter(Boolean) : [];
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-start gap-2"
        >
          <Input
            aria-label={`${legend} ${i + 1} name`}
            value={r.k}
            disabled={readOnly}
            onChange={(e) =>
              commit(rows.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))
            }
          />
          <div>
            <label htmlFor={`${id}-${i}`} className="sr-only">
              {`${legend} ${i + 1} value`}
            </label>
            {plain ? (
              <Input
                id={`${id}-${i}`}
                value={r.v}
                disabled={readOnly}
                onChange={(e) =>
                  commit(rows.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))
                }
              />
            ) : (
              <TemplateInput
                id={`${id}-${i}`}
                value={r.v}
                onChange={(v) => commit(rows.map((x, j) => (j === i ? { ...x, v } : x)))}
              />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remove ${legend.toLowerCase()} ${i + 1}`}
            disabled={readOnly}
            onClick={() => commit(rows.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      {rows.length < 50 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={readOnly}
          onClick={() => setRows([...rows, { k: '', v: '' }])}
        >
          <Plus className="size-4" aria-hidden />
          Add {legend.toLowerCase().replace(/s$/, '')}
        </Button>
      )}
      {warnings.map((w) => (
        <p key={w} className="flex items-start gap-1.5 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {w}
        </p>
      ))}
      {error && (
        <p role="alert" className="text-status-failed text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}
