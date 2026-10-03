import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import { ArrowLeft, BadgeCheck, ChevronRight, Lock, RotateCcw, Tag } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorState } from '@/components/feedback/error-state';
import { buttonClasses, Button, Spinner } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { isNotFound } from '@/lib/api-client';
import { formatDateTime, formatRelative } from '@/lib/format';
import { paths } from '@/lib/routes';
import { useNodeTypes, useVersion, useWorkflow } from '../api/workflows.api';
import { WorkflowCanvas } from '../components/canvas/workflow-canvas';
import { NodeConfigPanel } from '../components/node-config-panel';
import { NODE_CATALOG } from '../types/node-catalog';
import type { RestoreState } from './workflow-editor-page';

const noop = () => undefined;

/**
 * A published version on the canvas, read-only (Part 07, FR-07.5). Versions are immutable;
 * "Restore into draft" goes back to the editor and copies this definition into the draft.
 */
export function WorkflowVersionPage() {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const { workflowId = '', version: versionParam = '' } = useParams();
  const number = Number(versionParam);
  const workflow = useWorkflow(workspace.id, workflowId);
  const version = useVersion(
    workspace.id,
    workflowId,
    Number.isInteger(number) ? number : undefined,
  );
  const nodeTypes = useNodeTypes();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of NODE_CATALOG) map.set(n.type, n.label);
    for (const t of nodeTypes.data ?? []) map.set(t.type, t.displayName);
    return map;
  }, [nodeTypes.data]);
  const labelFor = useCallback((type: string) => labels.get(type) ?? type, [labels]);
  const noIssues = useCallback(() => 0, []);

  if (workflow.isPending || version.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Loading version" />
      </div>
    );
  }
  const error = workflow.error ?? version.error;
  if (error || !workflow.data || !version.data) {
    return (
      <div className="p-8">
        {isNotFound(error) || !Number.isInteger(number) ? (
          <ErrorState title="Version not found" message="This workflow has no such version." />
        ) : (
          <ErrorState error={error} />
        )}
      </div>
    );
  }

  const v = version.data;
  const def = v.definition;
  const selected = def.nodes.find((n) => n.key === selectedKey) ?? null;
  const canRestore = workflow.data.status !== 'ARCHIVED';

  return (
    <div className="flex h-full flex-col">
      <header className="border-line bg-surface flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="text-muted flex items-center gap-1 text-xs">
            <Link to={paths.workflows(workspace.id)} className="hover:text-primary">
              Workflows
            </Link>
            <ChevronRight className="size-3" aria-hidden />
            <Link
              to={paths.workflow(workspace.id, workflowId)}
              className="hover:text-primary truncate"
            >
              {workflow.data.name}
            </Link>
            <ChevronRight className="size-3" aria-hidden />
            <span>v{v.version}</span>
          </nav>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="flex items-center gap-1.5 truncate text-lg font-semibold">
              <Tag className="text-muted size-4" aria-hidden />
              {workflow.data.name} · v{v.version}
            </h1>
            {v.isActive && (
              <span className="bg-status-succeeded/10 text-status-succeeded inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                <BadgeCheck className="size-3.5" aria-hidden />
                Active
              </span>
            )}
          </div>
          <p className="text-muted text-xs" title={formatDateTime(v.publishedAt)}>
            Published {formatRelative(v.publishedAt)} by {v.publishedBy?.name ?? 'a former member'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={paths.workflow(workspace.id, workflowId)}
            className={buttonClasses('secondary', 'sm')}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to draft
          </Link>
          {canRestore && (
            <Button
              size="sm"
              onClick={() =>
                void navigate(paths.workflow(workspace.id, workflowId), {
                  state: { restoreVersion: v.version } satisfies RestoreState,
                })
              }
            >
              <RotateCcw className="size-4" aria-hidden />
              Restore into draft
            </Button>
          )}
        </div>
      </header>
      <div className="text-muted flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm">
        <Lock className="size-4" aria-hidden />
        Published versions cannot be changed. Restore it into the draft to edit and publish it
        again.
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="bg-canvas min-w-0 flex-1">
          <ReactFlowProvider>
            <WorkflowCanvas
              definition={def}
              dispatch={noop}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              labelFor={labelFor}
              issueCount={noIssues}
              readOnly
            />
          </ReactFlowProvider>
        </div>
        <aside
          aria-label="Selected step"
          className="border-line bg-surface hidden w-80 shrink-0 overflow-y-auto border-l md:block"
        >
          <NodeConfigPanel
            node={selected}
            label={selected ? labelFor(selected.type) : ''}
            otherKeys={[]}
            issues={[]}
            dispatch={noop}
            readOnly
            definition={def}
            labelFor={labelFor}
          />
        </aside>
      </div>
    </div>
  );
}
