import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { WorkflowSchedule } from '@/types/api';
import { ScheduleSummary } from './schedule-summary';

const schedule: WorkflowSchedule = {
  active: true,
  timezone: 'UTC',
  description: 'Daily at 07:00 (UTC)',
  nextRunAt: new Date(Date.now() + 86_400_000).toISOString(),
  lastOccurrenceAt: null,
  lastRunId: null,
};

const show = (props: Partial<Parameters<typeof ScheduleSummary>[0]>) =>
  render(
    <MemoryRouter>
      <ScheduleSummary
        workspaceId="ws"
        schedule={null}
        draftScheduled={false}
        archived={false}
        {...props}
      />
    </MemoryRouter>,
  );

describe('schedule summary states (Part 17, FR-17.7/17.8)', () => {
  it('nothing for a workflow without a schedule', () => {
    const { container } = show({});
    expect(container).toBeEmptyDOMElement();
  });

  it('a draft-only schedule says to publish', () => {
    show({ draftScheduled: true });
    expect(screen.getByText(/publish to start the schedule/)).toBeInTheDocument();
  });

  it('an active schedule shows its next run; never run yet shows no last run', () => {
    show({ schedule });
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText(/Next run tomorrow|Next run in/)).toBeInTheDocument();
    expect(screen.queryByText(/Last scheduled run/)).not.toBeInTheDocument();
  });

  it('archived: stopped, and unarchiving resumes without catching up', () => {
    show({ schedule: { ...schedule, active: false }, archived: true });
    expect(screen.getByText('Schedule stopped')).toBeInTheDocument();
    expect(screen.getByText(/without catching up missed runs/)).toBeInTheDocument();
    expect(screen.queryByText(/Next run/)).not.toBeInTheDocument();
  });

  it('a schedule with no further runs is stopped', () => {
    show({ schedule: { ...schedule, active: false, nextRunAt: null } });
    expect(screen.getByText('It has no further runs.')).toBeInTheDocument();
  });
});
