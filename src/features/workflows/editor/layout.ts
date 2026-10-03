import type { NodePosition, WorkflowDefinition } from '../types/workflow-definition';

export const LAYOUT = { columnWidth: 300, rowHeight: 140 } as const;

/**
 * Top-to-bottom tree layout for nodes without a stored position: depth from the trigger sets
 * the row, order within a depth sets the column. Nodes not reachable from the trigger are put
 * in a row below. Positions are display-only until the user moves a node, so loading and
 * saving an unedited definition changes nothing.
 */
export function autoLayout(definition: WorkflowDefinition): Map<string, NodePosition> {
  const children = new Map<string, string[]>();
  for (const e of definition.edges) children.set(e.from, [...(children.get(e.from) ?? []), e.to]);
  const trigger = definition.nodes.find((n) => n.kind === 'TRIGGER');

  const depth = new Map<string, number>();
  if (trigger) {
    const queue: [string, number][] = [[trigger.key, 0]];
    while (queue.length) {
      const [key, d] = queue.shift()!;
      if (depth.has(key)) continue;
      depth.set(key, d);
      for (const child of children.get(key) ?? []) queue.push([child, d + 1]);
    }
  }
  const maxDepth = Math.max(-1, ...depth.values());
  const rows = new Map<number, string[]>();
  for (const node of definition.nodes) {
    const d = depth.get(node.key) ?? maxDepth + 1;
    rows.set(d, [...(rows.get(d) ?? []), node.key]);
  }

  const positions = new Map<string, NodePosition>();
  for (const [d, keys] of rows) {
    keys.forEach((key, i) => {
      positions.set(key, {
        x: (i - (keys.length - 1) / 2) * LAYOUT.columnWidth,
        y: d * LAYOUT.rowHeight,
      });
    });
  }
  return positions;
}
