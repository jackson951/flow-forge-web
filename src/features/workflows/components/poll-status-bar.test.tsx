import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { WORKFLOW_ID, workflowDetail, WS_ID } from '@/test/msw/fixtures';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { PollStatus } from '@/types/api';

const WF = `${API}/workspaces/${WS_ID}/workflows/${WORKFLOW_ID}`;
const URL_ = `/w/${WS_ID}/workflows/${WORKFLOW_ID}`;
const soon = new Date(Date.now() + 5 * 60_000).toISOString();
const ago = new Date(Date.now() - 2 * 60_000).toISOString();

const withPoll = (status: PollStatus) =>
  server.use(
    http.get(WF, () =>
      HttpResponse.json({
        ...workflowDetail,
        draftDefinition: {
          ...workflowDetail.draftDefinition,
          nodes: [
            { key: 'trigger', kind: 'TRIGGER', type: 'http.poll', config: {} },
            ...workflowDetail.draftDefinition.nodes.slice(1),
          ],
        },
        schedule: {
          active: true,
          timezone: 'UTC',
          description: 'x',
          nextRunAt: soon,
          lastOccurrenceAt: null,
          lastRunId: null,
        },
      }),
    ),
    http.get(`${WF}/poll`, () => HttpResponse.json(status)),
  );

const bar = () => screen.findByRole('region', { name: 'Poll status' }, { timeout: 30_000 });
const schedule = { active: true, description: 'Every 5 minutes (UTC)', nextRunAt: soon };

beforeAll(() => import('../pages/workflow-editor-page'), 180_000);

describe('poll status bar (Part 20, FR-20.8)', () => {
  it('waiting for the first poll; the schedule strip is not duplicated', async () => {
    withPoll({ schedule, state: null });
    renderRoute(URL_);
    const b = await bar();
    expect(await within(b).findByText('Waiting for the first poll')).toBeInTheDocument();
    expect(within(b).getByText('Every 5 minutes (UTC)')).toBeInTheDocument();
    expect(within(b).getByText(/Next poll in 5 minutes/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Schedule' })).not.toBeInTheDocument();
  });

  it('seeded: existing items recorded', async () => {
    withPoll({
      schedule,
      state: {
        status: 'OK',
        seeded: true,
        lastPolledAt: ago,
        lastSuccessAt: ago,
        lastError: null,
        consecutiveFailures: 0,
        nextAttemptAt: null,
        itemsFired: 0,
      },
    });
    renderRoute(URL_);
    expect(await within(await bar()).findByText(/Existing items recorded/)).toBeInTheDocument();
  });

  it('failing: shows the error, failures in a row and the back-off (AC-20.2)', async () => {
    withPoll({
      schedule,
      state: {
        status: 'FAILING',
        seeded: true,
        lastPolledAt: ago,
        lastSuccessAt: ago,
        lastError: 'HTTP 503 Service Unavailable',
        consecutiveFailures: 3,
        nextAttemptAt: soon,
        itemsFired: 12,
      },
    });
    renderRoute(URL_);
    const b = await bar();
    expect(await within(b).findByText('Failing (3 in a row)')).toBeInTheDocument();
    expect(within(b).getByText(/HTTP 503 Service Unavailable/)).toBeInTheDocument();
    expect(within(b).getByText(/backing off/)).toBeInTheDocument();
    expect(within(b).getByText('12 items fired')).toBeInTheDocument();
  });
});
