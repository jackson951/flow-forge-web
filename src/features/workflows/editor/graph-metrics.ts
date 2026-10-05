import type { WorkflowDefinition } from '../types/workflow-definition';

/** Execution level from the trigger. Alternative condition branches share the same level. */
export function executionDepths(definition: WorkflowDefinition): Map<string, number> {
  const trigger = definition.nodes.find((node) => node.kind === 'TRIGGER');
  const depths = new Map<string, number>();
  if (!trigger) return depths;

  const queue: Array<[string, number]> = [[trigger.key, 0]];
  while (queue.length) {
    const [key, depth] = queue.shift()!;
    if (depths.has(key)) continue;
    depths.set(key, depth);
    for (const edge of definition.edges.filter((item) => item.from === key)) {
      queue.push([edge.to, depth + 1]);
    }
  }
  return depths;
}

/** Longest executable trigger-to-leaf path; mutually exclusive branches are not added together. */
export function maximumStepsPerRun(definition: WorkflowDefinition): number {
  const trigger = definition.nodes.find((node) => node.kind === 'TRIGGER');
  if (!trigger) return 0;
  const children = new Map<string, string[]>();
  for (const edge of definition.edges) {
    children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
  }
  const memo = new Map<string, number>();
  const visit = (key: string, visiting: Set<string>): number => {
    const known = memo.get(key);
    if (known !== undefined) return known;
    if (visiting.has(key)) return 0;
    const nextVisiting = new Set(visiting).add(key);
    const length =
      1 + Math.max(0, ...(children.get(key) ?? []).map((child) => visit(child, nextVisiting)));
    memo.set(key, length);
    return length;
  };
  return visit(trigger.key, new Set());
}
