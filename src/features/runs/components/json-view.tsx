import { Braces, Check, ChevronRight, Copy } from 'lucide-react';
import { useState } from 'react';

interface JsonViewProps {
  label: string;
  value: unknown;
  /** Open by default (e.g. the failed step's input). */
  defaultOpen?: boolean;
  empty?: string;
}

/** Collapsible, copyable JSON (step input/output, trigger input). */
export function JsonView({
  label,
  value,
  defaultOpen = false,
  empty = 'Nothing recorded',
}: JsonViewProps) {
  const [copied, setCopied] = useState(false);
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === 'object' && Object.keys(value as object).length === 0);
  const text = isEmpty ? '' : JSON.stringify(value, null, 2);

  return (
    <details open={defaultOpen} className="group border-line rounded-lg border">
      <summary className="hover:bg-canvas flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm">
        <ChevronRight
          className="text-muted size-4 transition-transform group-open:rotate-90"
          aria-hidden
        />
        <Braces className="text-muted size-4" aria-hidden />
        <span className="font-medium">{label}</span>
        {isEmpty && <span className="text-muted text-xs">— {empty}</span>}
      </summary>
      {!isEmpty && (
        <div className="border-line relative border-t">
          <button
            type="button"
            aria-label={`Copy ${label.toLowerCase()}`}
            title="Copy"
            onClick={() => {
              void navigator.clipboard?.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1_500);
              });
            }}
            className="text-muted hover:text-ink bg-surface absolute top-2 right-2 rounded p-1"
          >
            {copied ? (
              <Check className="text-status-succeeded size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
          </button>
          <pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed">{text}</pre>
        </div>
      )}
    </details>
  );
}
