import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CircleAlert, Zap } from 'lucide-react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { cn } from '@/lib/cn';
import type { FlowNode } from '../../editor/mapping';

export type WorkflowFlowNode = FlowNode;

const handle = 'size-3! border-2! border-white! bg-primary!';

/**
 * One step on the canvas: type icon, name, key and a validation marker. Flow runs top to
 * bottom: the input is on top (not on triggers), outputs at the bottom — one for actions,
 * "true" and "false" for conditions.
 */
export function WorkflowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const issues = data.issueCount ?? 0;
  return (
    <div
      className={cn(
        'bg-surface relative w-64 rounded-xl border px-3 py-2.5 text-left shadow-sm transition-shadow',
        selected ? 'border-primary ring-primary/30 ring-2' : 'border-line hover:shadow-md',
        issues > 0 && !selected && 'border-status-failed/60',
      )}
    >
      {data.kind !== 'TRIGGER' && (
        <Handle type="target" position={Position.Top} className={handle} />
      )}
      <div className="flex items-center gap-2.5">
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
