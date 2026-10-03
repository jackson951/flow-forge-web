import '@xyflow/react/dist/style.css';
import { ReactFlowProvider } from '@xyflow/react';
import {
  Activity,
  ArrowLeft,
  Check,
  CircleSlash,
  Copy,
  History,
  Hourglass,
  Info,
  Link2,
  Radio,
  RotateCcw,
  Route,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ErrorState } from '@/components/feedback/error-state';
import { PageContainer } from '@/components/layout/page-container';
import { Button, Dialog, Skeleton, StatusBadge } from '@/components/ui';
import { useVersion } from '@/features/workflows/api/workflows.api';
import { WorkflowCanvas } from '@/features/workflows/components/canvas/workflow-canvas';
import { useNodeLabels } from '@/features/workflows/hooks/use-node-labels';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { policy } from '@/features/workspaces/policy';
import { isNotFound } from '@/lib/api-client';
import { formatDateTime, formatRelative } from '@/lib/format';
import { paths } from '@/lib/routes';
import type { RunDetail } from '@/types/api';
import { isActive, useCancelRun, useRun, useRunSteps } from '../api/runs.api';
import { ErrorExplanation } from '../components/error-explanation';
import { JsonView } from '../components/json-view';
import { RetryDialog } from '../components/retry-dialog';
import { StepTimeline } from '../components/step-timeline';
import { formatDuration, skipReasons, TRIGGER_SOURCES } from '../run-helpers';

const noop = () => undefined;
const noIssues = () => 0;

/** One run, step by step (Part 08, FR-08.4–08.9); updates live until it finishes. */
export function RunDetailPage() {
  const workspace = useWorkspace();
  const { runId = '' } = useParams<{ runId: string }>();
  const run = useRun(workspace.id, runId);

  return (
    <PageContainer>
      <Link
        to={paths.runs(workspace.id)}
        className="text-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to runs
      </Link>
      {run.isPending && (
        <div className="mt-4 space-y-3" aria-label="Loading run">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-32" />
        </div>
      )}
      {run.isError &&
        (isNotFound(run.error) ? (
          <ErrorState
            title="Run not found"
            message="It may have been removed by retention, or it belongs to another workspace."
          />
        ) : (
          <ErrorState error={run.error} onRetry={() => void run.refetch()} />
        ))}
      {run.isSuccess && <RunView run={run.data} />}
    </PageContainer>
  );
}

function RunView({ run }: { run: RunDetail }) {
  const workspace = useWorkspace();
  const labelFor = useNodeLabels();
  const active = isActive(run.status);
  const steps = useRunSteps(workspace.id, run.id, active);
  const version = useVersion(workspace.id, run.workflowId, run.version);
  const cancel = useCancelRun(workspace.id);
  const canManage = policy.canManage(workspace.role);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const stepList = useMemo(() => steps.data ?? [], [steps.data]);
  const reasons = useMemo(
    () => skipReasons(version.data?.definition, stepList),
    [version.data, stepList],
  );
  const statusByKey = useMemo(
    () => new Map(stepList.map((s) => [s.nodeKey, s.status])),
    [stepList],
  );
  const statusFor = useCallback((key: string) => statusByKey.get(key), [statusByKey]);
  const Source = TRIGGER_SOURCES[run.triggerSource];

  return (
    <div className="mt-3 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            <Activity className="text-primary size-6" aria-hidden />
            {run.workflowName}
            <StatusBadge status={run.status} />
          </h1>
          <p className="text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Link
              to={paths.workflowVersion(workspace.id, run.workflowId, run.version)}
              className="hover:text-primary inline-flex items-center gap-1"
            >
              <Tag className="size-3.5" aria-hidden />v{run.version}
            </Link>
            <span className="inline-flex items-center gap-1">
              <Source.icon className="size-3.5" aria-hidden />
              {Source.label}
            </span>
            <span title={formatDateTime(run.createdAt)}>
              Started {formatRelative(run.createdAt)}
            </span>
            {active && (
              <span className="text-status-running inline-flex items-center gap-1" role="status">
                <Radio className="size-3.5 animate-pulse" aria-hidden />
                Updating live
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {active && (
              <Button
                variant="secondary"
                onClick={() => setConfirmCancel(true)}
                disabled={!!run.cancelRequestedAt}
              >
                <CircleSlash className="size-4" aria-hidden />
                {run.cancelRequestedAt ? 'Cancelling…' : 'Cancel run'}
              </Button>
            )}
            {run.status === 'FAILED' && (
              <Button onClick={() => setRetrying(true)}>
                <RotateCcw className="size-4" aria-hidden />
                Retry
              </Button>
            )}
          </div>
        )}
      </header>

      {run.cancelRequestedAt && active && (
        <Banner icon={Hourglass}>
          Cancellation requested. The step that is running finishes; no new step starts.
        </Banner>
      )}
      {run.payloadsTrimmedAt && (
        <Banner icon={Info}>
          This run is older than the retention period: its step inputs and outputs were removed on{' '}
          {formatDateTime(run.payloadsTrimmedAt)}. It can be retried from the start only.
        </Banner>
      )}

      {run.status === 'FAILED' && run.error && (
        <section aria-label="Why the run failed" className="space-y-2">
          {run.failedStep && (
            <p className="text-sm">
              Failed at <span className="font-medium">{labelFor(run.failedStep.nodeType)}</span>{' '}
              <span className="text-muted font-mono">({run.failedStep.nodeKey})</span>
            </p>
          )}
          <ErrorExplanation
            error={run.failedStep?.error ?? run.error}
            nodeType={run.failedStep?.nodeType}
          />
        </section>
      )}

      <Facts run={run} />

      <section aria-label="Path taken" className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Route className="text-muted size-4" aria-hidden />
          Path taken
        </h2>
        <div className="border-line bg-canvas h-80 overflow-hidden rounded-xl border">
          {version.data ? (
            <ReactFlowProvider>
              <WorkflowCanvas
                definition={version.data.definition}
                dispatch={noop}
                selectedKey={null}
                onSelect={noop}
                labelFor={labelFor}
                issueCount={noIssues}
                statusFor={statusFor}
                readOnly
              />
            </ReactFlowProvider>
          ) : (
            <Skeleton className="h-full" />
          )}
        </div>
      </section>

      <section aria-label="Trigger input" className="space-y-2">
        <JsonView label="Trigger input" value={run.triggerInput} empty="no input" />
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="text-muted size-4" aria-hidden />
          Steps
        </h2>
        {steps.isPending ? (
          <Skeleton className="h-40" />
        ) : steps.isError ? (
          <ErrorState error={steps.error} onRetry={() => void steps.refetch()} />
        ) : (
          <StepTimeline
            steps={stepList}
            labelFor={labelFor}
            skipReasons={reasons}
            payloadsTrimmed={!!run.payloadsTrimmedAt}
          />
        )}
      </section>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this run?"
        description={
          run.status === 'QUEUED'
            ? 'It has not started yet, so nothing will run.'
            : 'The step that is running now finishes (its action may still complete); no new step starts.'
        }
      >
        {cancel.error && (
          <p role="alert" className="text-status-failed mb-3 text-sm">
            {cancel.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            Keep running
          </Button>
          <Button
            variant="danger"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(run.id, { onSuccess: () => setConfirmCancel(false) })}
          >
            <CircleSlash className="size-4" aria-hidden />
            Cancel run
          </Button>
        </div>
      </Dialog>
      <RetryDialog run={run} steps={stepList} open={retrying} onClose={() => setRetrying(false)} />
    </div>
  );
}

function Facts({ run }: { run: RunDetail }) {
  const workspace = useWorkspace();
  const [copied, setCopied] = useState(false);
  const time = (iso: string | null) => (iso ? formatDateTime(iso) : '—');
  return (
    <dl className="border-line bg-surface grid gap-x-6 gap-y-3 rounded-xl border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <Fact label="Queued">{time(run.queuedAt)}</Fact>
      <Fact label="Started">{time(run.startedAt)}</Fact>
      <Fact label="Finished">{time(run.completedAt)}</Fact>
      <Fact label="Duration">{formatDuration(run.durationMs)}</Fact>
      <Fact label="Attempts">{run.attemptCount}</Fact>
      <Fact label="Correlation id">
        {run.correlationId ? (
          <span className="inline-flex items-center gap-1">
            <span className="truncate font-mono text-xs">{run.correlationId}</span>
            <button
              type="button"
              aria-label="Copy correlation id"
              title="Copy"
              onClick={() =>
                void navigator.clipboard?.writeText(run.correlationId!).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1_500);
                })
              }
              className="text-muted hover:text-ink rounded p-0.5"
            >
              {copied ? (
                <Check className="text-status-succeeded size-3.5" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
            </button>
          </span>
        ) : (
          '—'
        )}
      </Fact>
      {run.retryOfRunId && (
        <Fact label="Retry of">
          <Link
            to={paths.run(workspace.id, run.retryOfRunId)}
            className="text-primary inline-flex items-center gap-1 hover:underline"
          >
            <Link2 className="size-3.5" aria-hidden />
            Earlier run
          </Link>
        </Fact>
      )}
      {run.retriedByRunIds.length > 0 && (
        <Fact label="Retried by">
          <span className="flex flex-col gap-0.5">
            {run.retriedByRunIds.map((id, i) => (
              <Link
                key={id}
                to={paths.run(workspace.id, id)}
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                <Link2 className="size-3.5" aria-hidden />
                Retry {i + 1}
              </Link>
            ))}
          </span>
        </Fact>
      )}
    </dl>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Banner({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="bg-primary-soft text-ink flex items-start gap-2 rounded-lg px-4 py-2.5 text-sm"
    >
      <Icon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
