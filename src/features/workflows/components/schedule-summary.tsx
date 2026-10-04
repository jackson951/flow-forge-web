import { CalendarClock, CirclePause, History, Rocket, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatDateTime, formatRelative } from '@/lib/format';
import { paths } from '@/lib/routes';
import type { WorkflowSchedule } from '@/types/api';

interface ScheduleSummaryProps {
  workspaceId: string;
  /** The active version's schedule (`workflow.schedule`). */
  schedule: WorkflowSchedule | null;
  /** The draft's trigger is a schedule. */
  draftScheduled: boolean;
  archived: boolean;
}

/**
 * The workflow's schedule at a glance (Part 17, FR-17.7/17.8): next run, last occurrence with
 * its run, or why it is not running.
 */
export function ScheduleSummary({
  workspaceId,
  schedule,
  draftScheduled,
  archived,
}: ScheduleSummaryProps) {
  if (!schedule) {
    if (!draftScheduled) return null;
    return (
      <Strip icon={Rocket}>
        <span>Scheduled trigger — publish to start the schedule.</span>
      </Strip>
    );
  }
  const running = schedule.active && !archived;
  return (
    <Strip icon={running ? CalendarClock : CirclePause}>
      <span className="font-medium">{running ? 'Scheduled' : 'Schedule stopped'}</span>
      <span>{schedule.description}</span>
      {running && schedule.nextRunAt && (
        <span>
          Next run {formatRelative(schedule.nextRunAt)} ({formatDateTime(schedule.nextRunAt)})
        </span>
      )}
      {!running && (
        <span className="text-muted">
          {archived
            ? 'Archived. Unarchiving resumes it from then on, without catching up missed runs.'
            : 'It has no further runs.'}
        </span>
      )}
      {schedule.lastOccurrenceAt && (
        <span className="inline-flex items-center gap-1">
          <History className="size-3.5" aria-hidden />
          Last scheduled run {formatRelative(schedule.lastOccurrenceAt)}
          {schedule.lastRunId && (
            <>
              {' · '}
              <Link
                to={paths.run(workspaceId, schedule.lastRunId)}
                className="text-primary font-medium hover:underline"
              >
                open run
              </Link>
            </>
          )}
        </span>
      )}
    </Strip>
  );
}

function Strip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <section
      aria-label="Schedule"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-indigo-100 bg-indigo-50/60 px-4 py-2 text-sm text-indigo-950"
    >
      <Icon className="size-4 shrink-0 text-indigo-600" aria-hidden />
      {children}
    </section>
  );
}
