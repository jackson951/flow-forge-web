import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { cn } from '@/lib/cn';
import type { FlowNodeData } from '../../types/workflow-definition';

export type WorkflowFlowNode = Node<FlowNodeData, 'workflow'>;

/** One visual node on the canvas. Triggers have no input; conditions expose true/false outputs. */
export function WorkflowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  return (
    <div
      className={cn(
        'bg-surface w-60 rounded-xl border px-3 py-2.5 text-left shadow-sm',
        selected ? 'border-primary ring-primary/30 ring-2' : 'border-line',
      )}
    >
      {data.kind !== 'TRIGGER' && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center gap-2.5">
        <NodeTypeIcon type={data.nodeType} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{data.label}</p>
          <p className="text-muted truncate font-mono text-[11px]">{data.nodeType}</p>
        </div>
      </div>
      {data.kind === 'CONDITION' ? (
        <>
          <Handle id="true" type="source" position={Position.Right} style={{ top: '35%' }} />
          <Handle id="false" type="source" position={Position.Right} style={{ top: '70%' }} />
        </>
      ) : (
        <Handle type="source" position={Position.Right} />
      )}
    </div>
  );
}
