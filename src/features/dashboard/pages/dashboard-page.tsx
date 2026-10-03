import {
  Activity,
  ArrowRight,
  CircleCheck,
  CircleCheckBig,
  CircleDashed,
  CircleSlash,
  CircleX,
  Clock,
  Flame,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  Plug,
  RefreshCw,
  Rocket,
  TriangleAlert,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ProviderIcon } from '@/components/brand/provider-icons';
import { PROVIDER_NAMES } from '@/components/brand/providers';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui';
import { useConnections } from '@/features/integrations/api/integrations.api';
import { ERROR_CATEGORIES } from '@/features/runs/run-helpers';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { isApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';
import { paths } from '@/lib/routes';
import type { RunStatus, StatusCounts } from '@/types/api';
import { useDashboard, useOnboarding } from '../api/dashboard.api';
import { successRate } from '../health';

const STATUS_ROWS: {
  status: RunStatus;
  label: string;
  icon: LucideIcon;
  text: string;
  bar: string;
}[] = [
  {
    status: 'SUCCEEDED',
    label: 'Succeeded',
    icon: CircleCheckBig,
    text: 'text-status-succeeded',
    bar: 'bg-status-succeeded',
  },
  {
    status: 'FAILED',
    label: 'Failed',
    icon: CircleX,
    text: 'text-status-failed',
    bar: 'bg-status-failed',
  },
  {
    status: 'RUNNING',
    label: 'Running',
    icon: LoaderCircle,
    text: 'text-status-running',
    bar: 'bg-status-running',
  },
  {
    status: 'QUEUED',
    label: 'Queued',
    icon: Clock,
    text: 'text-status-queued',
    bar: 'bg-status-queued',
  },
  {
    status: 'CANCELLED',
    label: 'Cancelled',
    icon: CircleSlash,
    text: 'text-status-cancelled',
    bar: 'bg-status-cancelled',
  },
];

/** "Is my automation healthy?" at a glance (Part 09). */
export function DashboardPage() {
  const workspace = useWorkspace();
  const dashboard = useDashboard(workspace.id);
  const connections = useConnections(workspace.id);
  const onboarding = useOnboarding(workspace.id);

  const attention = (connections.data ?? []).filter((c) => c.status === 'NEEDS_ATTENTION');
  const steps = onboarding.data && {
    connected: (connections.data ?? []).length > 0,
    ...onboarding.data,
  };
  const onboardingDone =
    steps && steps.connected && steps.hasWorkflow && steps.hasPublished && steps.hasRun;

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        icon={LayoutDashboard}
        description="How your workflows are running across this workspace."
      />
      {dashboard.data && (
        <p
          className="text-muted -mt-2 mb-4 flex items-center gap-1.5 text-xs"
          title={formatDateTime(dashboard.data.generatedAt)}
        >
          <RefreshCw
            className={cn('size-3.5', dashboard.isFetching && 'animate-spin')}
            aria-hidden
          />
          Updated {new Date(dashboard.data.generatedAt).toLocaleTimeString()} · refreshes every 30 s
        </p>
      )}

      {steps && !onboardingDone && <Onboarding steps={steps} />}

      {attention.length > 0 && (
        <section
          aria-label="Connections needing attention"
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <TriangleAlert className="size-4" aria-hidden />
            {attention.length === 1
              ? 'A connection needs attention'
              : `${attention.length} connections need attention`}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {attention.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                <ProviderIcon provider={c.provider} className="size-4" />
                <span className="font-medium">{c.accountLabel ?? c.externalAccountId}</span>
                <span className="text-muted">
                  ({PROVIDER_NAMES[c.provider]}) — steps using it fail until it is reconnected.
                </span>
                <Link
                  to={paths.integrations(workspace.id)}
                  className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
                >
                  <Plug className="size-3.5" aria-hidden />
                  Reconnect
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dashboard.isPending && (
        <div className="grid gap-4 md:grid-cols-2" aria-label="Loading dashboard">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      )}
      {dashboard.isError && (
        <ErrorState
          message={dashboard.error.message}
          requestId={isApiError(dashboard.error) ? dashboard.error.requestId : undefined}
          onRetry={() => void dashboard.refetch()}
        />
      )}
      {dashboard.data && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <HealthCard title="Last 24 hours" counts={dashboard.data.runs.last24h} />
            <HealthCard title="Last 7 days" counts={dashboard.data.runs.last7d} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Top failing workflows" subtitle="Last 7 days" icon={Flame}>
              {dashboard.data.topFailingWorkflows.length === 0 ? (
                <Calm text="No failed runs in the last 7 days." />
              ) : (
                <ul className="divide-line divide-y">
                  {dashboard.data.topFailingWorkflows.map((w) => (
                    <li key={w.workflowId}>
                      <Link
                        to={`${paths.runs(workspace.id)}?status=FAILED&workflow=${w.workflowId}`}
                        className="hover:bg-canvas flex items-center gap-3 rounded-md px-2 py-2 text-sm"
                        aria-label={`${w.workflowName ?? 'Deleted workflow'}: ${w.failedRuns} failed runs — show them`}
                      >
                        <Workflow className="text-muted size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {w.workflowName ?? 'Deleted workflow'}
                        </span>
                        <span className="text-status-failed inline-flex items-center gap-1 tabular-nums">
                          <CircleX className="size-3.5" aria-hidden />
                          {w.failedRuns} failed
                        </span>
                        <ArrowRight className="text-muted size-4" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Recent failures" subtitle="Latest 10" icon={CircleX}>
              {dashboard.data.recentFailures.length === 0 ? (
                <Calm text="No failed runs." />
              ) : (
                <ul className="divide-line divide-y">
                  {dashboard.data.recentFailures.map((f) => {
                    const info = f.error ? ERROR_CATEGORIES[f.error.category] : null;
                    const Icon = info?.icon ?? CircleX;
                    return (
                      <li key={f.runId}>
                        <Link
                          to={paths.run(workspace.id, f.runId)}
                          className="hover:bg-canvas flex items-start gap-3 rounded-md px-2 py-2 text-sm"
                          aria-label={`Failed run of ${f.workflowName}: open`}
                        >
                          <Icon className="text-status-failed mt-0.5 size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{f.workflowName}</span>
                            <span className="text-muted block truncate">
                              {info ? `${info.label} — ${f.error!.description}` : 'Failed'}
                            </span>
                          </span>
                          <time
                            dateTime={f.createdAt}
                            title={formatDateTime(f.createdAt)}
                            className="text-muted shrink-0 text-xs"
                          >
                            {formatRelative(f.createdAt)}
                          </time>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
          {dashboard.data.runs.last7d.total === 0 && onboardingDone && (
            <EmptyState
              icon={Activity}
              title="Quiet week"
              description="No runs in the last 7 days."
            />
          )}
        </div>
      )}
    </PageContainer>
  );
}

function HealthCard({ title, counts }: { title: string; counts: StatusCounts }) {
  const workspace = useWorkspace();
  const rate = successRate(counts);
  return (
    <section
      aria-label={`Runs, ${title.toLowerCase()}`}
      className="border-line bg-surface rounded-xl border p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-muted text-sm font-medium">{title}</h2>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {counts.total}
            <span className="text-muted ml-1.5 text-sm font-normal">
              run{counts.total === 1 ? '' : 's'}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted text-xs">Success rate</p>
          <p
            className={cn(
              'text-2xl font-semibold tabular-nums',
              rate === null
                ? 'text-muted'
                : rate >= 95
                  ? 'text-status-succeeded'
                  : rate >= 80
                    ? 'text-status-warning'
                    : 'text-status-failed',
            )}
          >
            {rate === null ? '—' : `${rate}%`}
          </p>
        </div>
      </div>
      {counts.total > 0 && (
        <div className="bg-canvas mt-4 flex h-2 overflow-hidden rounded-full" aria-hidden>
          {STATUS_ROWS.map((s) =>
            counts[s.status] ? (
              <span
                key={s.status}
                className={s.bar}
                style={{ width: `${(counts[s.status] / counts.total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      )}
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {STATUS_ROWS.map((s) => (
          <li key={s.status} className="flex items-center gap-1.5">
            <s.icon className={cn('size-3.5', s.text)} aria-hidden />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto font-medium tabular-nums sm:ml-1">{counts[s.status]}</span>
          </li>
        ))}
      </ul>
      <Link
        to={paths.runs(workspace.id)}
        className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
      >
        View runs
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </section>
  );
}

function Card({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="border-line bg-surface rounded-xl border p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="text-muted size-4" aria-hidden />
        {title}
        <span className="text-muted ml-auto text-xs font-normal">{subtitle}</span>
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Calm({ text }: { text: string }) {
  return (
    <p className="text-muted flex items-center gap-1.5 px-2 py-3 text-sm">
      <CircleCheck className="text-status-succeeded size-4" aria-hidden />
      {text}
    </p>
  );
}

function Onboarding({
  steps,
}: {
  steps: { connected: boolean; hasWorkflow: boolean; hasPublished: boolean; hasRun: boolean };
}) {
  const workspace = useWorkspace();
  const items: {
    done: boolean;
    label: string;
    hint: string;
    to: string;
    cta: string;
    icon: LucideIcon;
  }[] = [
    {
      done: steps.connected,
      label: 'Connect an integration',
      hint: 'GitHub, Slack or Microsoft To Do — for triggers and actions.',
      to: paths.integrations(workspace.id),
      cta: 'Open integrations',
      icon: Plug,
    },
    {
      done: steps.hasWorkflow,
      label: 'Create a workflow',
      hint: 'A trigger, optional conditions and actions.',
      to: paths.workflows(workspace.id),
      cta: 'Go to workflows',
      icon: Workflow,
    },
    {
      done: steps.hasPublished,
      label: 'Publish it',
      hint: 'Publishing makes a version that triggers and runs use.',
      to: paths.workflows(workspace.id),
      cta: 'Open a workflow',
      icon: Rocket,
    },
    {
      done: steps.hasRun,
      label: 'See its first run',
      hint: 'Run it now, or wait for its trigger.',
      to: paths.runs(workspace.id),
      cta: 'Go to runs',
      icon: Activity,
    },
  ];
  const doneCount = items.filter((i) => i.done).length;
  return (
    <section
      aria-label="Getting started"
      className="border-primary/20 bg-primary-soft/40 mb-6 rounded-xl border p-5"
    >
      <h2 className="flex items-center gap-1.5 font-semibold">
        <ListChecks className="text-primary size-5" aria-hidden />
        Getting started
        <span className="text-muted ml-2 text-sm font-normal">
          {doneCount} of {items.length} done
        </span>
      </h2>
      <ol className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex flex-wrap items-center gap-3 text-sm">
            {item.done ? (
              <CircleCheckBig className="text-status-succeeded size-5 shrink-0" aria-label="Done" />
            ) : (
              <CircleDashed className="text-muted size-5 shrink-0" aria-label="To do" />
            )}
            <item.icon className="text-muted size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className={cn('font-medium', item.done && 'text-muted line-through')}>
                {item.label}
              </span>
              <span className="text-muted block">{item.hint}</span>
            </span>
            {!item.done && (
              <Link
                to={item.to}
                className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
              >
                {item.cta}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
