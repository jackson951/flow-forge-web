import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import type { NodeKind } from '@/types/api';
import { NODE_CATALOG } from '../types/node-catalog';

const groups: { kind: NodeKind; title: string }[] = [
  { kind: 'TRIGGER', title: 'Start when' },
  { kind: 'CONDITION', title: 'Branch' },
  { kind: 'ACTION', title: 'Then do' },
];

export function NodePalette() {
  return (
    <nav aria-label="Steps you can add" className="space-y-5 p-4">
      {groups.map(({ kind, title }) => (
        <section key={kind}>
          <h2 className="text-muted text-xs font-semibold tracking-wide uppercase">{title}</h2>
          <ul className="mt-2 space-y-1">
            {NODE_CATALOG.filter((n) => n.kind === kind).map((n) => (
              <li key={n.type}>
                {/* Part 05: drag onto canvas / click to add */}
                <button className="hover:bg-canvas flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm">
                  <NodeTypeIcon type={n.type} size="sm" />
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
