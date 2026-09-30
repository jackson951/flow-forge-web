import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { GitBranch, Play, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { FlowNodeData, NodeCategory } from '../../types/workflow-definition';

export type WorkflowFlowNode = Node<FlowNodeData, 'workflow'>;

const icons: Record<NodeCategory, typeof Zap> = {
  trigger: Play,
  action: Zap,
  condition: GitBranch,
};

/** One visual node on the canvas. Triggers have no input; conditions expose true/false outputs. */
export function WorkflowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const Icon = icons[data.category];
  return (
    <div
      className={cn(
        'bg-surface w-56 rounded-md border px-3 py-2.5 text-left',
        selected ? 'border-ember ring-ember/30 ring-2' : 'border-line',
      )}
    >
      {data.category !== 'trigger' && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center gap-2">
        <Icon className="text-muted size-4" aria-hidden />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <p className="text-muted mt-0.5 font-mono text-[11px]">{data.nodeType}</p>
      {data.category === 'condition' ? (
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
