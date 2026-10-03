import { ArrowRight, Link2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { Button, Select } from '@/components/ui';
import type { EditorAction } from '../editor/editor-reducer';
import { canConnect } from '../editor/graph-rules';
import { edgeId } from '../editor/mapping';
import type { NodeDefinition, WorkflowDefinition } from '../types/workflow-definition';

interface NextStepsProps {
  node: NodeDefinition;
  definition: WorkflowDefinition;
  labelFor: (type: string) => string;
  dispatch: (action: EditorAction) => void;
  readOnly: boolean;
}

/**
 * Keyboard-friendly alternative to drawing edges on the canvas (Part 12, FR-12.5): the step's
 * outgoing connections (removable) and a "Connect to" menu offering only targets the graph
 * rules allow — with the branch for conditions.
 */
export function NextSteps({ node, definition, labelFor, dispatch, readOnly }: NextStepsProps) {
  const isCondition = node.kind === 'CONDITION';
  const outgoing = definition.edges.filter((e) => e.from === node.key);
  const freeBranches = (['true', 'false'] as const).filter(
    (b) => !outgoing.some((e) => e.branch === b),
  );
  const [branch, setBranch] = useState<'true' | 'false'>(freeBranches[0] ?? 'true');
  const activeBranch = isCondition
    ? freeBranches.includes(branch)
      ? branch
      : freeBranches[0]
    : undefined;
  const candidates = definition.nodes.filter(
    (n) =>
      n.key !== node.key &&
      (!isCondition || activeBranch) &&
      canConnect(definition, node.key, n.key, activeBranch).ok,
  );
  const [target, setTarget] = useState('');
  const chosen = candidates.some((c) => c.key === target) ? target : '';
  const name = (key: string) => {
    const n = definition.nodes.find((x) => x.key === key);
    return n ? `${labelFor(n.type)} (${key})` : key;
  };

  return (
    <section aria-labelledby="next-steps-title">
      <h3 id="next-steps-title" className="flex items-center gap-1.5 text-sm font-semibold">
        <Link2 className="text-muted size-4" aria-hidden />
        Next steps
      </h3>
      {outgoing.length === 0 ? (
        <p className="text-muted mt-1 text-sm">Nothing runs after this step yet.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {outgoing.map((e) => (
            <li key={edgeId(e)} className="flex items-center gap-2 text-sm">
              <ArrowRight className="text-muted size-3.5 shrink-0" aria-hidden />
              {e.branch && (
                <span
                  className={
                    e.branch === 'true'
                      ? 'text-status-succeeded text-xs font-semibold'
                      : 'text-status-failed text-xs font-semibold'
                  }
                >
                  {e.branch}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{name(e.to)}</span>
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Disconnect ${e.to}`}
                  title="Remove this connection"
                  onClick={() => dispatch({ type: 'removeEdges', ids: [edgeId(e)] })}
                  className="text-muted hover:text-status-failed rounded p-1"
                >
                  <Unlink className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (!isCondition || freeBranches.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isCondition && (
            <Select
              aria-label="Branch"
              value={activeBranch}
              onChange={(e) => setBranch(e.target.value as 'true' | 'false')}
              className="h-9 w-24 text-xs"
            >
              {freeBranches.map((b) => (
                <option key={b} value={b}>
                  if {b}
                </option>
              ))}
            </Select>
          )}
          <Select
            aria-label="Connect to"
            value={chosen}
            onChange={(e) => setTarget(e.target.value)}
            className="h-9 min-w-0 flex-1 text-xs"
            disabled={!candidates.length}
          >
            <option value="">
              {candidates.length ? 'Connect to…' : 'No step can follow here'}
            </option>
            {candidates.map((c) => (
              <option key={c.key} value={c.key}>
                {name(c.key)}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!chosen}
            onClick={() => {
              dispatch({ type: 'connect', from: node.key, to: chosen, branch: activeBranch });
              setTarget('');
            }}
          >
            Connect
          </Button>
        </div>
      )}
    </section>
  );
}
