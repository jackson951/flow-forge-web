import { CircleAlert, CircleCheckBig, Hourglass, Radar, Sprout } from 'lucide-react';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { formatDateTime, formatRelative } from '@/lib/format';
import { usePollStatus } from '../api/poll.api';

/**
 * The poll trigger's state (Part 20, FR-20.8): schedule, first poll / seeded / OK / failing with
 * back-off, last polled and last success, items fired. Seen ids and cursors are never shown.
 */
export function PollStatusBar({
  workflowId,
  published,
}: {
  workflowId: string;
  published: boolean;
}) {
  const workspace = useWorkspace();
  const status = usePollStatus(workspace.id, workflowId, published);
  const s = status.data?.state;
  const schedule = status.data?.schedule;

  let icon = Hourglass;
  let label = 'Publish to start polling';
  let tone = 'text-muted';
  if (published && status.data) {
    if (!s) label = 'Waiting for the first poll';
    else if (s.status === 'FAILING') {
      icon = CircleAlert;
      label = `Failing (${s.consecutiveFailures} in a row)`;
      tone = 'text-status-failed';
    } else if (s.seeded && s.itemsFired === 0) {
      icon = Sprout;
      label = 'Existing items recorded; new ones will start runs';
      tone = 'text-teal-700';
    } else {
      icon = CircleCheckBig;
      label = 'Polling';
      tone = 'text-status-succeeded';
    }
  }
  const Icon = icon;

  return (
    <section
      aria-label="Poll status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-teal-100 bg-teal-50/60 px-4 py-2 text-sm text-teal-950"
    >
      <Radar className="size-4 shrink-0 text-teal-600" aria-hidden />
      <span className="font-medium">HTTP poll</span>
      {status.isError && (
        <span className="text-status-failed">
          Could not load the poll state. {status.error.message}
        </span>
      )}
      <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
      {schedule && <span>{schedule.description}</span>}
      {schedule?.active && schedule.nextRunAt && (
        <span title={formatDateTime(schedule.nextRunAt)}>
          Next poll {formatRelative(schedule.nextRunAt)}
        </span>
      )}
      {s?.lastPolledAt && (
        <span className="text-muted">Last polled {formatRelative(s.lastPolledAt)}</span>
      )}
      {s && s.status === 'FAILING' && s.lastSuccessAt && (
        <span className="text-muted">Last success {formatRelative(s.lastSuccessAt)}</span>
      )}
      {s && (
        <span className="text-muted">
          {s.itemsFired} item{s.itemsFired === 1 ? '' : 's'} fired
        </span>
      )}
      {s?.status === 'FAILING' && (
        <span className="text-status-failed w-full text-xs">
          {s.lastError ?? 'The last poll failed.'}
          {s.nextAttemptAt && ` Next attempt ${formatRelative(s.nextAttemptAt)} (backing off).`}
        </span>
      )}
    </section>
  );
}
