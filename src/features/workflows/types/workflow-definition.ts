/** Mirrors the backend engine contract (scope §11). */
export type NodeCategory = 'trigger' | 'action' | 'condition';

export interface TriggerDefinition {
  type: string;
  config: Record<string, unknown>;
}

export interface NodeDefinition {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface EdgeDefinition {
  from: string;
  to: string;
  branch?: 'true' | 'false';
}

export interface WorkflowDefinition {
  trigger: TriggerDefinition;
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
}

/** Data carried by each React Flow node on the canvas. */
export type FlowNodeData = {
  label: string;
  nodeType: string;
  category: NodeCategory;
  config: Record<string, unknown>;
};
