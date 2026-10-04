import {
  compileCron,
  defaultSpec,
  describeSpec,
  nextOccurrences,
  readSpec,
  specProblem,
  utcOffset,
  zoneLabel,
  type ScheduleSpec,
} from './schedule-model';

const NOW = new Date('2026-10-03T10:00:00.000Z'); // a Saturday
const at = (r: ReturnType<typeof nextOccurrences>) =>
  'occurrences' in r ? r.occurrences.map((o) => o.at.toISOString()) : r.error;

describe('schedule model (Part 17)', () => {
  it.each<[ScheduleSpec, string, string]>([
    [{ kind: 'interval', timezone: 'UTC', everyMinutes: 1 }, '* * * * *', 'Every minute (UTC)'],
    [
      { kind: 'interval', timezone: 'UTC', everyMinutes: 15 },
      '*/15 * * * *',
      'Every 15 minutes (UTC)',
    ],
    [
      { kind: 'interval', timezone: 'UTC', everyMinutes: 60 },
      '0 * * * *',
      'Every 60 minutes (UTC)',
    ],
    [
      { kind: 'interval', timezone: 'UTC', everyMinutes: 120 },
      '0 */2 * * *',
      'Every 120 minutes (UTC)',
    ],
    [
      { kind: 'interval', timezone: 'UTC', everyMinutes: 1440 },
      '0 0 * * *',
      'Every 1440 minutes (UTC)',
    ],
    [{ kind: 'hourly', timezone: 'UTC', minute: 5 }, '5 * * * *', 'Hourly at :05 (UTC)'],
    [{ kind: 'daily', timezone: 'UTC', time: '07:30' }, '30 7 * * *', 'Daily at 07:30 (UTC)'],
    [
      { kind: 'weekdays', timezone: 'UTC', time: '07:00' },
      '0 7 * * 1-5',
      'Weekdays at 07:00 (UTC)',
    ],
    [
      { kind: 'weekly', timezone: 'UTC', time: '16:00', daysOfWeek: [7, 1, 5] },
      '0 16 * * 1,5,0',
      'Weekly on Mon, Fri, Sun at 16:00 (UTC)',
    ],
    [
      { kind: 'monthly', timezone: 'UTC', time: '08:00', dayOfMonth: 'last' },
      '0 8 L * *',
      'Monthly on the last day at 08:00 (UTC)',
    ],
    [
      { kind: 'monthly', timezone: 'UTC', time: '08:00', dayOfMonth: 15 },
      '0 8 15 * *',
      'Monthly on day 15 at 08:00 (UTC)',
    ],
    [
      { kind: 'cron', timezone: 'UTC', expression: ' 0  9 * * 1-5 ' },
      '0 9 * * 1-5',
      'Cron " 0  9 * * 1-5 " (UTC)',
    ],
  ])('%o compiles like the backend and describes itself', (spec, cron, text) => {
    expect(compileCron(spec)).toBe(cron);
    expect(describeSpec(spec)).toBe(text);
  });

  it('previews occurrences in the schedule timezone', () => {
    const r = nextOccurrences(
      { kind: 'weekdays', timezone: 'Africa/Johannesburg', time: '07:00' },
      3,
      NOW,
    );
    // Saturday → next Monday 07:00 SAST = 05:00 UTC.
    expect(at(r)).toEqual([
      '2026-10-05T05:00:00.000Z',
      '2026-10-06T05:00:00.000Z',
      '2026-10-07T05:00:00.000Z',
    ]);
  });

  it('flags daylight-saving changes: spring forward shifts, fall back repeats an hour', () => {
    const spring = nextOccurrences(
      { kind: 'daily', timezone: 'America/New_York', time: '02:30' },
      3,
      new Date('2026-03-07T12:00:00.000Z'),
    );
    expect('occurrences' in spring && spring.occurrences.map((o) => o.dst ?? null)).toEqual([
      'shifted', // 8 Mar 02:30 does not exist: runs 03:30 EDT
      null,
      null,
    ]);
    const fall = nextOccurrences(
      { kind: 'daily', timezone: 'America/New_York', time: '09:00' },
      2,
      new Date('2026-10-31T12:00:00.000Z'),
    );
    expect('occurrences' in fall && fall.occurrences.map((o) => o.dst ?? null)).toEqual([
      null,
      'repeated-hour', // first run after clocks go back on 1 Nov
    ]);
  });

  it('day 31 skips shorter months; "last" runs every month', () => {
    const d31 = nextOccurrences(
      { kind: 'monthly', timezone: 'UTC', time: '08:00', dayOfMonth: 31 },
      2,
      NOW,
    );
    expect(at(d31)).toEqual(['2026-10-31T08:00:00.000Z', '2026-12-31T08:00:00.000Z']);
    const last = nextOccurrences(
      { kind: 'monthly', timezone: 'UTC', time: '08:00', dayOfMonth: 'last' },
      2,
      NOW,
    );
    expect(at(last)).toEqual(['2026-10-31T08:00:00.000Z', '2026-11-30T08:00:00.000Z']);
  });

  it('explains specs that cannot be previewed', () => {
    expect(specProblem({ kind: 'daily', timezone: '', time: '07:00' })).toBe('Choose a timezone');
    expect(specProblem({ kind: 'daily', timezone: 'UTC', time: '7am' })).toMatch(/24-hour/);
    expect(specProblem({ kind: 'weekly', timezone: 'UTC', time: '07:00', daysOfWeek: [] })).toMatch(
      /at least one day/,
    );
    expect(specProblem({ kind: 'cron', timezone: 'UTC', expression: '* * *' })).toMatch(/5-field/);
    expect(
      at(nextOccurrences({ kind: 'cron', timezone: 'UTC', expression: '0 0 30 2 *' }, 1, NOW)),
    ).toMatch(/never runs|Invalid/);
  });

  it('switching kind keeps the timezone and time', () => {
    expect(
      defaultSpec('weekly', { kind: 'daily', timezone: 'Africa/Johannesburg', time: '06:15' }),
    ).toEqual({
      kind: 'weekly',
      timezone: 'Africa/Johannesburg',
      time: '06:15',
      daysOfWeek: [1],
    });
    expect(defaultSpec('interval', { kind: 'daily', timezone: 'UTC', time: '06:15' })).toEqual({
      kind: 'interval',
      timezone: 'UTC',
      everyMinutes: 15,
    });
  });

  it('reads stored configs leniently and labels zones with their offset', () => {
    expect(readSpec({ kind: 'daily', timezone: 'UTC', time: '07:00' })).toMatchObject({
      kind: 'daily',
    });
    expect(readSpec({ kind: 'yearly' })).toBeNull();
    expect(readSpec(undefined)).toBeNull();
    expect(utcOffset('Africa/Johannesburg', NOW)).toBe('+02:00');
    expect(utcOffset('UTC', NOW)).toBe('+00:00');
    expect(zoneLabel('Africa/Johannesburg', NOW)).toBe('Africa/Johannesburg (UTC+02:00)');
  });
});
