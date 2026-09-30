import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui';
import { WorkflowCanvas } from '../components/canvas/workflow-canvas';
import { NodeConfigPanel } from '../components/node-config-panel';
import { NodePalette } from '../components/node-palette';
import type { WorkflowFlowNode } from '../components/nodes/workflow-node';

export function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const [selected, setSelected] = useState<WorkflowFlowNode | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="border-line bg-surface flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h1 className="text-base font-semibold">Untitled workflow</h1>
          <p className="text-muted font-mono text-xs">{workflowId}</p>
        </div>
        <div className="flex gap-2">
          {/* TODO: wire to saveDraft / validate / publish */}
          <Button variant="secondary" size="sm">
            Save draft
          </Button>
          <Button size="sm">Publish</Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="border-line bg-surface hidden w-60 shrink-0 overflow-y-auto border-r md:block">
          <NodePalette />
        </aside>
        <div className="min-w-0 flex-1">
          <ReactFlowProvider>
            <WorkflowCanvas onSelectNode={setSelected} />
          </ReactFlowProvider>
        </div>
        <aside className="border-line bg-surface hidden w-80 shrink-0 overflow-y-auto border-l lg:block">
          <NodeConfigPanel node={selected} />
        </aside>
      </div>
    </div>
  );
}
