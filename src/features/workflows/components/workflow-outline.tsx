import { CheckCircle2, CircleAlert, CircleDashed, GitBranch, Route, Workflow } from 'lucide-react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { cn } from '@/lib/cn';
import { configDisplayEntries } from '../editor/config-display';
import { executionDepths, maximumStepsPerRun } from '../editor/graph-metrics';
import type { NodeDefinition, WorkflowDefinition } from '../types/workflow-definition';

interface WorkflowOutlineProps {
  definition: WorkflowDefinition;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  labelFor: (type: string) => string;
  issueCount: (key: string) => number;
}

/** A compact, always-readable index of the graph for navigating large workflows. */
export function WorkflowOutline({
  definition,
  selectedKey,
  onSelect,
  labelFor,
  issueCount,
}: WorkflowOutlineProps) {
  const ordered = orderNodes(definition);
  const depths = executionDepths(definition);
  const maximumSteps = maximumStepsPerRun(definition);
  return (
    <nav aria-label="Workflow outline" className="flex h-full min-h-0 flex-col">
      <div className="border-line bg-canvas/60 grid grid-cols-3 gap-2 border-b p-3 text-center">
        <Metric icon={Workflow} value={definition.nodes.length} label="nodes" />
        <Metric
          icon={Route}
          value={maximumSteps}
          label="max / run"
          ariaLabel={`${maximumSteps} maximum steps per run`}
        />
        <Metric icon={GitBranch} value={definition.edges.length} label="connections" />
      </div>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {ordered.map((node) => {
          const issues = issueCount(node.key);
          const values = configDisplayEntries(node.config).length;
          const configured = values > 0 || node.type === 'manual.trigger';
          return (
            <li key={node.key}>
              <button
                type="button"
                aria-label={`Select step ${node.key}`}
                aria-current={selectedKey === node.key ? 'step' : undefined}
                onClick={() => onSelect(node.key)}
                className={cn(
                  'group flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition-colors',
                  selectedKey === node.key
                    ? 'border-primary bg-primary-soft'
                    : 'hover:border-line hover:bg-canvas border-transparent',
                )}
              >
                <span
                  className="text-muted mt-1 w-4 shrink-0 text-right font-mono text-[10px]"
                  title={
                    depths.has(node.key)
                      ? `Execution level ${depths.get(node.key)! + 1}`
                      : 'Not connected to the trigger'
                  }
                >
                  {depths.has(node.key) ? depths.get(node.key)! + 1 : '—'}
                </span>
                <NodeTypeIcon type={node.type} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">
                    {labelFor(node.type)}
                  </span>
                  <span className="text-muted block truncate font-mono text-[10px]">
                    {node.key}
                  </span>
                  <span className="text-muted mt-1 flex items-center gap-1 text-[10px]">
                    {issues ? (
                      <CircleAlert className="text-status-failed size-3" aria-hidden />
                    ) : configured ? (
                      <CheckCircle2 className="text-status-succeeded size-3" aria-hidden />
                    ) : (
                      <CircleDashed className="text-status-warning size-3" aria-hidden />
                    )}
                    {issues
                      ? `${issues} issue${issues === 1 ? '' : 's'}`
                      : configured
                        ? `${values} value${values === 1 ? '' : 's'} set`
                        : 'Needs setup'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {!ordered.length && (
          <li className="text-muted px-3 py-8 text-center text-sm">
            Add a trigger to begin your flow.
          </li>
        )}
      </ol>
    </nav>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  ariaLabel,
}: {
  icon: typeof Workflow;
  value: number;
  label: string;
  ariaLabel?: string;
}) {
  return (
    <div
      aria-label={ariaLabel ?? `${value} ${label}`}
      className="border-line bg-surface rounded-lg border px-2 py-2"
    >
      <span className="text-ink flex items-center justify-center gap-1 text-sm font-semibold">
        <Icon className="text-primary size-3.5" aria-hidden />
        {value}
      </span>
      <span className="text-muted block text-[10px] uppercase">{label}</span>
    </div>
  );
}

function orderNodes(definition: WorkflowDefinition): NodeDefinition[] {
  const depth = executionDepths(definition);
  return [...definition.nodes].sort((a, b) => {
    const ad = depth.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const bd = depth.get(b.key) ?? Number.MAX_SAFE_INTEGER;
    if (ad !== bd) return ad - bd;
    const ay = a.position?.y ?? 0;
    const by = b.position?.y ?? 0;
    if (ay !== by) return ay - by;
    return (a.position?.x ?? 0) - (b.position?.x ?? 0);
  });
}
