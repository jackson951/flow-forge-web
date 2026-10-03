import {
  Activity,
  CalendarRange,
  CircleCheckBig,
  CircleSlash,
  CircleX,
  Clock,
  FilterX,
  History,
  List,
  LoaderCircle,
  Radio,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button, Select, Skeleton, StatusBadge } from '@/components/ui';
import { useWorkflowList } from '@/features/workflows/api/workflows.api';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { isApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';
import { paths } from '@/lib/routes';
import type { RunFilters, RunStatus, TriggerSource } from '@/types/api';
import { isActive, useRunList } from '../api/runs.api';
import { ERROR_CATEGORIES, formatDuration, TRIGGER_SOURCES } from '../run-helpers';

const STATUSES: { label: string; icon: LucideIcon; status?: RunStatus }[] = [
  { label: 'All', icon: List },
  { label: 'Running', icon: LoaderCircle, status: 'RUNNING' },
  { label: 'Queued', icon: Clock, status: 'QUEUED' },
  { label: 'Succeeded', icon: CircleCheckBig, status: 'SUCCEEDED' },
  { label: 'Failed', icon: CircleX, status: 'FAILED' },
  { label: 'Cancelled', icon: CircleSlash, status: 'CANCELLED' },
];
const RUN_STATUSES = STATUSES.flatMap((s) => (s.status ? [s.status] : []));
const SOURCES = Object.keys(TRIGGER_SOURCES) as TriggerSource[];

/** YYYY-MM-DD (local) → ISO instant at the start of that day. */
const dayStart = (day: string) => new Date(`${day}T00:00:00`).toISOString();
const nextDayStart = (day: string) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
};

/** Run history with filters in the URL (Part 08, FR-08.3); live while runs are active. */
export function RunsListPage() {
  const workspace = useWorkspace();
  const [params, setParams] = useSearchParams();
  const status = RUN_STATUSES.find((s) => s === params.get('status'));
  const triggerSource = SOURCES.find((s) => s === params.get('trigger'));
  const workflowId = params.get('workflow') ?? undefined;
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const filters = useMemo<Omit<RunFilters, 'cursor'>>(
    () => ({
      ...(status && { status }),
      ...(triggerSource && { triggerSource }),
      ...(workflowId && { workflowId }),
      ...(from && { from: dayStart(from) }),
      ...(to && { to: nextDayStart(to) }),
    }),
    [status, triggerSource, workflowId, from, to],
  );
  const runs = useRunList(workspace.id, filters);
  const workflows = useWorkflowList(workspace.id);
  const items = runs.data?.pages.flatMap((p) => p.items) ?? [];
  const live = items.some((r) => isActive(r.status));
  const filtered = Object.keys(filters).length > 0;

  /** Changes one URL filter (replace: filters do not pile up in the history). */
  const set = (key: string, value: string | undefined) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  return (
    <PageContainer>
      <PageHeader
        title="Runs"
        icon={Activity}
        description="Every time a workflow ran, what happened at each step and how long it took."
      />

      <nav aria-label="Filter by status" className="border-line flex flex-wrap gap-1 border-b">
        {STATUSES.map((s) => {
          const active = s.status === status;
          return (
            <button
              key={s.label}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => set('status', s.status)}
              className={cn(
                '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm',
                active
                  ? 'border-primary text-primary font-medium'
                  : 'text-muted hover:text-ink border-transparent',
              )}
            >
              <s.icon className="size-4" aria-hidden />
              {s.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 space-y-1 text-sm sm:flex-none">
          <span className="text-muted flex items-center gap-1 text-xs font-medium">
            <Workflow className="size-3.5" aria-hidden />
            Workflow
          </span>
          <Select
            aria-label="Workflow"
            value={workflowId ?? ''}
            onChange={(e) => set('workflow', e.target.value || undefined)}
          >
            <option value="">All workflows</option>
            {workflows.data?.pages
              .flatMap((p) => p.items)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted text-xs font-medium">Trigger</span>
          <Select
            aria-label="Trigger"
            value={triggerSource ?? ''}
            onChange={(e) => set('trigger', e.target.value || undefined)}
          >
            <option value="">Any trigger</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {TRIGGER_SOURCES[s].label}
              </option>
            ))}
          </Select>
        </label>
        <fieldset className="space-y-1 text-sm">
          <legend className="text-muted flex items-center gap-1 text-xs font-medium">
            <CalendarRange className="size-3.5" aria-hidden />
            Started between
          </legend>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              aria-label="From date"
              value={from}
              max={to || undefined}
              onChange={(e) => set('from', e.target.value || undefined)}
              className="border-line bg-surface h-10 rounded-md border px-2 text-sm"
            />
            <span className="text-muted">–</span>
            <input
              type="date"
              aria-label="To date"
              value={to}
              min={from || undefined}
              onChange={(e) => set('to', e.target.value || undefined)}
              className="border-line bg-surface h-10 rounded-md border px-2 text-sm"
            />
          </div>
        </fieldset>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
            <FilterX className="size-4" aria-hidden />
            Clear filters
          </Button>
        )}
        {live && (
          <span
            className="text-status-running ml-auto inline-flex items-center gap-1 text-sm"
            role="status"
          >
            <Radio className="size-4 animate-pulse" aria-hidden />
            Updating live
          </span>
        )}
      </div>

      <div className="mt-4">
        {runs.isPending && (
          <div className="space-y-2" aria-label="Loading runs">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}
        {runs.isError && (
          <ErrorState
            message={runs.error.message}
            requestId={isApiError(runs.error) ? runs.error.requestId : undefined}
            onRetry={() => void runs.refetch()}
          />
        )}
        {runs.isSuccess && !items.length && (
          <EmptyState
            icon={History}
            title={filtered ? 'No runs match these filters' : 'No runs yet'}
            description={
              filtered
                ? 'Try another status, workflow or date range.'
                : 'Runs appear here as soon as a published workflow is triggered or run manually.'
            }
          />
        )}
        {items.length > 0 && (
          <div className="border-line bg-surface overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="text-muted border-line border-b text-left text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Workflow</th>
                  <th className="px-4 py-2 font-medium">Trigger</th>
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {items.map((r) => {
                  const Source = TRIGGER_SOURCES[r.triggerSource];
                  const ErrorIcon = r.error ? ERROR_CATEGORIES[r.error.category].icon : null;
                  return (
                    <tr key={r.id} className="hover:bg-canvas/60">
                      <td className="px-4 py-2.5">
                        <Link
                          to={paths.run(workspace.id, r.id)}
                          aria-label={`Open run of ${r.workflowName}, ${r.status.toLowerCase()}`}
                        >
                          <StatusBadge status={r.status} />
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          to={paths.run(workspace.id, r.id)}
                          className="hover:text-primary font-medium"
                        >
                          {r.workflowName}
                        </Link>
                        <span className="text-muted ml-1.5 text-xs">v{r.version}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-muted inline-flex items-center gap-1">
                          <Source.icon className="size-3.5" aria-hidden />
                          {Source.label}
                        </span>
                      </td>
                      <td
                        className="text-muted px-4 py-2.5 whitespace-nowrap"
                        title={formatDateTime(r.createdAt)}
                      >
                        {formatRelative(r.createdAt)}
                      </td>
                      <td className="text-muted px-4 py-2.5 tabular-nums">
                        {formatDuration(r.durationMs)}
                      </td>
                      <td className="max-w-xs px-4 py-2.5">
                        {r.error && ErrorIcon && (
                          <span
                            className="text-status-failed flex items-center gap-1.5"
                            title={r.error.description}
                          >
                            <ErrorIcon className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">
                              {ERROR_CATEGORIES[r.error.category].label}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {runs.hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => void runs.fetchNextPage()}
              disabled={runs.isFetchingNextPage}
            >
              {runs.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
