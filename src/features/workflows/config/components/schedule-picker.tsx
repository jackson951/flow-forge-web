import { CalendarClock, Globe, Info, TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import { Field, Input, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useConfigScope } from '../config-scope';
import {
  browserTimeZone,
  DAY_NAMES,
  defaultSpec,
  describeSpec,
  formatInZone,
  INTERVAL_MINUTES,
  KIND_LABELS,
  nextOccurrences,
  zoneLabel,
  timeZones,
  type ScheduleKind,
  type ScheduleSpec,
} from '../schedule-model';

interface SchedulePickerProps {
  value: ScheduleSpec;
  onChange: (next: ScheduleSpec) => void;
  /** Message for a field of the schedule (`timezone`, `time`, …) or, without one, the whole. */
  fieldError: (field?: string) => string | undefined;
  /** Fixed "now" for tests. */
  now?: Date;
}

const intervalLabel = (n: number) =>
  n === 1
    ? 'Every minute'
    : n < 60
      ? `Every ${n} minutes`
      : n === 60
        ? 'Every hour'
        : n === 1440
          ? 'Every day (00:00)'
          : `Every ${n / 60} hours`;

/**
 * Friendly schedule picker (Part 17, FR-17.1–17.5): kinds first, cron as the advanced option,
 * an explicit IANA timezone, and a preview of the next occurrences with daylight-saving notes.
 * Reused by the http.poll trigger (Part 20).
 */
export function SchedulePicker({ value, onChange, fieldError, now }: SchedulePickerProps) {
  const { readOnly } = useConfigScope();
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const zones = timeZones();
  const set = (patch: Partial<ScheduleSpec>) => onChange({ ...value, ...patch } as ScheduleSpec);

  return (
    <div className="space-y-4">
      <Field id={id('kind')} label="Runs" error={fieldError()}>
        <Select
          id={id('kind')}
          aria-describedby={`${id('kind')}-msg`}
          value={value.kind}
          disabled={readOnly}
          aria-invalid={!!fieldError() || undefined}
          onChange={(e) => onChange(defaultSpec(e.target.value as ScheduleKind, value))}
        >
          {(Object.keys(KIND_LABELS) as ScheduleKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </Select>
      </Field>

      {value.kind === 'interval' && (
        <Field
          id={id('every')}
          label="Interval"
          error={fieldError('everyMinutes')}
          hint="Runs are aligned to the hour or the day. The server may set a minimum interval."
        >
          <Select
            id={id('every')}
            aria-describedby={`${id('every')}-msg`}
            value={String(value.everyMinutes)}
            disabled={readOnly}
            aria-invalid={!!fieldError('everyMinutes') || undefined}
            onChange={(e) => set({ everyMinutes: Number(e.target.value) })}
          >
            {INTERVAL_MINUTES.map((n) => (
              <option key={n} value={n}>
                {intervalLabel(n)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {value.kind === 'hourly' && (
        <Field id={id('minute')} label="Minute past the hour" error={fieldError('minute')}>
          <Input
            id={id('minute')}
            aria-describedby={`${id('minute')}-msg`}
            type="number"
            min={0}
            max={59}
            value={value.minute}
            disabled={readOnly}
            aria-invalid={!!fieldError('minute') || undefined}
            onChange={(e) => set({ minute: clampMinute(e.target.value) })}
          />
        </Field>
      )}

      {value.kind === 'weekly' && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Days</legend>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => {
              const on = value.daysOfWeek.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  disabled={readOnly}
                  onClick={() =>
                    set({
                      daysOfWeek: on
                        ? value.daysOfWeek.filter((x) => x !== d)
                        : [...value.daysOfWeek, d].sort((a, b) => a - b),
                    })
                  }
                  className={cn(
                    'h-8 min-w-11 rounded-md border px-2 text-sm font-medium',
                    on ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface',
                  )}
                >
                  {DAY_NAMES[d]}
                </button>
              );
            })}
          </div>
          {fieldError('daysOfWeek') && (
            <p role="alert" className="text-status-failed text-sm">
              {fieldError('daysOfWeek')}
            </p>
          )}
        </fieldset>
      )}

      {value.kind === 'monthly' && (
        <Field
          id={id('day')}
          label="Day of the month"
          error={fieldError('dayOfMonth')}
          hint={
            typeof value.dayOfMonth === 'number' && value.dayOfMonth > 28
              ? `Months without day ${value.dayOfMonth} are skipped. Choose “Last day” to run every month.`
              : undefined
          }
        >
          <Select
            id={id('day')}
            aria-describedby={`${id('day')}-msg`}
            value={String(value.dayOfMonth)}
            disabled={readOnly}
            aria-invalid={!!fieldError('dayOfMonth') || undefined}
            onChange={(e) =>
              set({ dayOfMonth: e.target.value === 'last' ? 'last' : Number(e.target.value) })
            }
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value="last">Last day</option>
          </Select>
        </Field>
      )}

      {'time' in value && (
        <Field id={id('time')} label="Time (24-hour)" error={fieldError('time')}>
          <Input
            id={id('time')}
            aria-describedby={`${id('time')}-msg`}
            type="time"
            step={60}
            value={value.time}
            disabled={readOnly}
            aria-invalid={!!fieldError('time') || undefined}
            onChange={(e) => set({ time: e.target.value })}
          />
        </Field>
      )}

      {value.kind === 'cron' && (
        <Field
          id={id('cron')}
          label="Cron expression"
          error={fieldError('expression')}
          hint="Five fields: minute hour day-of-month month day-of-week, e.g. 0 9 * * 1-5."
        >
          <Input
            id={id('cron')}
            aria-describedby={`${id('cron')}-msg`}
            value={value.expression}
            disabled={readOnly}
            spellCheck={false}
            className="font-mono"
            aria-invalid={!!fieldError('expression') || undefined}
            onChange={(e) => set({ expression: e.target.value })}
          />
        </Field>
      )}

      <Field
        id={id('zone')}
        label="Timezone"
        error={fieldError('timezone')}
        hint={value.timezone ? zoneLabel(value.timezone, now) : 'Start typing, e.g. Johannesburg'}
      >
        <Input
          id={id('zone')}
          aria-describedby={`${id('zone')}-msg`}
          list={id('zones')}
          value={value.timezone}
          disabled={readOnly}
          autoComplete="off"
          aria-invalid={!!fieldError('timezone') || undefined}
          onChange={(e) => set({ timezone: e.target.value.trim() })}
        />
        <datalist id={id('zones')}>
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
      </Field>

      <SchedulePreview spec={value} now={now} />
    </div>
  );
}

const clampMinute = (raw: string) => Math.min(59, Math.max(0, Math.trunc(Number(raw) || 0)));

/** Summary + next occurrences in the schedule's zone and the viewer's (FR-17.3/17.4). */
export function SchedulePreview({ spec, now }: { spec: ScheduleSpec; now?: Date }) {
  const local = browserTimeZone();
  const result = nextOccurrences(spec, 5, now);
  const showLocal = local !== spec.timezone;
  const dst = 'occurrences' in result && result.occurrences.some((o) => o.dst);
  return (
    <section
      aria-label="Schedule preview"
      className="bg-canvas space-y-2 rounded-lg px-3 py-2.5 text-sm"
    >
      <p className="flex items-start gap-1.5 font-medium">
        <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden />
        {describeSpec(spec)}
      </p>
      {'error' in result ? (
        <p className="text-muted flex items-start gap-1.5">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {result.error}
        </p>
      ) : (
        <>
          <p className="text-muted text-xs">
            Next runs (preview — the server confirms after publishing):
          </p>
          <ol className="space-y-0.5" aria-label="Next runs">
            {result.occurrences.map((o) => (
              <li key={o.at.toISOString()} className="flex flex-wrap items-center gap-x-2">
                <span className="font-mono text-xs">{formatInZone(o.at, spec.timezone)}</span>
                {showLocal && (
                  <span className="text-muted inline-flex items-center gap-1 text-xs">
                    <Globe className="size-3" aria-hidden />
                    {formatInZone(o.at, local)} your time
                  </span>
                )}
                {o.dst && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                    <TriangleAlert className="size-3" aria-hidden />
                    daylight-saving change
                  </span>
                )}
              </li>
            ))}
          </ol>
          {dst && (
            <p className="text-muted text-xs">
              On daylight-saving changes a time that does not exist runs once, shifted forward, and
              a time that occurs twice runs once, at its first occurrence.
            </p>
          )}
        </>
      )}
    </section>
  );
}
