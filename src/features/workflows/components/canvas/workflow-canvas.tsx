import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Panel as FlowPanel,
  ReactFlow,
  useReactFlow,
  type Connection,
  type IsValidConnection,
  type NodeChange,
} from '@xyflow/react';
import { Focus, LayoutDashboard, MousePointer2, Workflow } from 'lucide-react';
import { useCallback, useMemo, useState, type DragEvent } from 'react';
import type { NodeKind, StepStatus } from '@/types/api';
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
  /** Prevent the initial overview from shrinking a large graph below a readable scale. */
  initialFitMinZoom?: number;
  /** Expand legacy tight coordinates for display without changing the saved workflow. */
  spacious?: boolean;
  /** Run view: step statuses overlaid on the nodes (Part 08). */
  statusFor?: (key: string) => StepStatus | undefined;
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
  initialFitMinZoom,
  spacious = false,
  statusFor,
}: WorkflowCanvasProps) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const flow = useMemo(
    () => toFlow(definition, { labelFor, issueCount, readOnly, spacious, statusFor }),
    [definition, labelFor, issueCount, readOnly, spacious, statusFor],
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
  const selected = definition.nodes.find((node) => node.key === selectedKey);

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
        // Drag end (dragging: false) or a keyboard move (arrow keys on a focused node: no
        // dragging flag) is a real move; in-progress drag updates stay local.
        if (change.type === 'position' && change.dragging !== true && change.position) {
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
      defaultEdgeOptions={{
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { strokeWidth: 1.8 },
        labelStyle: { fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: 'var(--color-surface)', fillOpacity: 0.95 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
      }}
      connectionLineStyle={{ stroke: 'var(--color-primary)', strokeWidth: 2 }}
      minZoom={0.08}
      fitView
      fitViewOptions={{ padding: 0.3, minZoom: initialFitMinZoom, maxZoom: 1.1 }}
      proOptions={{ hideAttribution: true }}
      aria-label="Workflow canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
      <FlowPanel position="top-left" className="m-3!">
        <div className="border-line bg-surface/95 flex flex-wrap items-center gap-1.5 rounded-xl border p-1.5 shadow-sm backdrop-blur">
          <span className="text-muted flex max-w-56 items-center gap-1.5 border-r px-2 text-xs">
            {selected ? (
              <>
                <MousePointer2 className="text-primary size-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  <strong className="text-ink">{labelFor(selected.type)}</strong> · {selected.key}
                </span>
              </>
            ) : (
              <>
                <Workflow className="text-primary size-3.5" aria-hidden />
                {nodes.length} node{nodes.length === 1 ? '' : 's'} · {edges.length} connection
                {edges.length === 1 ? '' : 's'}
              </>
            )}
          </span>
          {!readOnly && (
            <button
              type="button"
              disabled={!nodes.length}
              onClick={() => {
                dispatch({ type: 'autoLayout' });
                setTimeout(() => void fitView({ padding: 0.25, duration: 350, maxZoom: 1.1 }), 0);
              }}
              className="text-muted hover:bg-canvas hover:text-ink inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs disabled:opacity-40"
            >
              <LayoutDashboard className="size-3.5" aria-hidden />
              Arrange
            </button>
          )}
          <button
            type="button"
            disabled={!nodes.length}
            onClick={() => void fitView({ padding: 0.25, duration: 350, maxZoom: 1.1 })}
            className="text-muted hover:bg-canvas hover:text-ink inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs disabled:opacity-40"
          >
            <Focus className="size-3.5" aria-hidden />
            Fit all
          </button>
        </div>
      </FlowPanel>
      {!nodes.length && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-8">
          <div className="border-line bg-surface/95 max-w-sm rounded-2xl border p-6 text-center shadow-lg backdrop-blur">
            <span className="bg-primary-soft text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
              <Workflow className="size-6" aria-hidden />
            </span>
            <p className="mt-3 font-semibold">Start with a trigger</p>
            <p className="text-muted mt-1 text-sm">
              Choose a trigger from the builder, then add actions and conditions to shape the flow.
            </p>
          </div>
        </div>
      )}
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
