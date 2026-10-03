/**
 * Workflow definition, schemaVersion 1 — mirrors the backend engine
 * (flowforge-api/src/engine/definition/definition.schema.ts). The canvas is a view of this;
 * the definition is the source of truth.
 */
import type { NodeKind } from '@/types/api';

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeDefinition {
  /** Unique within the definition; referenced as `steps.<key>.output…`. */
  key: string;
  kind: NodeKind;
  /** Node type id from GET /node-types, e.g. `slack.sendMessage`. */
  type: string;
  config: Record<string, unknown>;
  /** Canvas layout; optional for the engine. */
  position?: NodePosition;
}

export interface EdgeDefinition {
  from: string;
  to: string;
  /** Required on edges leaving a CONDITION node, not allowed elsewhere. */
  branch?: 'true' | 'false';
}

export interface WorkflowDefinition {
  schemaVersion: 1;
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
}

export const EMPTY_DEFINITION: WorkflowDefinition = { schemaVersion: 1, nodes: [], edges: [] };

/** definition.schema.ts `DEFINITION_LIMITS` and `NODE_KEY_PATTERN`. */
export const DEFINITION_LIMITS = {
  maxNodes: 50,
  maxEdges: 100,
  maxDefinitionBytes: 256 * 1024,
  maxNodeConfigBytes: 16 * 1024,
} as const;

export const NODE_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

/** Data carried by each React Flow node on the canvas. */
export type FlowNodeData = {
  /** The node's key (also the React Flow id). */
  key: string;
  label: string;
  nodeType: string;
  kind: NodeKind;
  config: Record<string, unknown>;
  /** Validation issues on this node (backend, Part 07). */
  issueCount?: number;
  /** Read-only canvas (archived workflow, version view). */
  readOnly?: boolean;
};
