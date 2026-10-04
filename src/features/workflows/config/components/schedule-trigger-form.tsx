import { CalendarPlus, Info } from 'lucide-react';
import { Button } from '@/components/ui';
import { useConfigScope } from '../config-scope';
import { defaultSpec, readSpec } from '../schedule-model';
import type { FormProps } from './node-forms';
import { SchedulePicker } from './schedule-picker';

/** `schedule.trigger` settings (Part 17): `{ schedule: { kind, timezone, … } }`. */
export function ScheduleTriggerForm({ config, set, error }: FormProps) {
  const { readOnly } = useConfigScope();
  const spec = readSpec(config.schedule);
  if (!spec) {
    return (
      <div className="space-y-3">
        <p className="text-muted flex items-start gap-1.5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Choose when this workflow runs. Times use the timezone you pick, never the server’s.
        </p>
        {error('schedule') && (
          <p role="alert" className="text-status-failed text-sm">
            {error('schedule')}
          </p>
        )}
        <Button
          size="sm"
          variant="secondary"
          disabled={readOnly}
          onClick={() => set('schedule', defaultSpec('weekdays'))}
        >
          <CalendarPlus className="size-4" aria-hidden />
          Set up the schedule
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <SchedulePicker
        value={spec}
        onChange={(next) => set('schedule', next)}
        fieldError={(field) => (field ? error(`schedule.${field}`) : error('schedule', true))}
      />
      <p className="text-muted flex items-start gap-1.5 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Publishing starts the schedule; a new version replaces it. Archiving stops it, and
        unarchiving resumes from then on without catching up missed runs. Run now starts an extra
        run and does not change the schedule. Later steps can use{' '}
        <code className="font-mono">{'{{ trigger.scheduledFor }}'}</code>.
      </p>
    </div>
  );
}
