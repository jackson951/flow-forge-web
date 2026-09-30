import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { useCallback } from 'react';
import { nodeTypes } from '../nodes/node-types';
import type { WorkflowFlowNode } from '../nodes/workflow-node';

interface WorkflowCanvasProps {
  initialNodes?: WorkflowFlowNode[];
  initialEdges?: Edge[];
  onSelectNode?: (node: WorkflowFlowNode | null) => void;
}

/**
 * Canvas only handles layout and connections. Validation and execution
 * semantics belong to the backend engine.
 */
export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onSelectNode,
}: WorkflowCanvasProps) {
  const [nodes, , onNodesChange] = useNodesState<WorkflowFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onSelectionChange={({ nodes: selected }) =>
        onSelectNode?.((selected[0] as WorkflowFlowNode | undefined) ?? null)
      }
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
