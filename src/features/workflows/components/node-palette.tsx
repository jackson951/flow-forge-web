import type { NodeCategory } from '../types/workflow-definition';
import { NODE_CATALOG } from '../types/node-catalog';

const groups: { category: NodeCategory; title: string }[] = [
  { category: 'trigger', title: 'Start when' },
  { category: 'action', title: 'Then do' },
  { category: 'condition', title: 'Branch' },
];

export function NodePalette() {
  return (
    <nav aria-label="Steps you can add" className="space-y-5 p-4">
      {groups.map(({ category, title }) => (
        <section key={category}>
          <h2 className="text-sm font-semibold">{title}</h2>
          <ul className="mt-2 space-y-1">
            {NODE_CATALOG.filter((n) => n.category === category).map((n) => (
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
