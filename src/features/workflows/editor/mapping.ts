import type { StepStatus } from '@/types/api';
import type { Edge, Node } from '@xyflow/react';
import type {
  EdgeDefinition,
  FlowNodeData,
  NodeDefinition,
  WorkflowDefinition,
} from '../types/workflow-definition';
import { autoLayout } from './layout';

export type FlowNode = Node<FlowNodeData, 'workflow'>;
export type FlowEdgeData = { branch?: 'true' | 'false' };
export type FlowEdge = Edge<FlowEdgeData>;

export const edgeId = (e: EdgeDefinition) => `${e.from}->${e.to}`;

export interface ToFlowOptions {
  labelFor?: (type: string) => string;
  issueCount?: (key: string) => number;
  readOnly?: boolean;
  /** Run view: each step's status, and whether an edge was taken (Part 08). */
  statusFor?: (key: string) => StepStatus | undefined;
}

/**
 * Definition → React Flow (Part 05, FR-05.1). The node key is the React Flow id; condition
 * branches are the edge's source handle ("true"/"false"). Nodes without a stored position get
 * one from `autoLayout` for display only.
 */
export function toFlow(
  definition: WorkflowDefinition,
  options: ToFlowOptions = {},
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const layout = autoLayout(definition);
  const nodes: FlowNode[] = definition.nodes.map((n) => ({
    id: n.key,
    type: 'workflow',
    position: n.position ?? layout.get(n.key) ?? { x: 0, y: 0 },
    deletable: !options.readOnly,
    draggable: !options.readOnly,
    connectable: !options.readOnly,
    data: {
      key: n.key,
      label: options.labelFor?.(n.type) ?? n.type,
      nodeType: n.type,
      kind: n.kind,
      config: n.config,
      issueCount: options.issueCount?.(n.key) ?? 0,
      readOnly: options.readOnly,
      stepStatus: options.statusFor?.(n.key),
    },
  }));
  const edges: FlowEdge[] = definition.edges.map((e) => ({
    id: edgeId(e),
    source: e.from,
    target: e.to,
    sourceHandle: e.branch ?? null,
    label: e.branch,
    deletable: !options.readOnly,
    data: e.branch ? { branch: e.branch } : {},
    className: e.branch ? `branch-${e.branch}` : undefined,
    ...(options.statusFor && edgeStyle(options.statusFor(e.from), options.statusFor(e.to))),
  }));
  return { nodes, edges };
}

/** React Flow → definition (inverse of `toFlow`; positions are taken from the canvas). */
export function toDefinition(nodes: FlowNode[], edges: FlowEdge[]): WorkflowDefinition {
  return {
    schemaVersion: 1,
    nodes: nodes.map((n): NodeDefinition => ({
      key: n.id,
      kind: n.data.kind,
      type: n.data.nodeType,
      config: n.data.config,
      position: { x: n.position.x, y: n.position.y },
    })),
    edges: edges.map((e): EdgeDefinition =>
      e.data?.branch
        ? { from: e.source, to: e.target, branch: e.data.branch }
        : { from: e.source, to: e.target },
    ),
  };
}

const RAN: (StepStatus | undefined)[] = ['SUCCEEDED', 'FAILED', 'RUNNING', 'RETRYING'];

/** Run view: the path the run took is solid and coloured; edges not taken are faint. */
function edgeStyle(from: StepStatus | undefined, to: StepStatus | undefined): Partial<FlowEdge> {
  const taken = RAN.includes(from) && RAN.includes(to);
  return taken
    ? { animated: to === 'RUNNING', style: { stroke: 'var(--color-primary)', strokeWidth: 2 } }
    : { style: { stroke: 'var(--color-line)', strokeDasharray: '4 4' } };
}
