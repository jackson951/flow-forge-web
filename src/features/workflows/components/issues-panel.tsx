import { ChevronRight, CircleAlert, CircleCheckBig, Network, TriangleAlert, X } from 'lucide-react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { cn } from '@/lib/cn';
import type { ValidationIssue } from '@/types/api';
import type { WorkflowDefinition } from '../types/workflow-definition';

interface IssuesPanelProps {
  issues: ValidationIssue[];
  definition: WorkflowDefinition;
  labelFor: (type: string) => string;
  onSelectNode: (key: string) => void;
  onClose: () => void;
  /** There are edits since these issues were computed. */
  stale: boolean;
}

/**
 * Validation issues from the last save or publish attempt (Part 07, FR-07.3): workflow-level
 * issues (no trigger, cycle, unreachable step, …) first, then per step; a step's issues select
 * it on the canvas.
 */
export function IssuesPanel({
  issues,
  definition,
  labelFor,
  onSelectNode,
  onClose,
  stale,
}: IssuesPanelProps) {
  const nodes = new Map(definition.nodes.map((n) => [n.key, n]));
  const graph = issues.filter((i) => !i.nodeKey || !nodes.has(i.nodeKey));
  const byNode = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    if (issue.nodeKey && nodes.has(issue.nodeKey)) {
      byNode.set(issue.nodeKey, [...(byNode.get(issue.nodeKey) ?? []), issue]);
    }
  }

  return (
    <section
      aria-label="Validation issues"
      className="border-line bg-surface flex max-h-72 flex-col border-t"
    >
      <header className="border-line flex items-center gap-2 border-b px-4 py-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          {issues.length ? (
            <CircleAlert className="text-status-failed size-4" aria-hidden />
          ) : (
            <CircleCheckBig className="text-status-succeeded size-4" aria-hidden />
          )}
          {issues.length ? `${issues.length} issue${issues.length === 1 ? '' : 's'}` : 'No issues'}
        </h2>
        {stale && (
          <span className="text-muted text-xs">
            · from the last save; changes since are not checked yet
          </span>
        )}
        <button
          type="button"
          aria-label="Close issues"
          onClick={onClose}
          className="text-muted hover:text-ink ml-auto rounded p-1"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <div className="overflow-y-auto px-2 py-2">
        {!issues.length && (
          <p className="text-muted px-2 py-1 text-sm">
            The saved draft passes every check and can be published.
          </p>
        )}
        {graph.length > 0 && (
          <div className="mb-2">
            <h3 className="text-muted flex items-center gap-1.5 px-2 py-1 text-xs font-semibold tracking-wide uppercase">
              <Network className="size-3.5" aria-hidden />
              Workflow
            </h3>
            <ul>
              {graph.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 px-2 py-1 text-sm">
                  <Severity issue={issue} />
                  <IssueText issue={issue} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {[...byNode.entries()].map(([key, list]) => {
          const node = nodes.get(key)!;
          return (
            <div key={key} className="mb-1">
              <button
                type="button"
                onClick={() => onSelectNode(key)}
                className="hover:bg-canvas flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left"
                aria-label={`Show step ${key}: ${list.length} issue${list.length === 1 ? '' : 's'}`}
              >
                <NodeTypeIcon type={node.type} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {labelFor(node.type)}
                    <span className="text-muted font-mono text-xs font-normal">{key}</span>
                  </span>
                  <ul className="mt-0.5 space-y-0.5">
                    {list.map((issue, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm">
                        <Severity issue={issue} />
                        <IssueText issue={issue} />
                      </li>
                    ))}
                  </ul>
                </span>
                <ChevronRight className="text-muted mt-1 size-4 shrink-0" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Severity({ issue }: { issue: ValidationIssue }) {
  return issue.severity === 'error' ? (
    <CircleAlert className="text-status-failed mt-0.5 size-3.5 shrink-0" aria-label="Error" />
  ) : (
    <TriangleAlert className="text-status-warning mt-0.5 size-3.5 shrink-0" aria-label="Warning" />
  );
}

function IssueText({ issue }: { issue: ValidationIssue }) {
  return (
    <span className={cn('min-w-0 break-words')}>
      {issue.message}
      {issue.edge && (
        <span className="text-muted font-mono text-xs">
          {' '}
          ({issue.edge.from} → {issue.edge.to})
        </span>
      )}
      {issue.path && <span className="text-muted font-mono text-xs"> ({issue.path})</span>}
      <span className="text-muted ml-1 font-mono text-[10px] uppercase">{issue.code}</span>
    </span>
  );
}
