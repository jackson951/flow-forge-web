import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import {
  RUN_ID,
  runDetail,
  runSummary,
  steps as stepFixtures,
  version as versionFixture,
  WORKFLOW_ID,
  workflowDetail,
  workspaces,
  WS_ID,
} from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { RunDetail, RunSummary, StepRun, WorkspaceRole } from '@/types/api';

// The editor and run detail are lazy routes; compile them once up front so the first test
// that opens one does not spend its wait on the cold transform (full parallel runs).
beforeAll(
  () =>
    import('@/features/workflows/pages/workflow-editor-page').then(
      () => import('@/features/runs/pages/run-detail-page'),
    ),
  180_000,
);

const RUNS = `${API}/workspaces/${WS_ID}/runs`;
const RUN = `${RUNS}/${RUN_ID}`;
const WF = `${API}/workspaces/${WS_ID}/workflows/${WORKFLOW_ID}`;
const NEW_RUN = 'f0000000-0000-4000-8000-000000000009';

const run = (n: number, extra: Partial<RunSummary> = {}): RunSummary => ({
  ...runSummary,
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  ...extra,
});

const asRole = (role: WorkspaceRole) =>
  server.use(
    http.get(`${API}/workspaces`, () =>
      HttpResponse.json(workspaces.map((w) => (w.id === WS_ID ? { ...w, role } : w))),
    ),
  );

const serveRun = (detail: Partial<RunDetail>, steps: StepRun[] = stepFixtures) =>
  server.use(
    http.get(RUN, () => HttpResponse.json({ ...runDetail, ...detail })),
    http.get(`${RUN}/steps`, () => HttpResponse.json(steps)),
  );

const failedStep = (extra: Partial<StepRun> = {}): StepRun => ({
  ...stepFixtures[1],
  status: 'FAILED',
  output: null,
  error: {
    category: 'PROVIDER_AUTH',
    message: 'invalid_auth',
    retryable: false,
    description: 'The provider rejected the connection’s credentials.',
  },
  nodeType: 'slack.sendMessage',
  nodeKey: 'notify',
  ...extra,
});

describe('run list (Part 08, FR-08.3)', () => {
  it('lists runs, keeps filters in the URL and sends them to the API (AC-08.5)', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(RUNS, ({ request }) => {
        const q = new URL(request.url).searchParams;
        queries.push(q);
        return HttpResponse.json(
          q.get('cursor') === 'c1'
            ? { items: [run(3, { workflowName: 'Third' })], nextCursor: null }
            : {
                items: [
                  run(1, { status: 'FAILED', error: failedStep().error }),
                  run(2, { triggerSource: 'WEBHOOK' }),
                ],
                nextCursor: 'c1',
              },
        );
      }),
    );
    const { router } = renderRoute(`/w/${WS_ID}/runs`);
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText('Connection rejected')).toBeInTheDocument();
    expect(within(table).getByText('Webhook')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await within(table).findByText('Third')).toBeInTheDocument();
    expect(queries.at(-1)?.get('cursor')).toBe('c1');

    await userEvent.click(screen.getByRole('button', { name: 'Failed' }));
    await waitFor(() => expect(router.state.location.search).toContain('status=FAILED'));
    await waitFor(() => expect(queries.at(-1)?.get('status')).toBe('FAILED'));
    await userEvent.selectOptions(screen.getByLabelText('Trigger'), 'MANUAL');
    await waitFor(() => expect(queries.at(-1)?.get('triggerSource')).toBe('MANUAL'));
    expect(router.state.location.search).toContain('trigger=MANUAL');
  });

  it('opens with the filters from the URL (reload keeps them)', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(RUNS, ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json({ items: [], nextCursor: null });
      }),
    );
    renderRoute(`/w/${WS_ID}/runs?status=SUCCEEDED&from=2026-10-01&to=2026-10-02`);
    expect(await screen.findByText('No runs match these filters')).toBeInTheDocument();
    const q = queries.at(-1)!;
    expect(q.get('status')).toBe('SUCCEEDED');
    expect(new Date(q.get('from')!).getDate()).toBe(1);
    expect(new Date(q.get('to')!).getDate()).toBe(3); // the "to" day is included
    expect(screen.getByRole('button', { name: 'Succeeded' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows that it updates live while a run is active', async () => {
    server.use(
      http.get(RUNS, () =>
        HttpResponse.json({ items: [run(1, { status: 'RUNNING' })], nextCursor: null }),
      ),
    );
    renderRoute(`/w/${WS_ID}/runs`);
    expect(await screen.findByText('Updating live')).toBeInTheDocument();
  });
});

describe('run now (Part 08, FR-08.1/08.2)', () => {
  const openDialog = async () => {
    renderRoute(`/w/${WS_ID}/workflows/${WORKFLOW_ID}`);
    const button = await screen.findByRole('button', { name: 'Run now' }, { timeout: 30_000 });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    return screen.getByRole('dialog', { name: `Run “${workflowDetail.name}”` });
  };

  it('validates the JSON input', async () => {
    const dialog = await openDialog();
    const input = within(dialog).getByLabelText('Input (optional JSON)');
    await userEvent.type(input, '[[1]');
    expect(within(dialog).getByText(/must be a JSON object/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Run' })).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, '{{"name":');
    expect(within(dialog).getByText(/Not valid JSON/)).toBeInTheDocument();
  });

  it('a double click sends the same Idempotency-Key, then opens the run (AC-08.2)', async () => {
    const keys: (string | null)[] = [];
    const bodies: unknown[] = [];
    server.use(
      http.post(`${WF}/runs`, async ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        bodies.push(await request.json());
        return HttpResponse.json({ runId: NEW_RUN, status: 'QUEUED' }, { status: 202 });
      }),
      http.get(`${RUNS}/${NEW_RUN}`, () =>
        HttpResponse.json({ ...runDetail, id: NEW_RUN, status: 'QUEUED' }),
      ),
      http.get(`${RUNS}/${NEW_RUN}/steps`, () => HttpResponse.json([])),
    );
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText('Input (optional JSON)'), '{{"name":"Ada"}');
    const runButton = within(dialog).getByRole('button', { name: 'Run' });
    await userEvent.dblClick(runButton);
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: /Triage new issues/ }),
      ).toBeInTheDocument(),
    );
    expect(keys.length).toBeGreaterThanOrEqual(1);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toMatch(/^[\w-]{36}$/);
    expect(bodies[0]).toEqual({ input: { name: 'Ada' } });
  });

  it('a busy queue (429) asks to try again after Retry-After', async () => {
    server.use(
      http.post(`${WF}/runs`, () =>
        apiError(429, 'Too many runs are waiting', {
          headers: { 'Retry-After': '30' },
          details: { code: 'QUEUE_BACKPRESSURE', retryAfterSeconds: 30 },
        }),
      ),
    );
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Run' }));
    expect(
      await within(dialog).findByText(/FlowForge is busy — try again in 30 s/),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Run' })).toBeDisabled();
  });

  it('explains a 409 (e.g. started by its trigger)', async () => {
    server.use(
      http.post(`${WF}/runs`, () =>
        apiError(409, 'This workflow is started by its trigger, not manually'),
      ),
    );
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Run' }));
    expect(
      await within(dialog).findByText('This workflow is started by its trigger, not manually'),
    ).toBeInTheDocument();
  });

  it('is unavailable for workflows started by an event trigger', async () => {
    server.use(
      http.get(`${WF}/versions/:version`, () =>
        HttpResponse.json({
          ...versionFixture,
          definition: {
            ...workflowDetail.draftDefinition,
            nodes: [
              { key: 'trigger', kind: 'TRIGGER', type: 'github.issue.created', config: {} },
              ...workflowDetail.draftDefinition.nodes.slice(1),
            ],
          },
        }),
      ),
    );
    renderRoute(`/w/${WS_ID}/workflows/${WORKFLOW_ID}`);
    await screen.findByRole('button', { name: 'Run now' }, { timeout: 30_000 });
    await waitFor(() =>
      expect(document.getElementById('run-blocked')?.textContent).toMatch(
        /Runs automatically when its trigger fires/,
      ),
    );
  });
});

describe('run detail (Part 08, FR-08.4–08.9)', () => {
  it('shows facts, trigger input and each step with input/output', async () => {
    serveRun({});
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    expect(
      await screen.findByRole('heading', { level: 1, name: /Triage new issues/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(runDetail.correlationId!)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'v2' })).toHaveAttribute(
      'href',
      `/w/${WS_ID}/workflows/${WORKFLOW_ID}/versions/2`,
    );
    const timeline = await screen.findByRole('list', { name: 'Steps' });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(2);
    expect(within(timeline).getAllByText('Hello Ada', { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getByText('Trigger input')).toBeInTheDocument();
  });

  it('polls while running and stops once the run is finished (FR-08.5)', async () => {
    let gets = 0;
    server.use(
      http.get(RUN, () => {
        gets++;
        return HttpResponse.json({ ...runDetail, status: gets < 2 ? 'RUNNING' : 'SUCCEEDED' });
      }),
      http.get(`${RUN}/steps`, () => HttpResponse.json(stepFixtures)),
    );
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    expect(await screen.findByText('Updating live')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Updating live')).not.toBeInTheDocument(), {
      timeout: 6_000,
    });
    const after = gets;
    await new Promise((r) => setTimeout(r, 2_500));
    expect(gets).toBe(after);
  });

  it('explains a failure with its category and next step, linking to Integrations (FR-08.8)', async () => {
    const step = failedStep();
    serveRun(
      {
        status: 'FAILED',
        error: step.error,
        failedStep: { nodeKey: 'notify', nodeType: 'slack.sendMessage', error: step.error },
      },
      [stepFixtures[0], step],
    );
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    const why = await screen.findByRole('region', { name: 'Why the run failed' });
    expect(within(why).getByText('Connection rejected')).toBeInTheDocument();
    expect(within(why).getByText(/Failed at/)).toHaveTextContent('notify');
    expect(within(why).getByRole('link', { name: 'Reconnect Slack' })).toHaveAttribute(
      'href',
      `/w/${WS_ID}/integrations`,
    );
  });

  it('retry after an uncertain outcome names the step and needs acknowledgement (FR-08.7, AC-08.3)', async () => {
    const uncertain = failedStep({
      error: {
        category: 'UNCERTAIN_OUTCOME',
        message: null,
        retryable: false,
        description: 'The step may have completed.',
      },
    });
    serveRun({ status: 'FAILED', error: uncertain.error }, [stepFixtures[0], uncertain]);
    const bodies: Record<string, unknown>[] = [];
    server.use(
      http.post(`${RUN}/retry`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        bodies.push(body);
        if (!body.acknowledgeUncertainOutcome) {
          return apiError(409, 'The failed step may already have completed', {
            details: { code: 'UNCERTAIN_OUTCOME', nodeKeys: ['notify'] },
          });
        }
        return HttpResponse.json(
          { runId: NEW_RUN, status: 'QUEUED', retryOfRunId: RUN_ID, reusedSteps: ['trigger'] },
          { status: 202 },
        );
      }),
      http.get(`${RUNS}/${NEW_RUN}`, () =>
        HttpResponse.json({ ...runDetail, id: NEW_RUN, status: 'QUEUED', retryOfRunId: RUN_ID }),
      ),
      http.get(`${RUNS}/${NEW_RUN}/steps`, () => HttpResponse.json([])),
    );
    const { router } = renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    const dialog = screen.getByRole('dialog', { name: 'Retry this run?' });
    expect(within(dialog).getByText(/The outcome of “notify” is unknown/)).toBeInTheDocument();
    const send = within(dialog).getByRole('button', { name: 'Retry' });
    expect(send).toBeDisabled();
    await userEvent.click(within(dialog).getByLabelText(/I checked, and I accept/));
    await userEvent.click(send);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}/runs/${NEW_RUN}`));
    expect(bodies.at(-1)).toEqual({
      resumeFromFailedStep: true,
      acknowledgeUncertainOutcome: true,
    });
  });

  it('the backend’s UNCERTAIN_OUTCOME 409 also asks for acknowledgement', async () => {
    serveRun({ status: 'FAILED', error: failedStep().error }, [stepFixtures[0], failedStep()]);
    server.use(
      http.post(`${RUN}/retry`, () =>
        apiError(409, 'may already have completed', {
          details: { code: 'UNCERTAIN_OUTCOME', nodeKeys: ['notify'] },
        }),
      ),
    );
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retry' }));
    expect(
      await within(dialog).findByText(/The outcome of “notify” is unknown/),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Retry' })).toBeDisabled();
  });

  it('a trimmed run can only be retried from the start', async () => {
    serveRun(
      {
        status: 'FAILED',
        error: failedStep().error,
        payloadsTrimmedAt: '2026-09-01T00:00:00.000Z',
      },
      [stepFixtures[0], failedStep()],
    );
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    expect(await screen.findByText(/older than the retention period/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('radio', { name: /Resume from the failed step/ }),
    ).toBeDisabled();
    expect(within(dialog).getByRole('radio', { name: /Run again from the start/ })).toBeChecked();
  });

  it('a PAYLOADS_TRIMMED 409 switches to retry from the start', async () => {
    serveRun({ status: 'FAILED', error: failedStep().error }, [stepFixtures[0], failedStep()]);
    server.use(
      http.post(`${RUN}/retry`, () =>
        apiError(409, 'too old', { details: { code: 'PAYLOADS_TRIMMED' } }),
      ),
    );
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retry' }));
    expect(await within(dialog).findByText(/too old to resume/)).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /Run again from the start/ })).toBeChecked();
  });

  it('shows the branch not taken as skipped with the reason (FR-08.9, AC-08.4)', async () => {
    const definition = {
      schemaVersion: 1,
      nodes: [
        { key: 'trigger', kind: 'TRIGGER', type: 'manual.trigger', config: {} },
        { key: 'is_high', kind: 'CONDITION', type: 'condition', config: {} },
        { key: 'notify', kind: 'ACTION', type: 'util.log', config: {} },
        { key: 'later', kind: 'ACTION', type: 'util.log', config: {} },
      ],
      edges: [
        { from: 'trigger', to: 'is_high' },
        { from: 'is_high', to: 'notify', branch: 'true' },
        { from: 'is_high', to: 'later', branch: 'false' },
      ],
    };
    server.use(
      http.get(`${WF}/versions/:version`, () =>
        HttpResponse.json({ ...versionFixture, definition }),
      ),
    );
    const step = (
      key: string,
      type: string,
      seq: number,
      status: StepRun['status'],
      output: unknown = {},
    ): StepRun => ({
      ...stepFixtures[0],
      id: `e1e1e1e1-0000-4000-8000-00000000000${seq}`,
      nodeKey: key,
      nodeType: type,
      sequence: seq,
      status,
      output,
    });
    serveRun({}, [
      step('trigger', 'manual.trigger', 1, 'SUCCEEDED'),
      step('is_high', 'condition', 2, 'SUCCEEDED', { result: true }),
      step('notify', 'util.log', 3, 'SUCCEEDED'),
      step('later', 'util.log', 4, 'SKIPPED', null),
    ]);
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    expect(await screen.findByText('Branch not taken: is_high was true')).toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector('.react-flow__node[data-id="later"]')?.textContent).toContain(
        'Skipped',
      ),
    );
  });

  it('cancels a running run after explaining what happens (FR-08.6)', async () => {
    serveRun({ status: 'RUNNING', completedAt: null, durationMs: null });
    const cancels: string[] = [];
    server.use(
      http.post(`${RUN}/cancel`, () => {
        cancels.push(RUN_ID);
        return HttpResponse.json({ runId: RUN_ID, status: 'RUNNING', cancelRequested: true });
      }),
    );
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel run' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel this run?' });
    expect(within(dialog).getByText(/no new step starts/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel run' }));
    await waitFor(() => expect(cancels).toHaveLength(1));
  });

  it('members see runs but cannot retry or cancel', async () => {
    asRole('MEMBER');
    serveRun({ status: 'FAILED', error: failedStep().error }, [stepFixtures[0], failedStep()]);
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    expect(await screen.findByRole('region', { name: 'Why the run failed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('shows not found for a run of another workspace', async () => {
    server.use(http.get(RUN, () => apiError(404, 'Run not found')));
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    expect(await screen.findByText('Run not found')).toBeInTheDocument();
  });
});

describe('toasts for finished actions (Part 12, FR-12.3)', () => {
  it('cancelling a run confirms with a toast as well as on the page', async () => {
    serveRun({ status: 'RUNNING', completedAt: null, durationMs: null });
    server.use(
      http.post(`${RUN}/cancel`, () =>
        HttpResponse.json({ runId: RUN_ID, status: 'RUNNING', cancelRequested: true }),
      ),
    );
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel run' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel run' }),
    );
    const notifications = await screen.findByLabelText('Notifications');
    expect(await within(notifications).findByText('Cancellation requested')).toBeInTheDocument();
  });
});

describe('scheduled workflows and runs (Part 17)', () => {
  const NEXT = new Date(Date.now() + 3 * 3_600_000).toISOString();
  const scheduledVersion = () =>
    server.use(
      http.get(`${WF}/versions/:version`, () =>
        HttpResponse.json({
          ...versionFixture,
          definition: {
            ...workflowDetail.draftDefinition,
            nodes: [
              {
                key: 'trigger',
                kind: 'TRIGGER',
                type: 'schedule.trigger',
                config: { schedule: { kind: 'daily', timezone: 'UTC', time: '07:00' } },
              },
              ...workflowDetail.draftDefinition.nodes.slice(1),
            ],
          },
        }),
      ),
      http.get(WF, () =>
        HttpResponse.json({
          ...workflowDetail,
          schedule: {
            active: true,
            timezone: 'UTC',
            description: 'Daily at 07:00 (UTC)',
            nextRunAt: NEXT,
            lastOccurrenceAt: new Date(Date.now() - 3_600_000).toISOString(),
            lastRunId: RUN_ID,
          },
        }),
      ),
    );

  it('shows the next run and links the last scheduled run (FR-17.7, AC-17.4)', async () => {
    scheduledVersion();
    renderRoute(`/w/${WS_ID}/workflows/${WORKFLOW_ID}`);
    const strip = await screen.findByRole('region', { name: 'Schedule' }, { timeout: 30_000 });
    expect(within(strip).getByText('Scheduled')).toBeInTheDocument();
    expect(within(strip).getByText('Daily at 07:00 (UTC)')).toBeInTheDocument();
    expect(within(strip).getByText(/Next run in 3 hours/)).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: 'open run' })).toHaveAttribute(
      'href',
      `/w/${WS_ID}/runs/${RUN_ID}`,
    );
  });

  it('a scheduled workflow can still be run by hand (FR-17.8)', async () => {
    scheduledVersion();
    renderRoute(`/w/${WS_ID}/workflows/${WORKFLOW_ID}`);
    const button = await screen.findByRole('button', { name: 'Run now' }, { timeout: 30_000 });
    await waitFor(() => expect(button).toBeEnabled());
    expect(document.getElementById('run-blocked')).toBeNull();
  });

  it('run detail shows the occurrence in its timezone and the start lag (FR-17.9)', async () => {
    serveRun({
      triggerSource: 'SCHEDULE',
      queuedAt: '2026-10-05T05:00:22.000Z',
      triggerInput: {
        triggerType: 'SCHEDULE',
        scheduledFor: '2026-10-05T05:00:00.000Z',
        triggeredAt: '2026-10-05T05:00:21.000Z',
        timezone: 'Africa/Johannesburg',
        scheduleId: 's1',
      },
    });
    renderRoute(`/w/${WS_ID}/runs/${RUN_ID}`);
    const info = await screen.findByRole('region', { name: 'Schedule' }, { timeout: 30_000 });
    expect(info).toHaveTextContent('Scheduled for Mon 5 Oct, 07:00 (Africa/Johannesburg)');
    expect(info).toHaveTextContent('started 22 s after its scheduled time');
    expect(screen.getAllByText('Schedule').length).toBeGreaterThan(0); // trigger-source badge
  });
});
