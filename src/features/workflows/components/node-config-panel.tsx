import type { WorkflowFlowNode } from './nodes/workflow-node';

export function NodeConfigPanel({ node }: { node: WorkflowFlowNode | null }) {
  if (!node) {
    return <div className="text-muted p-4 text-sm">Select a step on the canvas to set it up.</div>;
  }
  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold">{node.data.label}</h2>
      <p className="text-muted mt-0.5 font-mono text-xs">{node.data.nodeType}</p>
      {/* TODO: schema-driven form for node.data.config */}
    </div>
  );
}
