import { CalendarClock } from 'lucide-react';
import { formatInZone } from '@/features/workflows/config/schedule-model';
import type { RunDetail } from '@/types/api';
import { formatDuration } from '../run-helpers';

interface ScheduleTrigger {
  scheduledFor: string;
  triggeredAt?: string;
  timezone?: string;
}

function scheduleTrigger(input: unknown): ScheduleTrigger | null {
  if (!input || typeof input !== 'object') return null;
  const v = input as Record<string, unknown>;
  if (typeof v.scheduledFor !== 'string' || Number.isNaN(Date.parse(v.scheduledFor))) return null;
  return {
    scheduledFor: v.scheduledFor,
    triggeredAt: typeof v.triggeredAt === 'string' ? v.triggeredAt : undefined,
    timezone: typeof v.timezone === 'string' ? v.timezone : undefined,
  };
}

/**
 * For a scheduled run (Part 17, FR-17.9): the occurrence it is for, in the schedule's timezone,
 * and how long after that time it was queued.
 */
export function ScheduledRunInfo({ run }: { run: RunDetail }) {
  const t = run.triggerSource === 'SCHEDULE' ? scheduleTrigger(run.triggerInput) : null;
  if (!t) return null;
  const zone = t.timezone ?? 'UTC';
  const lagMs = Date.parse(run.queuedAt) - Date.parse(t.scheduledFor);
  let when: string;
  try {
    when = formatInZone(new Date(t.scheduledFor), zone);
  } catch {
    when = new Date(t.scheduledFor).toISOString();
  }
  return (
    <section
      aria-label="Schedule"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-2.5 text-sm text-indigo-950"
    >
      <CalendarClock className="size-4 shrink-0 text-indigo-600" aria-hidden />
      <span>
        Scheduled for <strong>{when}</strong> ({zone})
      </span>
      {lagMs >= 0 && (
        <span className="text-indigo-900/80">
          started {formatDuration(lagMs)} after its scheduled time
        </span>
      )}
    </section>
  );
}
