import '@xyflow/react/dist/style.css';
import { useQueryClient } from '@tanstack/react-query';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import {
  Archive,
  ChevronRight,
  CircleAlert,
  CircleCheckBig,
  GitCompareArrows,
  History,
  Info,
  LoaderCircle,
  MonitorSmartphone,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PartyPopper,
  Play,
  Redo2,
  Rocket,
  Save,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ErrorState } from '@/components/feedback/error-state';
import { Button, Dialog, Spinner } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { policy } from '@/features/workspaces/policy';
import { isNotFound } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';
import type { DraftSaveResult, NodeTypeInfo, ValidationIssue, WorkflowDetail } from '@/types/api';
import {
  useNodeTypes,
  usePublish,
  useSaveDraft,
  useVersion,
  useWorkflow,
  workflowsApi,
} from '../api/workflows.api';
import {
  callbackErrorMessage,
  type IntegrationReturnState,
} from '@/features/integrations/connect-flow';
import { RunNowDialog } from '@/features/runs/components/run-now-dialog';
import { WorkflowCanvas } from '../components/canvas/workflow-canvas';
import { IssuesPanel } from '../components/issues-panel';
import { NodeConfigPanel } from '../components/node-config-panel';
import { NodePalette } from '../components/node-palette';
import { VersionsPanel } from '../components/versions-panel';
import { ScheduleSummary } from '../components/schedule-summary';
import { WorkflowStatusBadge } from '../components/workflow-status-badge';
import { sameDefinition } from '../editor/canonical';
import { conflictRevisionOf, type SaveSnapshot } from '../editor/draft-saver';
import { countErrors, issuesFromError } from '../editor/issues';
import { generateKey } from '../editor/keys';
import { useDraftSaver } from '../editor/use-draft-saver';
import { useEditor } from '../editor/use-editor';
import { usePanels } from '../editor/use-panels';
import { NODE_CATALOG } from '../types/node-catalog';
import { DEFINITION_LIMITS, type WorkflowDefinition } from '../types/workflow-definition';

/** Router state for "Restore into draft" started from a version page. */
export interface RestoreState {
  restoreVersion?: number;
}

/** Triggers whose workflows can also be started with Run now. */
const MANUALLY_RUNNABLE = new Set(['manual.trigger', 'schedule.trigger']);

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
          <ErrorState error={workflow.error} onRetry={() => void workflow.refetch()} />
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
  const qc = useQueryClient();
  const { fitView } = useReactFlow();
  const location = useLocation();
  const navigate = useNavigate();
  const nodeTypes = useNodeTypes();
  const saveDraft = useSaveDraft(workspace.id, workflow.id);
  const publish = usePublish(workspace.id, workflow.id);
  const [issues, setIssues] = useState<ValidationIssue[]>(workflow.issues);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [side, setSide] = useState<'step' | 'versions'>('step');
  const [showIssues, setShowIssues] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  // The conflict dialog shows while there is a conflict, unless the user chose to decide later.
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [restoreAsk, setRestoreAsk] = useState<number | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);
  const readOnly = workflow.status === 'ARCHIVED';
  const canPublish = policy.canManage(workspace.role);
  const { panels, setPanel } = usePanels();

  // Ctrl/Cmd+S saves now (the save function is defined below, after the editor state).
  const saveRef = useRef<() => void>(() => undefined);
  const onShortcutSave = useCallback(() => saveRef.current(), []);
  const { state, dispatch, dirty, blocker } = useEditor(workflow.draftDefinition, onShortcutSave);

  const send = useCallback(
    (revision: number, definition: WorkflowDefinition) =>
      saveDraft.mutateAsync({ revision, definition }),
    [saveDraft],
  );
  const onSaved = useCallback(
    (definition: WorkflowDefinition, result: DraftSaveResult) => {
      setIssues(result.issues);
      dispatch({ type: 'markSaved', definition });
    },
    [dispatch],
  );
  const { saver, snapshot, saveNow } = useDraftSaver({
    revision: workflow.draftRevision,
    initialDefinition: workflow.draftDefinition,
    definition: state.definition,
    dirty,
    disabled: readOnly,
    send,
    onSaved,
  });
  // Ctrl/Cmd+S: only when there is something to save (an unchanged draft is not re-saved).
  const canSave =
    !readOnly &&
    snapshot.status !== 'conflict' &&
    snapshot.status !== 'saving' &&
    (dirty || snapshot.status === 'failed');
  useEffect(() => {
    saveRef.current = () => {
      if (canSave) void saveNow();
    };
  }, [saveNow, canSave]);

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
  const errorCount = countErrors(issues);

  // Does the saved draft differ from the active version? (FR-07.6)
  const activeNumber = workflow.activeVersion?.version;
  const active = useVersion(workspace.id, workflow.id, activeNumber);
  const differs = active.data
    ? !sameDefinition(snapshot.savedDefinition, active.data.definition)
    : true;

  const def = state.definition;
  const selected = def.nodes.find((n) => n.key === selectedKey) ?? null;
  const hasTrigger = def.nodes.some((n) => n.kind === 'TRIGGER');

  const selectNode = useCallback(
    (key: string) => {
      setSelectedKey(key);
      setSide('step');
      setPanel('right', true);
      void fitView({ nodes: [{ id: key }], duration: 300, maxZoom: 1.2 });
    },
    [fitView, setPanel],
  );

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

  // Background failure: autosave runs without the user asking, so a failure is also toasted
  // (the banner below stays as the record).
  useEffect(() => {
    if (snapshot.status === 'failed')
      toast.error('Could not save the draft. Your changes are kept.');
  }, [snapshot.status]);

  // ── Conflict (FR-07.2) ─────────────────────────────────────────────────────
  const fetchFresh = () =>
    qc.fetchQuery({
      queryKey: queryKeys.workflows.detail(workspace.id, workflow.id),
      queryFn: () => workflowsApi.get(workspace.id, workflow.id),
      staleTime: 0,
    });
  const reloadTheirs = async () => {
    const fresh = await fetchFresh();
    setConflictDismissed(false);
    dispatch({ type: 'load', definition: fresh.draftDefinition });
    saver.reset(fresh.draftRevision, fresh.draftDefinition);
    setIssues(fresh.issues);
    setSelectedKey(null);
    setBanner({
      tone: 'info',
      text: 'Loaded the latest draft. Your local changes were discarded.',
    });
  };
  const overwrite = async () => {
    const fresh = await fetchFresh();
    setConflictDismissed(false);
    await saver.overwrite(fresh.draftRevision, state.definition);
  };

  // ── Restore a version into the draft (FR-07.5) ────────────────────────────
  const loadVersion = useCallback(
    (version: number) =>
      qc.fetchQuery({
        queryKey: queryKeys.workflows.version(workspace.id, workflow.id, version),
        queryFn: () => workflowsApi.version(workspace.id, workflow.id, version),
        staleTime: Infinity,
      }),
    [qc, workspace.id, workflow.id],
  );
  const applyRestore = useCallback(
    (version: number, definition: WorkflowDefinition) => {
      dispatch({ type: 'replace', definition });
      setSelectedKey(null);
      setSide('step');
      setBanner({
        tone: 'info',
        text: `Restored v${version} into the draft. It saves automatically; publish to make it active.`,
      });
    },
    [dispatch],
  );
  const restore = (version: number) =>
    void loadVersion(version).then((v) => applyRestore(version, v.definition));
  // Back from connecting an integration (Part 10): reselect the step and say how it went.
  const returned = location.state as IntegrationReturnState | null;
  useEffect(() => {
    if (!returned?.integrationResult) return;
    const { integrationResult: r, selectStep: step } = returned;
    void navigate(location.pathname, { replace: true, state: null });
    if (step) {
      setTimeout(() => selectNode(step), 0);
    }
    setTimeout(
      () =>
        setBanner(
          r.status === 'connected'
            ? {
                tone: 'success',
                text: 'Connected. Choose the new connection in the step’s settings.',
              }
            : { tone: 'info', text: callbackErrorMessage(r.reason, 'The provider') },
        ),
      0,
    );
  }, [returned, navigate, location.pathname, selectNode]);

  const pendingRestore = (location.state as RestoreState | null)?.restoreVersion;
  useEffect(() => {
    if (pendingRestore === undefined || readOnly) return;
    void navigate(location.pathname, { replace: true, state: null });
    void loadVersion(pendingRestore).then((v) => applyRestore(pendingRestore, v.definition));
  }, [pendingRestore, readOnly, loadVersion, applyRestore, navigate, location.pathname]);

  // ── Publish (FR-07.4) ─────────────────────────────────────────────────────
  const saving = snapshot.status === 'saving';
  const publishBlocked = readOnly
    ? 'Archived workflows cannot be published.'
    : !canPublish
      ? 'Only owners and admins can publish.'
      : snapshot.status === 'conflict'
        ? 'Resolve the conflicting change first.'
        : dirty || saving
          ? 'Save your changes before publishing.'
          : errorCount
            ? `Fix ${errorCount} error${errorCount === 1 ? '' : 's'} before publishing.`
            : activeNumber !== undefined && active.data && !differs
              ? `Nothing to publish: the draft matches v${activeNumber}.`
              : null;

  const doPublish = () =>
    publish.mutate(snapshot.revision, {
      onSuccess: (version) => {
        setPublishOpen(false);
        setBanner({
          tone: 'success',
          text: `Published v${version.version}. It is now the active version.`,
        });
      },
      onError: (error) => {
        const found = issuesFromError(error);
        if (found) {
          setIssues(found);
          setShowIssues(true);
        }
      },
    });

  // Run now (Part 08): the active version runs; event-triggered workflows run on events. A
  // scheduled workflow can also be run by hand (Part 17): that run does not affect the schedule.
  const activeTrigger = active.data?.definition.nodes.find((n) => n.kind === 'TRIGGER');
  const runBlocked = readOnly
    ? 'Archived workflows cannot be run.'
    : activeNumber === undefined
      ? 'Publish the workflow before running it.'
      : activeTrigger && !MANUALLY_RUNNABLE.has(activeTrigger.type)
        ? `Runs automatically when its trigger fires (${labelFor(activeTrigger.type)}).`
        : null;

  const publishError = publish.error
    ? issuesFromError(publish.error)
      ? 'The draft cannot be published yet. The issues are listed below the canvas.'
      : conflictRevisionOf(publish.error) !== undefined
        ? (publish.error as { details?: { code?: string } }).details?.code === 'NO_CHANGES'
          ? 'Nothing to publish: the draft matches the active version.'
          : 'The draft changed since you reviewed it. Reload the page to publish the latest draft.'
        : publish.error.message
    : null;

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
          <SaveState snapshot={snapshot} dirty={dirty} />
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
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={showIssues}
            onClick={() => setShowIssues((v) => !v)}
            className={errorCount ? 'text-status-failed' : undefined}
          >
            {issues.length ? (
              <CircleAlert className="size-4" aria-hidden />
            ) : (
              <CircleCheckBig className="text-status-succeeded size-4" aria-hidden />
            )}
            {issues.length
              ? `${issues.length} issue${issues.length === 1 ? '' : 's'}`
              : 'No issues'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={side === 'versions' && panels.right}
            onClick={() => {
              setSide((s) => (s === 'versions' && panels.right ? 'step' : 'versions'));
              setPanel('right', true);
            }}
          >
            <History className="size-4" aria-hidden />
            Versions
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void saveNow()} disabled={!canSave}>
            <Save className="size-4" aria-hidden />
            Save
          </Button>
          <span title={runBlocked ?? undefined}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRunOpen(true)}
              disabled={!!runBlocked}
              aria-describedby={runBlocked ? 'run-blocked' : undefined}
            >
              <Play className="size-4" aria-hidden />
              Run now
            </Button>
          </span>
          {runBlocked && (
            <span id="run-blocked" className="sr-only">
              {runBlocked}
            </span>
          )}
          <span title={publishBlocked ?? undefined}>
            <Button
              size="sm"
              onClick={() => {
                publish.reset();
                setPublishOpen(true);
              }}
              disabled={!!publishBlocked}
              aria-describedby={publishBlocked ? 'publish-blocked' : undefined}
            >
              <Rocket className="size-4" aria-hidden />
              Publish
            </Button>
          </span>
          {publishBlocked && (
            <span id="publish-blocked" className="sr-only">
              {publishBlocked}
            </span>
          )}
        </div>
      </header>

      <p className="text-muted flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm md:hidden">
        <MonitorSmartphone className="size-4 shrink-0" aria-hidden />
        The editor works best on a larger screen. Step settings and the step list appear from tablet
        width.
      </p>
      <ScheduleSummary
        workspaceId={workspace.id}
        schedule={workflow.schedule ?? null}
        draftScheduled={def.nodes.some((n) => n.type === 'schedule.trigger')}
        archived={readOnly}
      />
      {readOnly && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <Archive className="size-4" aria-hidden />
          This workflow is archived and read-only. Unarchive it from the workflow list to edit it.
        </div>
      )}
      {snapshot.status === 'conflict' && (
        <div
          role="alert"
          className="border-status-failed/20 bg-status-failed/5 text-status-failed flex flex-wrap items-center gap-2 border-b px-4 py-2 text-sm"
        >
          <GitCompareArrows className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">
            This draft changed elsewhere. Autosave is paused until you choose which version to keep.
          </span>
          <Button size="sm" variant="secondary" onClick={() => setConflictDismissed(false)}>
            Resolve…
          </Button>
        </div>
      )}
      {banner && (
        <div
          role="status"
          className={cn(
            'flex items-center gap-2 border-b px-4 py-2 text-sm',
            banner.tone === 'success'
              ? 'border-status-succeeded/20 bg-status-succeeded/5 text-ink'
              : 'bg-primary-soft text-ink border-indigo-200',
          )}
        >
          {banner.tone === 'success' ? (
            <PartyPopper className="text-status-succeeded size-4 shrink-0" aria-hidden />
          ) : (
            <Info className="text-primary size-4 shrink-0" aria-hidden />
          )}
          <span className="flex-1">{banner.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setBanner(null)}
            className="text-muted hover:text-ink rounded p-0.5"
          >
            <X className="size-4" aria-hidden />
          </button>
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
      {snapshot.status === 'failed' && (
        <div
          role="alert"
          className="border-status-failed/20 bg-status-failed/5 text-status-failed flex items-center gap-2 border-b px-4 py-2 text-sm"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          Could not save: {(snapshot.error as Error | null)?.message ?? 'unknown error'}. Your
          changes are kept; saving is retried on the next change, or press Save.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Steps panel"
          className={cn(
            'border-line bg-surface hidden shrink-0 flex-col border-r md:flex',
            panels.left ? 'w-64' : 'w-10',
          )}
        >
          {panels.left ? (
            <>
              <PanelHeader title="Add steps">
                <PanelToggle
                  icon={PanelLeftClose}
                  label="Collapse steps panel"
                  onClick={() => setPanel('left', false)}
                />
              </PanelHeader>
              <div className="min-h-0 flex-1">
                <NodePalette hasTrigger={hasTrigger} onAdd={add} disabled={readOnly} />
              </div>
            </>
          ) : (
            <PanelRail>
              <PanelToggle
                icon={PanelLeftOpen}
                label="Expand steps panel"
                onClick={() => setPanel('left', true)}
              />
            </PanelRail>
          )}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="bg-canvas min-h-0 flex-1">
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
          {showIssues && (
            <IssuesPanel
              issues={issues}
              definition={def}
              labelFor={labelFor}
              onSelectNode={selectNode}
              onClose={() => setShowIssues(false)}
              stale={dirty}
            />
          )}
          <StatusBar
            revision={snapshot.revision}
            activeNumber={activeNumber}
            differs={differs}
            known={activeNumber === undefined || active.isSuccess}
            workflow={workflow}
          />
        </div>
        <aside
          aria-label={side === 'versions' ? 'Versions panel' : 'Selected step'}
          className={cn(
            'border-line bg-surface hidden shrink-0 flex-col border-l md:flex',
            panels.right ? 'w-80' : 'w-10',
          )}
        >
          {!panels.right ? (
            <PanelRail>
              <PanelToggle
                icon={PanelRightOpen}
                label="Expand side panel"
                onClick={() => setPanel('right', true)}
              />
            </PanelRail>
          ) : (
            <>
              <PanelHeader title={side === 'versions' ? 'Versions' : 'Step'}>
                {side === 'versions' && (
                  <PanelToggle icon={X} label="Close versions" onClick={() => setSide('step')} />
                )}
                <PanelToggle
                  icon={PanelRightClose}
                  label="Collapse side panel"
                  onClick={() => setPanel('right', false)}
                />
              </PanelHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {side === 'versions' ? (
                  <VersionsPanel
                    workspaceId={workspace.id}
                    workflowId={workflow.id}
                    onRestore={readOnly ? undefined : (v) => setRestoreAsk(v)}
                  />
                ) : (
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
                    definition={def}
                    labelFor={labelFor}
                  />
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      <RunNowDialog
        workflowId={workflow.id}
        workflowName={workflow.name}
        open={runOpen}
        onClose={() => setRunOpen(false)}
      />

      <Dialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish a new version?"
        description={`Freezes the saved draft (revision ${snapshot.revision}) as an immutable version.`}
      >
        <ul className="text-muted mb-4 list-disc space-y-1 pl-5 text-sm">
          <li>New runs — started manually or by a trigger — use the new version.</li>
          <li>Webhook triggers are re-routed to it.</li>
          <li>Runs already in progress keep the version they started with.</li>
          <li>You can keep editing the draft; it changes nothing until you publish again.</li>
        </ul>
        {publishError && (
          <p role="alert" className="text-status-failed mb-3 flex items-start gap-1.5 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {publishError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPublishOpen(false)}>
            Cancel
          </Button>
          <Button onClick={doPublish} disabled={publish.isPending}>
            <Rocket className="size-4" aria-hidden />
            {publish.isPending ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={snapshot.status === 'conflict' && !conflictDismissed}
        onClose={() => setConflictDismissed(true)}
        title="This draft changed elsewhere"
        description="Someone (or another tab) saved this draft after you opened it. Nothing was overwritten."
      >
        <ul className="text-muted mb-4 space-y-2 text-sm">
          <li>
            <strong className="text-ink">Reload theirs</strong> — load the newer draft and discard
            your unsaved changes.
          </li>
          <li>
            <strong className="text-ink">Overwrite</strong> — save your version over theirs (their
            changes are lost).
          </li>
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConflictDismissed(true)}>
            Decide later
          </Button>
          <Button variant="secondary" onClick={() => void reloadTheirs()}>
            Reload theirs
          </Button>
          <Button variant="danger" onClick={() => void overwrite()}>
            Overwrite
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={restoreAsk !== null}
        onClose={() => setRestoreAsk(null)}
        title={`Restore v${restoreAsk ?? ''} into the draft?`}
        description="The draft is replaced by that version's steps. You can undo this, and nothing is published until you publish."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRestoreAsk(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const v = restoreAsk!;
              setRestoreAsk(null);
              restore(v);
            }}
          >
            Restore
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Leave without saving?"
        description="Your latest changes to this workflow have not been saved yet."
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

function SaveState({ snapshot, dirty }: { snapshot: SaveSnapshot; dirty: boolean }) {
  const base = 'inline-flex items-center gap-1 text-xs';
  if (snapshot.status === 'conflict') {
    return (
      <span className={cn(base, 'text-status-failed')} role="status">
        <GitCompareArrows className="size-3.5" aria-hidden />
        Changed elsewhere
      </span>
    );
  }
  if (snapshot.status === 'saving') {
    return (
      <span className={cn(base, 'text-muted')} role="status">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }
  if (snapshot.status === 'failed') {
    return (
      <span className={cn(base, 'text-status-failed')} role="status">
        <CircleAlert className="size-3.5" aria-hidden />
        Save failed
      </span>
    );
  }
  if (dirty) {
    return (
      <span className={cn(base, 'text-status-warning')} role="status">
        <CircleAlert className="size-3.5" aria-hidden />
        Unsaved changes
      </span>
    );
  }
  return (
    <span className={cn(base, 'text-muted')} role="status">
      <CircleCheckBig className="text-status-succeeded size-3.5" aria-hidden />
      {snapshot.savedAt
        ? `Saved at ${snapshot.savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'All changes saved'}
    </span>
  );
}

function StatusBar({
  revision,
  activeNumber,
  differs,
  known,
  workflow,
}: {
  revision: number;
  activeNumber: number | undefined;
  differs: boolean;
  known: boolean;
  workflow: WorkflowDetail;
}) {
  const versionText =
    activeNumber === undefined
      ? 'Not published yet'
      : !known
        ? `Active: v${activeNumber}`
        : differs
          ? `Draft has changes not in v${activeNumber}`
          : `Draft matches the active v${activeNumber}`;
  return (
    <footer
      aria-label="Draft status"
      className="border-line bg-surface text-muted flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-1.5 text-xs"
    >
      <span>Draft revision {revision}</span>
      <span className="flex items-center gap-1">
        <GitCompareArrows className="size-3.5" aria-hidden />
        {versionText}
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        Status <WorkflowStatusBadge status={workflow.status} />
      </span>
    </footer>
  );
}

function PanelHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-line flex h-9 shrink-0 items-center gap-1 border-b pr-1 pl-3">
      <span className="text-muted mr-auto text-xs font-semibold tracking-wide uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

function PanelRail({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center pt-1">{children}</div>;
}

/** Collapse/expand button for an editor side panel. */
function PanelToggle({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-muted hover:text-ink hover:bg-canvas rounded-md p-1.5"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
