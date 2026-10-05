import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckCircle2, CircleAlert, CircleDashed, Settings2, Zap } from 'lucide-react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { FlowNode } from '../../editor/mapping';
import {
  compactConfigValue,
  configDisplayEntries,
  configHighlights,
} from '../../editor/config-display';

export type WorkflowFlowNode = FlowNode;

const handle = 'size-3! border-2! border-white! bg-primary!';

/**
 * One step on the canvas: type icon, name, key and a validation marker. Flow runs top to
 * bottom: the input is on top (not on triggers), outputs at the bottom — one for actions,
 * "true" and "false" for conditions.
 */
export function WorkflowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const issues = data.issueCount ?? 0;
  const settings = configDisplayEntries(data.config);
  const highlights = configHighlights(data.nodeType, data.config);
  const configured = settings.length > 0 || data.nodeType === 'manual.trigger';
  return (
    <div
      className={cn(
        'bg-surface relative w-72 overflow-visible rounded-2xl border text-left shadow-sm transition-all',
        selected
          ? 'border-primary ring-primary/25 -translate-y-0.5 shadow-lg ring-2'
          : 'border-line hover:-translate-y-0.5 hover:shadow-md',
        issues > 0 && !selected && 'border-status-failed/60',
        data.stepStatus === 'SKIPPED' && 'opacity-50',
        data.stepStatus === 'FAILED' && !selected && 'border-status-failed',
      )}
    >
      {data.kind !== 'TRIGGER' && (
        <Handle type="target" position={Position.Top} className={handle} />
      )}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <NodeTypeIcon type={data.nodeType} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{data.label}</p>
          <p className="text-muted truncate font-mono text-[11px]">{data.key}</p>
        </div>
        {data.kind === 'TRIGGER' && (
          <span className="text-primary inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase">
            <Zap className="size-3" aria-hidden />
            Trigger
          </span>
        )}
        {issues > 0 && (
          <span
            className="text-status-failed inline-flex items-center gap-0.5 text-xs font-medium"
            title={`${issues} issue${issues === 1 ? '' : 's'}`}
          >
            <CircleAlert className="size-4" aria-hidden />
            <span className="sr-only">
              {issues} issue{issues === 1 ? '' : 's'}
            </span>
            {issues}
          </span>
        )}
      </div>
      <div className="border-line border-t px-3.5 py-2.5">
        {highlights.length > 0 ? (
          <dl className="space-y-1.5">
            {highlights.map((item) => (
              <div key={item.path} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-xs">
                <dt className="text-muted truncate">{item.label}</dt>
                <dd
                  className={cn(
                    'text-ink truncate text-right font-medium',
                    item.template && 'text-primary font-mono text-[11px]',
                  )}
                  title={item.value}
                >
                  {compactConfigValue(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted flex items-center gap-1.5 text-xs">
            {configured ? (
              <CheckCircle2 className="text-status-succeeded size-3.5" aria-hidden />
            ) : (
              <CircleDashed className="text-status-warning size-3.5" aria-hidden />
            )}
            {configured ? 'No settings required' : 'Choose this step’s settings'}
          </p>
        )}
      </div>
      <div className="border-line bg-canvas/60 text-muted flex items-center justify-between rounded-b-2xl border-t px-3.5 py-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1">
          <Settings2 className="size-3" aria-hidden />
          {settings.length} value{settings.length === 1 ? '' : 's'} set
        </span>
        <span>{data.kind === 'CONDITION' ? '2 branches' : data.kind.toLowerCase()}</span>
      </div>
      {data.stepStatus && (
        <div className="absolute -top-3 right-3">
          <StatusBadge status={data.stepStatus} />
        </div>
      )}
      {data.kind === 'CONDITION' ? (
        <>
          <span className="text-status-succeeded absolute -bottom-5 left-[28%] -translate-x-1/2 text-[10px] font-semibold">
            true
          </span>
          <span className="text-status-failed absolute -bottom-5 left-[72%] -translate-x-1/2 text-[10px] font-semibold">
            false
          </span>
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            style={{ left: '28%' }}
            className={cn(handle, 'bg-status-succeeded!')}
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            style={{ left: '72%' }}
            className={cn(handle, 'bg-status-failed!')}
          />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className={handle} />
      )}
    </div>
  );
}
