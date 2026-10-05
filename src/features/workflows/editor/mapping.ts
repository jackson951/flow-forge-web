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
  /** View-only spacing for legacy definitions whose saved coordinates predate larger cards. */
  spacious?: boolean;
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
  const basePositions = new Map(
    definition.nodes.map((node) => [
      node.key,
      node.position ?? layout.get(node.key) ?? { x: 0, y: 0 },
    ]),
  );
  const positions = options.spacious ? spreadTightPositions(basePositions) : basePositions;
  const nodes: FlowNode[] = definition.nodes.map((n) => ({
    id: n.key,
    type: 'workflow',
    position: positions.get(n.key)!,
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

/**
 * Expands only cramped coordinate bands. Generous authored gaps remain unchanged, while old
 * 140px rows gain enough room for today's richer cards. This never mutates the definition.
 */
function spreadTightPositions(
  positions: Map<string, { x: number; y: number }>,
): Map<string, { x: number; y: number }> {
  const x = spreadAxis(positions, 'x', 380, true);
  const y = spreadAxis(positions, 'y', 260, false);
  return new Map(
    [...positions].map(([key, position]) => [
      key,
      { x: x.get(key) ?? position.x, y: y.get(key) ?? position.y },
    ]),
  );
}

function spreadAxis(
  positions: Map<string, { x: number; y: number }>,
  axis: 'x' | 'y',
  minimumGap: number,
  recenter: boolean,
): Map<string, number> {
  const bands: { values: [string, number][]; anchor: number }[] = [];
  for (const entry of [...positions]
    .map(([key, point]) => [key, point[axis]] as [string, number])
    .sort((a, b) => a[1] - b[1])) {
    const band = bands.at(-1);
    if (band && entry[1] - band.anchor <= 48) band.values.push(entry);
    else bands.push({ values: [entry], anchor: entry[1] });
  }

  const centers = bands.map(
    (band) => band.values.reduce((sum, [, value]) => sum + value, 0) / band.values.length,
  );
  const expanded: number[] = [];
  centers.forEach((center, index) => {
    expanded[index] = index
      ? expanded[index - 1] + Math.max(center - centers[index - 1], minimumGap)
      : center;
  });
  if (recenter && expanded.length > 1) {
    const shift = (centers[0] + centers.at(-1)!) / 2 - (expanded[0] + expanded.at(-1)!) / 2;
    for (let index = 0; index < expanded.length; index++) expanded[index] += shift;
  }

  const result = new Map<string, number>();
  bands.forEach((band, index) => {
    for (const [key, value] of band.values)
      result.set(key, expanded[index] + value - centers[index]);
  });
  return result;
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
