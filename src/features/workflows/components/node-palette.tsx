import { Search, Split, Zap, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { NodeKind, NodeTypeInfo } from '@/types/api';
import { useNodeTypes } from '../api/workflows.api';
import { NODE_CATALOG } from '../types/node-catalog';
import { PALETTE_MIME } from './canvas/workflow-canvas';

const GROUPS: { kind: NodeKind; title: string; icon: LucideIcon }[] = [
  { kind: 'TRIGGER', title: 'Triggers', icon: Zap },
  { kind: 'CONDITION', title: 'Logic', icon: Split },
  { kind: 'ACTION', title: 'Actions', icon: Zap },
];

const describe = (type: string) => NODE_CATALOG.find((n) => n.type === type)?.description;

interface NodePaletteProps {
  hasTrigger: boolean;
  onAdd: (type: NodeTypeInfo) => void;
  disabled?: boolean;
}

/**
 * Steps you can add, from GET /node-types (Part 05, FR-05.2): only types this server knows;
 * types it cannot run (e.g. AI without a provider) are shown disabled with the reason.
 * Click adds after the selected step; drag drops at a position on the canvas.
 */
export function NodePalette({ hasTrigger, onAdd, disabled = false }: NodePaletteProps) {
  const nodeTypes = useNodeTypes();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (nodeTypes.data ?? []).filter(
      (t) => !q || t.displayName.toLowerCase().includes(q) || t.type.toLowerCase().includes(q),
    );
  }, [nodeTypes.data, query]);

  const unavailable = (t: NodeTypeInfo): string | undefined =>
    disabled
      ? 'This workflow is read-only'
      : (t.unavailableReason ??
        (t.kind === 'TRIGGER' && hasTrigger
          ? 'A workflow has one trigger; remove the current one first'
          : undefined));

  const onDragStart = (event: DragEvent, t: NodeTypeInfo) => {
    event.dataTransfer.setData(PALETTE_MIME, JSON.stringify({ type: t.type, kind: t.kind }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <nav aria-label="Steps you can add" className="flex h-full flex-col">
      <div className="border-line border-b p-3">
        <label className="relative block">
          <span className="sr-only">Search steps</span>
          <Search
            className="text-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search steps…"
            className="border-line bg-surface h-9 w-full rounded-lg border pr-3 pl-8 text-sm"
          />
        </label>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-3">
        {nodeTypes.isPending && (
          <div className="space-y-2" aria-label="Loading steps">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}
        {nodeTypes.isError && (
          <p role="alert" className="text-status-failed text-sm">
            Could not load the available steps. {nodeTypes.error.message}
          </p>
        )}
        {GROUPS.map(({ kind, title, icon: GroupIcon }) => {
          const items = filtered.filter((t) => t.kind === kind);
          if (!items.length) return null;
          return (
            <section key={kind}>
              <h2 className="text-muted flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <GroupIcon className="size-3.5" aria-hidden />
                {title}
              </h2>
              <ul className="mt-2 space-y-1">
                {items.map((t) => {
                  const reason = unavailable(t);
                  return (
                    <li key={t.type}>
                      <button
                        type="button"
                        draggable={!reason}
                        onDragStart={(e) => onDragStart(e, t)}
                        onClick={() => onAdd(t)}
                        disabled={!!reason}
                        title={reason ?? describe(t.type)}
                        aria-describedby={reason ? `${t.type}-reason` : undefined}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm',
                          reason ? 'cursor-not-allowed opacity-50' : 'hover:bg-canvas cursor-grab',
                        )}
                      >
                        <NodeTypeIcon type={t.type} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate">{t.displayName}</span>
                          {reason && (
                            <span
                              id={`${t.type}-reason`}
                              className="text-muted block truncate text-xs"
                            >
                              {reason}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {nodeTypes.isSuccess && !filtered.length && (
          <p className="text-muted text-sm">No step matches “{query}”.</p>
        )}
      </div>
    </nav>
  );
}
