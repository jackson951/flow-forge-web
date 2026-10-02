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
          <h2 className="text-sm font-semibold">{title}</h2>
          <ul className="mt-2 space-y-1">
            {NODE_CATALOG.filter((n) => n.kind === kind).map((n) => (
              <li key={n.type}>
                {/* TODO: drag onto canvas / click to add */}
                <button className="hover:bg-canvas w-full rounded-md px-2 py-1.5 text-left text-sm">
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
