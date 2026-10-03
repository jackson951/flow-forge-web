import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import {
  Archive,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  Info,
  LoaderCircle,
  Redo2,
  Save,
  Undo2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/components/feedback/error-state';
import { Button, Dialog, Spinner } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { isApiError, isConflict, isNotFound } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import type { NodeTypeInfo, ValidationIssue, WorkflowDetail } from '@/types/api';
import { useNodeTypes, useSaveDraft, useWorkflow } from '../api/workflows.api';
import { WorkflowCanvas } from '../components/canvas/workflow-canvas';
import { NodeConfigPanel } from '../components/node-config-panel';
import { NodePalette } from '../components/node-palette';
import { WorkflowStatusBadge } from '../components/workflow-status-badge';
import { generateKey } from '../editor/keys';
import { useEditor } from '../editor/use-editor';
import { NODE_CATALOG } from '../types/node-catalog';
import { DEFINITION_LIMITS } from '../types/workflow-definition';

export function WorkflowEditorPage() {
  const workspace = useWorkspace();
  const { workflowId = '' } = useParams<{ workflowId: string }>();
  const workflow = useWorkflow(workspace.id, workflowId);

  if (workflow.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Loading workflow" />
      </div>
    );
  }
  if (workflow.isError) {
    return (
      <div className="p-8">
        {isNotFound(workflow.error) ? (
          <ErrorState
            title="Workflow not found"
            message="It may have been deleted, or it belongs to another workspace."
          />
        ) : (
          <ErrorState
            message={workflow.error.message}
            requestId={isApiError(workflow.error) ? workflow.error.requestId : undefined}
            onRetry={() => void workflow.refetch()}
          />
        )}
      </div>
    );
  }
  // Remount when switching workflows so the editor starts from that draft.
  return (
    <ReactFlowProvider key={workflow.data.id}>
      <Editor workflow={workflow.data} />
    </ReactFlowProvider>
  );
}

function Editor({ workflow }: { workflow: WorkflowDetail }) {
  const workspace = useWorkspace();
  const nodeTypes = useNodeTypes();
  const saveDraft = useSaveDraft(workspace.id, workflow.id);
  const [revision, setRevision] = useState(workflow.draftRevision);
  const [issues, setIssues] = useState<ValidationIssue[]>(workflow.issues);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const readOnly = workflow.status === 'ARCHIVED';

  // Ctrl/Cmd+S calls the latest `save` (it depends on the current state, defined below).
  const saveRef = useRef<() => void>(() => undefined);
  const onShortcutSave = useCallback(() => saveRef.current(), []);
  const { state, dispatch, dirty, blocker } = useEditor(workflow.draftDefinition, onShortcutSave);

  const save = useCallback(() => {
    if (readOnly || !dirty || saveDraft.isPending) return;
    const definition = state.definition;
    saveDraft.mutate(
      { revision, definition },
      {
        onSuccess: (result) => {
          setRevision(result.draftRevision);
          setIssues(result.issues);
          setSavedAt(new Date());
          dispatch({ type: 'markSaved' });
        },
      },
    );
  }, [readOnly, dirty, saveDraft, state.definition, revision, dispatch]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of NODE_CATALOG) map.set(n.type, n.label);
    for (const t of nodeTypes.data ?? []) map.set(t.type, t.displayName);
    return map;
  }, [nodeTypes.data]);
  const labelFor = useCallback((type: string) => labels.get(type) ?? type, [labels]);

  const issuesByKey = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (issue.nodeKey) map.set(issue.nodeKey, [...(map.get(issue.nodeKey) ?? []), issue]);
    }
    return map;
  }, [issues]);
  const issueCount = useCallback((key: string) => issuesByKey.get(key)?.length ?? 0, [issuesByKey]);

  const def = state.definition;
  const selected = def.nodes.find((n) => n.key === selectedKey) ?? null;
  const hasTrigger = def.nodes.some((n) => n.kind === 'TRIGGER');

  const add = (type: NodeTypeInfo) => {
    // The reducer derives the key the same way; select the new step.
    const key = generateKey(
      type.type,
      def.nodes.map((n) => n.key),
    );
    dispatch({
      type: 'addNode',
      nodeType: type.type,
      kind: type.kind,
      after: selectedKey ?? undefined,
    });
    setSelectedKey(key);
  };

  const conflict = isConflict(saveDraft.error);

  return (
    <div className="flex h-full flex-col">
      <header className="border-line bg-surface flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="text-muted flex items-center gap-1 text-xs">
            <Link to={paths.workflows(workspace.id)} className="hover:text-primary">
              Workflows
            </Link>
            <ChevronRight className="size-3" aria-hidden />
            <span className="truncate">{workflow.name}</span>
          </nav>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{workflow.name}</h1>
            <WorkflowStatusBadge status={workflow.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SaveState
            dirty={dirty}
            saving={saveDraft.isPending}
            savedAt={savedAt}
            failed={saveDraft.isError}
          />
          <span
            className={cn(
              'text-muted text-xs tabular-nums',
              def.nodes.length >= DEFINITION_LIMITS.maxNodes - 5 &&
                'text-status-warning font-medium',
            )}
            title="Steps used of the maximum"
          >
            {def.nodes.length}/{DEFINITION_LIMITS.maxNodes} steps
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            disabled={readOnly || !state.past.length}
            onClick={() => dispatch({ type: 'undo' })}
          >
            <Undo2 className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            disabled={readOnly || !state.future.length}
            onClick={() => dispatch({ type: 'redo' })}
          >
            <Redo2 className="size-4" aria-hidden />
          </Button>
          <Button size="sm" onClick={save} disabled={readOnly || !dirty || saveDraft.isPending}>
            <Save className="size-4" aria-hidden />
            Save
          </Button>
        </div>
      </header>

      {readOnly && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <Archive className="size-4" aria-hidden />
          This workflow is archived and read-only. Unarchive it from the workflow list to edit it.
        </div>
      )}
      {state.notice && (
        <div
          role="status"
          className="bg-primary-soft text-ink flex items-center gap-2 border-b border-indigo-200 px-4 py-2 text-sm"
        >
          <Info className="text-primary size-4 shrink-0" aria-hidden />
          <span className="flex-1">{state.notice}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dispatch({ type: 'dismissNotice' })}
            className="text-muted hover:text-ink rounded p-0.5"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
      {saveDraft.isError && (
        <div
          role="alert"
          className="border-status-failed/20 bg-status-failed/5 text-status-failed flex items-center gap-2 border-b px-4 py-2 text-sm"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {conflict
            ? 'This draft was changed elsewhere since you opened it. Reload the page to get the latest version (your unsaved changes would be lost).'
            : `Could not save: ${saveDraft.error.message}`}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="border-line bg-surface hidden w-64 shrink-0 border-r md:block">
          <NodePalette hasTrigger={hasTrigger} onAdd={add} disabled={readOnly} />
        </aside>
        <div className="bg-canvas min-w-0 flex-1">
          <WorkflowCanvas
            definition={def}
            dispatch={dispatch}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            labelFor={labelFor}
            issueCount={issueCount}
            readOnly={readOnly}
          />
        </div>
        <aside
          aria-label="Selected step"
          className="border-line bg-surface hidden w-80 shrink-0 overflow-y-auto border-l lg:block"
        >
          <NodeConfigPanel
            node={selected}
            label={selected ? labelFor(selected.type) : ''}
            otherKeys={def.nodes.filter((n) => n.key !== selectedKey).map((n) => n.key)}
            issues={selected ? (issuesByKey.get(selected.key) ?? []) : []}
            dispatch={(action) => {
              if (action.type === 'renameKey') setSelectedKey(action.to);
              if (action.type === 'removeNodes') setSelectedKey(null);
              dispatch(action);
            }}
            readOnly={readOnly}
          />
        </aside>
      </div>

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Leave without saving?"
        description="Your changes to this workflow have not been saved."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => blocker.reset?.()}>
            Stay
          </Button>
          <Button variant="danger" onClick={() => blocker.proceed?.()}>
            Leave and discard
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function SaveState({
  dirty,
  saving,
  savedAt,
  failed,
}: {
  dirty: boolean;
  saving: boolean;
  savedAt: Date | null;
  failed: boolean;
}) {
  if (saving) {
    return (
      <span className="text-muted inline-flex items-center gap-1 text-xs" role="status">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }
  if (dirty) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs',
          failed ? 'text-status-failed' : 'text-status-warning',
        )}
        role="status"
      >
        <CircleAlert className="size-3.5" aria-hidden />
        {failed ? 'Not saved' : 'Unsaved changes'}
      </span>
    );
  }
  return (
    <span className="text-muted inline-flex items-center gap-1 text-xs" role="status">
      <CircleCheckBig className="text-status-succeeded size-3.5" aria-hidden />
      {savedAt
        ? `Saved at ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'All changes saved'}
    </span>
  );
}
