import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type IsValidConnection,
  type NodeChange,
} from '@xyflow/react';
import { useCallback, useMemo, useState, type DragEvent } from 'react';
import type { NodeKind } from '@/types/api';
import type { EditorAction } from '../../editor/editor-reducer';
import { canConnect } from '../../editor/graph-rules';
import { toFlow, type FlowEdge, type FlowNode } from '../../editor/mapping';
import type { WorkflowDefinition } from '../../types/workflow-definition';
import { nodeTypes } from '../nodes/node-types';

/** MIME type for dragging a node type from the palette onto the canvas. */
export const PALETTE_MIME = 'application/x-flowforge-node';

interface WorkflowCanvasProps {
  definition: WorkflowDefinition;
  dispatch: (action: EditorAction) => void;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  labelFor: (type: string) => string;
  issueCount: (key: string) => number;
  readOnly?: boolean;
}

/**
 * Renders the definition with React Flow (Part 05). The definition stays the source of truth:
 * React Flow keeps only the in-progress drag position; every real change (move on drop,
 * connect, delete, add by drop) is dispatched to the editor reducer, which applies the rules.
 */
export function WorkflowCanvas({
  definition,
  dispatch,
  selectedKey,
  onSelect,
  labelFor,
  issueCount,
  readOnly = false,
}: WorkflowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const flow = useMemo(
    () => toFlow(definition, { labelFor, issueCount, readOnly }),
    [definition, labelFor, issueCount, readOnly],
  );
  // Local copy for React Flow (live drag positions, measured sizes). Re-derived during render
  // whenever the reducer's definition or the selection changes — the definition always wins.
  const [local, setLocal] = useState({ flow, selectedKey, nodes: flow.nodes });
  if (local.flow !== flow || local.selectedKey !== selectedKey) {
    const measured = new Map(local.nodes.map((n) => [n.id, n.measured]));
    setLocal({
      flow,
      selectedKey,
      nodes: flow.nodes.map((n) => ({
        ...n,
        measured: measured.get(n.id),
        selected: n.id === selectedKey,
      })),
    });
  }
  const nodes = local.nodes;
  const edges = flow.edges;

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      // Live drag and measurements are local; deletions go through the reducer (onNodesDelete).
      setLocal((current) => ({
        ...current,
        nodes: applyNodeChanges(
          changes.filter((c) => c.type === 'position' || c.type === 'dimensions'),
          current.nodes,
        ),
      }));
      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          dispatch({ type: 'moveNode', key: change.id, position: change.position });
        }
        if (change.type === 'select' && change.selected) onSelect(change.id);
      }
    },
    [dispatch, onSelect],
  );

  const isValidConnection: IsValidConnection = useCallback(
    (c) =>
      canConnect(
        definition,
        c.source,
        c.target,
        (c.sourceHandle as 'true' | 'false' | null) ?? undefined,
      ).ok,
    [definition],
  );

  const onConnect = useCallback(
    (c: Connection) =>
      dispatch({
        type: 'connect',
        from: c.source,
        to: c.target,
        branch: (c.sourceHandle as 'true' | 'false' | null) ?? undefined,
      }),
    [dispatch],
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(PALETTE_MIME);
      if (!raw || readOnly) return;
      const { type, kind } = JSON.parse(raw) as { type: string; kind: NodeKind };
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      dispatch({ type: 'addNode', nodeType: type, kind, position });
    },
    [dispatch, readOnly, screenToFlowPosition],
  );

  return (
    <ReactFlow<FlowNode, FlowEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      // One callback for nodes and edges deleted together, so it is a single undo step.
      onDelete={({ nodes: gone, edges: goneEdges }) =>
        dispatch({
          type: 'removeNodes',
          keys: gone.map((n) => n.id),
          edgeIds: goneEdges.map((e) => e.id),
        })
      }
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onPaneClick={() => onSelect(null)}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = readOnly ? 'none' : 'move';
      }}
      onDrop={onDrop}
      deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable
      defaultEdgeOptions={{ type: 'smoothstep' }}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
      proOptions={{ hideAttribution: true }}
      aria-label="Workflow canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable className="hidden! md:block!" />
    </ReactFlow>
  );
}
