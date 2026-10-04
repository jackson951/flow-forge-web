import { Cron } from 'croner';

/**
 * The `schedule.trigger` schedule (Part 17), mirroring the backend's schedule module
 * (flowforge-api `src/engine/schedule/schedule.ts`, same cron library). The preview here is for
 * display only: the backend validates the draft and computes the real `nextRunAt`.
 */

/** Interval lengths that divide the hour or the day (backend INTERVAL_MINUTES). */
export const INTERVAL_MINUTES = [
  1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60, 120, 180, 240, 360, 480, 720, 1440,
] as const;

export type ScheduleKind =
  'interval' | 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'cron';

export type ScheduleSpec =
  | { kind: 'interval'; timezone: string; everyMinutes: number }
  | { kind: 'hourly'; timezone: string; minute: number }
  | { kind: 'daily'; timezone: string; time: string }
  | { kind: 'weekdays'; timezone: string; time: string }
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  | { kind: 'weekly'; timezone: string; time: string; daysOfWeek: number[] }
  | { kind: 'monthly'; timezone: string; time: string; dayOfMonth: number | 'last' }
  | { kind: 'cron'; timezone: string; expression: string };

export const KIND_LABELS: Record<ScheduleKind, string> = {
  interval: 'Every N minutes',
  hourly: 'Hourly',
  daily: 'Daily',
  weekdays: 'Weekdays (Mon–Fri)',
  weekly: 'Weekly',
  monthly: 'Monthly',
  cron: 'Custom (cron)',
};

export const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The browser's IANA timezone, or UTC. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** IANA zones the runtime knows (no data file), with UTC first. */
export function timeZones(): string[] {
  const all =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return ['UTC', ...all.filter((z) => z !== 'UTC')];
}

export function isValidTimeZone(zone: string): boolean {
  if (!zone || (!zone.includes('/') && zone !== 'UTC')) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** "+02:00" for a zone at an instant. */
export function utcOffset(zone: string, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    const offset = part?.replace('GMT', '') ?? '';
    return offset === '' ? '+00:00' : offset;
  } catch {
    return '';
  }
}

/** "Africa/Johannesburg (UTC+02:00)". */
export function zoneLabel(zone: string, at?: Date): string {
  const offset = utcOffset(zone, at);
  return offset ? `${zone} (UTC${offset})` : zone;
}

/** A sensible spec when switching kind, keeping the timezone (and time where it applies). */
export function defaultSpec(kind: ScheduleKind, from?: Partial<ScheduleSpec>): ScheduleSpec {
  const timezone = from?.timezone || browserTimeZone();
  const time = from && 'time' in from && from.time ? from.time : '09:00';
  switch (kind) {
    case 'interval':
      return { kind, timezone, everyMinutes: 15 };
    case 'hourly':
      return { kind, timezone, minute: 0 };
    case 'daily':
    case 'weekdays':
      return { kind, timezone, time };
    case 'weekly':
      return { kind, timezone, time, daysOfWeek: [1] };
    case 'monthly':
      return { kind, timezone, time, dayOfMonth: 1 };
    case 'cron':
      return { kind, timezone, expression: '0 9 * * 1-5' };
  }
}

/** The stored config, read leniently: null when it is not a schedule this app understands. */
export function readSpec(value: unknown): ScheduleSpec | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.kind !== 'string' || !(v.kind in KIND_LABELS)) return null;
  return { ...v, timezone: typeof v.timezone === 'string' ? v.timezone : '' } as ScheduleSpec;
}

/** Friendly kind → 5-field cron (backend compileSchedule). */
export function compileCron(spec: ScheduleSpec): string {
  const at = (hhmm: string) => {
    const [hh, mm] = hhmm.split(':').map(Number);
    return `${mm} ${hh}`;
  };
  switch (spec.kind) {
    case 'interval':
      if (spec.everyMinutes === 1) return '* * * * *';
      if (spec.everyMinutes < 60) return `*/${spec.everyMinutes} * * * *`;
      if (spec.everyMinutes === 1440) return '0 0 * * *';
      if (spec.everyMinutes === 60) return '0 * * * *';
      return `0 */${spec.everyMinutes / 60} * * *`;
    case 'hourly':
      return `${spec.minute} * * * *`;
    case 'daily':
      return `${at(spec.time)} * * *`;
    case 'weekdays':
      return `${at(spec.time)} * * 1-5`;
    case 'weekly':
      return `${at(spec.time)} * * ${[...spec.daysOfWeek]
        .sort((a, b) => a - b)
        .map((d) => d % 7)
        .join(',')}`;
    case 'monthly':
      return `${at(spec.time)} ${spec.dayOfMonth === 'last' ? 'L' : spec.dayOfMonth} * *`;
    case 'cron':
      return spec.expression.trim().split(/\s+/).join(' ');
  }
}

/** Plain-language summary, e.g. "Weekdays at 07:00 (Africa/Johannesburg)" (backend wording). */
export function describeSpec(spec: ScheduleSpec): string {
  const when = (() => {
    switch (spec.kind) {
      case 'interval':
        return spec.everyMinutes === 1 ? 'Every minute' : `Every ${spec.everyMinutes} minutes`;
      case 'hourly':
        return `Hourly at :${String(spec.minute).padStart(2, '0')}`;
      case 'daily':
        return `Daily at ${spec.time}`;
      case 'weekdays':
        return `Weekdays at ${spec.time}`;
      case 'weekly':
        return `Weekly on ${[...spec.daysOfWeek]
          .sort((a, b) => a - b)
          .map((d) => DAY_NAMES[d])
          .join(', ')} at ${spec.time}`;
      case 'monthly':
        return spec.dayOfMonth === 'last'
          ? `Monthly on the last day at ${spec.time}`
          : `Monthly on day ${spec.dayOfMonth} at ${spec.time}`;
      case 'cron':
        return `Cron "${spec.expression}"`;
    }
  })();
  return `${when} (${spec.timezone})`;
}

/** Client-side problems that make a preview impossible; the server's issues win when present. */
export function specProblem(spec: ScheduleSpec): string | null {
  if (!isValidTimeZone(spec.timezone)) return 'Choose a timezone';
  if ('time' in spec && !TIME_PATTERN.test(spec.time)) return 'Use a 24-hour time "HH:mm"';
  if (spec.kind === 'weekly' && !spec.daysOfWeek.length) return 'Choose at least one day';
  if (spec.kind === 'cron' && spec.expression.trim().split(/\s+/).length !== 5) {
    return 'Use a standard 5-field cron expression (minute hour day month weekday)';
  }
  return null;
}

export interface Occurrence {
  at: Date;
  /** Set when this occurrence is affected by a daylight-saving change in the schedule's zone. */
  dst?: 'shifted' | 'repeated-hour';
}

/**
 * The next `count` occurrences after `from` (backend nextOccurrence semantics), each flagged
 * when a daylight-saving change in the schedule's zone happens just before it. Null when the
 * spec cannot be evaluated (the error is the reason).
 */
export function nextOccurrences(
  spec: ScheduleSpec,
  count = 5,
  from: Date = new Date(),
): { occurrences: Occurrence[] } | { error: string } {
  const problem = specProblem(spec);
  if (problem) return { error: problem };
  let cron: Cron;
  try {
    cron = new Cron(compileCron(spec), { timezone: spec.timezone, paused: true });
  } catch (err) {
    return { error: `Invalid schedule: ${(err as Error).message}` };
  }
  const occurrences: Occurrence[] = [];
  let cursor = from;
  let previousOffset = utcOffset(spec.timezone, from);
  while (occurrences.length < count) {
    const next = cron.nextRun(cursor);
    if (!next || next.getTime() <= cursor.getTime()) break;
    const offset = utcOffset(spec.timezone, next);
    const occurrence: Occurrence = { at: next };
    if (offset !== previousOffset) {
      // Clocks moved since the previous occurrence: forward = a wall time may not exist (it runs
      // shifted); back = an hour repeats (it runs once, at its first occurrence).
      occurrence.dst =
        offsetMinutes(offset) > offsetMinutes(previousOffset) ? 'shifted' : 'repeated-hour';
    }
    occurrences.push(occurrence);
    previousOffset = offset;
    cursor = next;
  }
  if (!occurrences.length) return { error: 'This schedule never runs' };
  return { occurrences };
}

function offsetMinutes(offset: string): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** "Mon 6 Oct, 07:00" in a zone. */
export function formatInZone(at: Date, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);
}
