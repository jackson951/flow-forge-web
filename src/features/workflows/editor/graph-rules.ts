import type { EdgeDefinition, WorkflowDefinition } from '../types/workflow-definition';

/**
 * Connection rules, the same as the backend's graph validator
 * (flowforge-api/src/engine/validation/graph-validator.ts), checked while the user connects so
 * an invalid graph cannot be drawn. The backend remains the authority (Part 07 shows its issues).
 */
export type ConnectResult = { ok: true; edge: EdgeDefinition } | { ok: false; reason: string };

export function canConnect(
  definition: WorkflowDefinition,
  from: string,
  to: string,
  branch?: 'true' | 'false' | null,
): ConnectResult {
  const source = definition.nodes.find((n) => n.key === from);
  const target = definition.nodes.find((n) => n.key === to);
  if (!source || !target) return { ok: false, reason: 'Both steps must exist' };
  if (from === to) return { ok: false, reason: 'A step cannot connect to itself' };
  if (target.kind === 'TRIGGER') return { ok: false, reason: 'Nothing can lead into the trigger' };
  if (definition.edges.some((e) => e.from === from && e.to === to)) {
    return { ok: false, reason: 'These steps are already connected' };
  }
  if (definition.edges.some((e) => e.to === to)) {
    return {
      ok: false,
      reason: 'A step can only follow one other step (joins are not supported)',
    };
  }
  if (source.kind === 'CONDITION') {
    if (branch !== 'true' && branch !== 'false') {
      return { ok: false, reason: 'Connect from the condition’s “true” or “false” output' };
    }
    if (definition.edges.some((e) => e.from === from && e.branch === branch)) {
      return { ok: false, reason: `The condition already has a “${branch}” step` };
    }
  }
  if (createsCycle(definition.edges, from, to)) {
    return { ok: false, reason: 'That connection would create a loop' };
  }
  const edge: EdgeDefinition =
    source.kind === 'CONDITION' && branch ? { from, to, branch } : { from, to };
  return { ok: true, edge };
}

/** True if `to` already reaches `from`, so adding from → to closes a loop. */
function createsCycle(edges: EdgeDefinition[], from: string, to: string): boolean {
  const children = new Map<string, string[]>();
  for (const e of edges) children.set(e.from, [...(children.get(e.from) ?? []), e.to]);
  const stack = [to];
  const seen = new Set<string>();
  while (stack.length) {
    const key = stack.pop()!;
    if (key === from) return true;
    if (seen.has(key)) continue;
    seen.add(key);
    stack.push(...(children.get(key) ?? []));
  }
  return false;
}
