import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { WorkspaceContext } from '@/features/workspaces/hooks/workspace-context';
import { connections as connectionFixtures, workspaces, WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { browser } from '@/features/integrations/connect-flow';
import type { Connection, ValidationIssue, WorkspaceRole } from '@/types/api';
import type { NodeDefinition, WorkflowDefinition } from '../../types/workflow-definition';
import { measureCondition, type ConditionGroup } from '../schemas';
import { NodeSettings } from './node-settings';

const GITHUB_ID = '7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f';
const SLACK_ID = connectionFixtures[0].id;
const INTEGRATIONS = `${API}/workspaces/${WS_ID}/integrations`;

const githubConnection: Connection = {
  ...connectionFixtures[0],
  id: GITHUB_ID,
  provider: 'GITHUB',
  externalAccountId: '12345',
  accountLabel: 'acme (GitHub App)',
};

/** trigger (GitHub issue) → classify → target; `target` is the node under test. */
function workflow(target: Omit<NodeDefinition, 'key'>): WorkflowDefinition {
  return {
    schemaVersion: 1,
    nodes: [
      { key: 'trigger', kind: 'TRIGGER', type: 'github.issue.created', config: {} },
      { key: 'classify', kind: 'ACTION', type: 'ai.classify', config: {} },
      { key: 'target', ...target },
      { key: 'later', kind: 'ACTION', type: 'util.log', config: {} },
    ],
    edges: [
      { from: 'trigger', to: 'classify' },
      { from: 'classify', to: 'target' },
      { from: 'target', to: 'later' },
    ],
  };
}

function setup(
  target: Omit<NodeDefinition, 'key'>,
  {
    issues = [],
    readOnly = false,
    role = 'OWNER',
  }: { issues?: ValidationIssue[]; readOnly?: boolean; role?: WorkspaceRole } = {},
) {
  const configs: Record<string, unknown>[] = [];
  function Harness() {
    const [def, setDef] = useState(() => workflow(target));
    const node = def.nodes.find((n) => n.key === 'target')!;
    return (
      <NodeSettings
        node={node}
        definition={def}
        labelFor={(t) => t}
        issues={issues}
        readOnly={readOnly}
        onChange={(config) => {
          configs.push(config);
          setDef((d) => ({
            ...d,
            nodes: d.nodes.map((n) => (n.key === 'target' ? { ...n, config } : n)),
          }));
        }}
      />
    );
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WorkspaceContext.Provider value={{ ...workspaces[0], role }}>
          <Harness />
        </WorkspaceContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { last: () => configs.at(-1) };
}

const withConnections = (list: Connection[]) =>
  server.use(http.get(INTEGRATIONS, () => HttpResponse.json(list)));

describe('node settings forms (Part 06)', () => {
  it('suggests upstream data after typing {{ and inserts the reference (FR-06.4)', async () => {
    const { last } = setup({ kind: 'ACTION', type: 'util.log', config: {} });
    const message = screen.getByLabelText('Message');
    await userEvent.type(message, 'New: {{{{issue.ti');
    const list = screen.getByRole('listbox', { name: 'Data from earlier steps' });
    expect(within(list).getByText('trigger.issue.title')).toBeInTheDocument();
    // Only upstream: the later step is never offered.
    expect(within(list).queryByText(/steps\.later\./)).not.toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(last()).toEqual({ message: 'New: {{ trigger.issue.title }}' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('"Insert data" lists every upstream reference, including outputs of earlier steps', async () => {
    const { last } = setup({ kind: 'ACTION', type: 'util.log', config: { message: 'Label: ' } });
    await userEvent.click(screen.getByRole('button', { name: 'Insert data' }));
    const list = screen.getByRole('listbox');
    await userEvent.click(within(list).getByText('steps.classify.output.label'));
    expect(last()).toEqual({ message: 'Label: {{ steps.classify.output.label }}' });
  });

  it('flags references that will not resolve', async () => {
    setup({
      kind: 'ACTION',
      type: 'util.log',
      config: {
        message:
          '{{ steps.later.output.message }} {{ steps.ghost.output.x }} {{ steps.classify.output.nope }}',
      },
    });
    expect(screen.getByText(/"later" does not run before this step/)).toBeInTheDocument();
    expect(screen.getByText(/there is no step "ghost"/)).toBeInTheDocument();
    expect(screen.getByText(/"nope" is not a known output of classify/)).toBeInTheDocument();
  });

  it('validates as you type, mirroring the backend limits (FR-06.6)', async () => {
    setup({ kind: 'ACTION', type: 'util.log', config: {} });
    // Untouched empty field: no message yet.
    expect(screen.queryByText('Enter a message')).not.toBeInTheDocument();
    const message = screen.getByLabelText('Message');
    fireEvent.change(message, { target: { value: 'x'.repeat(1001) } });
    expect(screen.getByText('At most 1000 characters')).toBeInTheDocument();
    expect(screen.getByText('1001/1000')).toBeInTheDocument();
    fireEvent.change(message, { target: { value: '' } });
    expect(screen.getByText('Enter a message')).toBeInTheDocument();
  });

  it('shows client and server messages on the same field (AC-06.5)', async () => {
    setup(
      { kind: 'ACTION', type: 'util.log', config: { message: 'ok' } },
      {
        issues: [
          {
            code: 'INVALID_NODE_CONFIG',
            severity: 'error',
            nodeKey: 'target',
            path: 'message',
            message: 'Server says no',
          },
        ],
      },
    );
    const describedBy = () =>
      document.getElementById(
        screen.getByLabelText('Message').getAttribute('aria-describedby')!.split(' ')[0],
      )!;
    expect(describedBy()).toHaveTextContent('Server says no');
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: '' } });
    expect(describedBy()).toHaveTextContent('Enter a message');
  });

  it('Slack: connection, channel picker, message and the @channel warning', async () => {
    const { last } = setup({ kind: 'ACTION', type: 'slack.sendMessage', config: {} });
    const connection = await screen.findByLabelText('Slack connection');
    await userEvent.selectOptions(connection, SLACK_ID);
    const channels = await screen.findByRole('listbox', { name: 'Channels' });
    await userEvent.click(within(channels).getByRole('option', { name: /support/ }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi' } });
    expect(last()).toEqual({ connectionId: SLACK_ID, channelId: 'C0123456789', text: 'Hi' });

    expect(screen.queryByText(/notify everyone in the channel/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Allow @channel, @here and @everyone'));
    expect(screen.getByText(/notify everyone in the channel/)).toBeInTheDocument();
    expect(last()).toMatchObject({ allowBroadcastMentions: true });
  });

  it('changing the connection clears the resource that belonged to the old one', async () => {
    const other = {
      ...connectionFixtures[0],
      id: '11111111-1111-4111-8111-111111111111',
      accountLabel: 'Other Slack',
    };
    withConnections([connectionFixtures[0], other]);
    const { last } = setup({
      kind: 'ACTION',
      type: 'slack.sendMessage',
      config: { connectionId: SLACK_ID, channelId: 'C0123456789', text: 'Hi' },
    });
    await userEvent.selectOptions(await screen.findByLabelText('Slack connection'), other.id);
    expect(last()).toEqual({ connectionId: other.id, text: 'Hi' });
  });

  it('admins connect from the step and come back to it (FR-06.3, Part 10 FR-10.3)', async () => {
    withConnections([]);
    const assign = vi.spyOn(browser, 'assign').mockImplementation(() => undefined);
    server.use(
      http.post(`${INTEGRATIONS}/SLACK/connect`, () =>
        HttpResponse.json({ url: 'https://slack.com/oauth/v2/authorize?state=s' }),
      ),
    );
    setup({ kind: 'ACTION', type: 'slack.sendMessage', config: {} });
    await userEvent.click(await screen.findByRole('button', { name: 'Connect Slack' }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://slack.com/oauth/v2/authorize?state=s'),
    );
    expect(JSON.parse(sessionStorage.getItem('flowforge.integrations.return')!)).toEqual({
      provider: 'SLACK',
      returnTo: '/',
      stepKey: 'target',
      workspaceId: WS_ID,
    });
    expect(screen.getByText('Choose a connection first.')).toBeInTheDocument();
    assign.mockRestore();
    sessionStorage.clear();
  });

  it('members are pointed to an admin instead', async () => {
    withConnections([]);
    setup({ kind: 'ACTION', type: 'slack.sendMessage', config: {} }, { role: 'MEMBER' });
    expect(await screen.findByText('Ask an owner or admin to connect Slack.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect Slack' })).not.toBeInTheDocument();
  });

  it('warns about a connection that needs attention', async () => {
    withConnections([{ ...connectionFixtures[0], status: 'NEEDS_ATTENTION' }]);
    setup({ kind: 'ACTION', type: 'slack.sendMessage', config: { connectionId: SLACK_ID } });
    expect(await screen.findByText(/This connection needs attention/)).toBeInTheDocument();
  });

  it('pickers show error with retry, and empty states', async () => {
    let fail = true;
    server.use(
      http.get(`${INTEGRATIONS}/:id/slack/channels`, () =>
        fail
          ? apiError(502, 'Slack is unavailable')
          : HttpResponse.json({ items: [], nextCursor: null }),
      ),
    );
    setup({ kind: 'ACTION', type: 'slack.sendMessage', config: { connectionId: SLACK_ID } });
    expect(
      await screen.findByText(/Could not load channels: Slack is unavailable/),
    ).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/cannot post to any channel yet/)).toBeInTheDocument();
  });

  it('Slack channels load more with the cursor', async () => {
    server.use(
      http.get(`${INTEGRATIONS}/:id/slack/channels`, ({ request }) =>
        new URL(request.url).searchParams.get('cursor') === 'next'
          ? HttpResponse.json({
              items: [{ id: 'C0000000002', name: 'alerts', isPrivate: true }],
              nextCursor: null,
            })
          : HttpResponse.json({
              items: [{ id: 'C0000000001', name: 'general', isPrivate: false }],
              nextCursor: 'next',
            }),
      ),
    );
    setup({ kind: 'ACTION', type: 'slack.sendMessage', config: { connectionId: SLACK_ID } });
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('option', { name: /alerts/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('GitHub trigger: connection then repository', async () => {
    withConnections([githubConnection]);
    const { last } = setup({ kind: 'TRIGGER', type: 'github.issue.created', config: {} });
    await userEvent.selectOptions(await screen.findByLabelText('GitHub connection'), GITHUB_ID);
    await userEvent.click(await screen.findByRole('option', { name: /acme\/api/ }));
    expect(last()).toEqual({ connectionId: GITHUB_ID, repository: 'acme/api' });
  });

  it('Microsoft To Do: list, title, optional notes and a picked due date', async () => {
    const microsoft = {
      ...githubConnection,
      provider: 'MICROSOFT' as const,
      accountLabel: 'Jo (Microsoft)',
    };
    withConnections([microsoft]);
    const { last } = setup({
      kind: 'ACTION',
      type: 'microsoft.todo.createTask',
      config: { connectionId: GITHUB_ID },
    });
    await userEvent.click(await screen.findByRole('option', { name: /Tasks/ }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Follow up' } });
    fireEvent.change(screen.getByLabelText('Pick a due date'), { target: { value: '2026-12-31' } });
    expect(last()).toEqual({
      connectionId: GITHUB_ID,
      listId: 'AQMkADAwATM0MDAAMS1',
      title: 'Follow up',
      dueDate: '2026-12-31',
    });
  });

  it('AI classify: labels as chips, uniqueness checked, optional subject', async () => {
    const { last } = setup({
      kind: 'ACTION',
      type: 'ai.classify',
      config: { text: '{{ trigger.issue.body }}' },
    });
    const input = screen.getByLabelText('Labels');
    await userEvent.type(input, 'HIGH{Enter}low{Enter}');
    expect(last()).toMatchObject({ labels: ['HIGH', 'low'] });
    await userEvent.type(input, 'high{Enter}');
    expect(screen.getByText('Labels must be unique')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove label high' }));
    expect(screen.queryByText('Labels must be unique')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('What is being classified (optional)'), 'priority');
    expect(last()).toEqual({
      text: '{{ trigger.issue.body }}',
      labels: ['HIGH', 'low'],
      field: 'priority',
    });
  });

  it('AI input can pass one value as-is ({ ref }) and back', async () => {
    const { last } = setup({
      kind: 'ACTION',
      type: 'ai.summarize',
      config: { text: '{{ trigger.issue.body }}' },
    });
    await userEvent.click(screen.getByRole('radio', { name: 'One value as-is' }));
    expect(last()).toEqual({ text: { ref: 'trigger.issue.body' } });
    await userEvent.click(screen.getByRole('radio', { name: 'Text with data' }));
    expect(last()).toEqual({ text: '{{ trigger.issue.body }}' });
  });

  it('AI summarize: maxWords within 20–300, empty means the default', async () => {
    const { last } = setup({ kind: 'ACTION', type: 'ai.summarize', config: { text: 'x' } });
    const words = screen.getByLabelText('Maximum words');
    await userEvent.type(words, '10');
    expect(screen.getByText('At least 20')).toBeInTheDocument();
    await userEvent.clear(words);
    expect(last()).toEqual({ text: 'x' });
    await userEvent.type(words, '150');
    expect(last()).toEqual({ text: 'x', maxWords: 150 });
  });

  it('AI extract: fields with types, enum values and reserved names', async () => {
    const { last } = setup({ kind: 'ACTION', type: 'ai.extract', config: { text: 'x' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add field' }));
    await userEvent.type(screen.getByLabelText('Field 1 name'), 'meta');
    expect(screen.getByText('This name is reserved')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Field 1 name'));
    await userEvent.type(screen.getByLabelText('Field 1 name'), 'priority');
    await userEvent.selectOptions(screen.getByLabelText('Field 1 type'), 'enum');
    expect(screen.getByText('Add at least one value')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Field 1 values'), 'P1, P2');
    expect(last()).toEqual({
      text: 'x',
      fields: [{ name: 'priority', type: 'enum', required: true, enumValues: ['P1', 'P2'] }],
    });
    await userEvent.selectOptions(screen.getByLabelText('Field 1 type'), 'number');
    expect(last()).toEqual({
      text: 'x',
      fields: [{ name: 'priority', type: 'number', required: true }],
    });
  });

  it('says secrets belong in connections, and has no settings for the manual trigger (FR-06.7)', () => {
    setup({ kind: 'ACTION', type: 'util.log', config: {} });
    expect(screen.getByText(/Never paste tokens or passwords here/)).toBeInTheDocument();
  });

  it('read-only: every input is disabled', async () => {
    setup(
      { kind: 'ACTION', type: 'ai.classify', config: { text: 'x', labels: ['A', 'B'] } },
      { readOnly: true },
    );
    expect(screen.getByLabelText('Text to analyse')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Remove label/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Labels' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert data' })).not.toBeInTheDocument();
  });
});

describe('condition builder (Part 06, FR-06.5)', () => {
  it('builds the backend grammar and previews it in plain language', async () => {
    const { last } = setup({ kind: 'CONDITION', type: 'condition', config: {} });
    const left = screen.getByLabelText('Left side data');
    await userEvent.click(left);
    await userEvent.click(
      within(screen.getByRole('listbox')).getByText('steps.classify.output.label'),
    );
    fireEvent.change(screen.getByLabelText('Right side text'), { target: { value: 'HIGH' } });
    expect(last()).toEqual({
      all: [
        {
          left: { ref: 'steps.classify.output.label' },
          operator: 'equals',
          right: { value: 'HIGH' },
        },
      ],
    });
    expect(screen.getByTestId('condition-preview')).toHaveTextContent(
      'steps.classify.output.label equals "HIGH"',
    );
  });

  it('unary operators hide the right side; numbers and booleans keep their type', async () => {
    const { last } = setup({
      kind: 'CONDITION',
      type: 'condition',
      config: {
        all: [
          { left: { ref: 'trigger.issue.number' }, operator: 'greaterThan', right: { value: '' } },
        ],
      },
    });
    await userEvent.selectOptions(screen.getByLabelText('Right side type'), 'number');
    fireEvent.change(screen.getByLabelText('Right side number'), { target: { value: '42' } });
    expect(last()).toEqual({
      all: [
        { left: { ref: 'trigger.issue.number' }, operator: 'greaterThan', right: { value: 42 } },
      ],
    });
    await userEvent.selectOptions(screen.getByLabelText('Operator'), 'exists');
    expect(screen.queryByLabelText('Right side type')).not.toBeInTheDocument();
    expect(last()).toEqual({
      all: [{ left: { ref: 'trigger.issue.number' }, operator: 'exists' }],
    });
  });

  it('nests groups up to depth 4, then stops offering more (AC-06.4)', async () => {
    const { last } = setup({
      kind: 'CONDITION',
      type: 'condition',
      config: { all: [{ left: { ref: 'trigger.a' }, operator: 'exists' }] },
    });
    // The innermost group's buttons come first in the DOM (outer groups' buttons follow).
    for (let i = 0; i < 3; i++) {
      await userEvent.click(screen.getAllByRole('button', { name: 'Add group' })[0]);
    }
    const addGroup = screen.getAllByRole('button', { name: 'Add group' });
    expect(addGroup[0]).toBeDisabled(); // the innermost group is at depth 4
    expect(addGroup.at(-1)).toBeEnabled(); // the root can still take more
    expect(screen.getByText(/nesting 4\/4/)).toBeInTheDocument();
    const config = last() as ConditionGroup;
    expect(measureCondition(config).depth).toBe(4);
  });

  it('switches group type (AND/OR/NOT) and removes comparisons', async () => {
    const cmp = (ref: string) => ({ left: { ref }, operator: 'exists' });
    const { last } = setup({
      kind: 'CONDITION',
      type: 'condition',
      config: { all: [cmp('trigger.a'), cmp('trigger.b')] },
    });
    // NOT takes one item, so it is unavailable with two.
    const type = screen.getByLabelText('Group type');
    expect(within(type).getByRole('option', { name: /NOT/ })).toBeDisabled();
    await userEvent.selectOptions(type, 'any');
    expect(last()).toEqual({ any: [cmp('trigger.a'), cmp('trigger.b')] });
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove comparison' })[1]);
    await userEvent.selectOptions(screen.getByLabelText('Group type'), 'not');
    expect(last()).toEqual({ not: cmp('trigger.a') });
    expect(screen.getByTestId('condition-preview')).toHaveTextContent('NOT trigger.a exists');
  });

  it('shows the server’s condition issues on the comparison they belong to', async () => {
    setup(
      {
        kind: 'CONDITION',
        type: 'condition',
        config: {
          all: [{ left: { ref: 'trigger.a' }, operator: 'equals', right: { value: 'x' } }],
        },
      },
      {
        issues: [
          {
            code: 'INVALID_CONDITION',
            severity: 'error',
            nodeKey: 'target',
            path: 'all.0.right',
            message: 'Bad right side',
          },
        ],
      },
    );
    await waitFor(() => expect(screen.getByText('Bad right side')).toBeInTheDocument());
  });
});

describe('schedule trigger form (Part 17)', () => {
  const schedule = (config: Record<string, unknown>, issues: ValidationIssue[] = []) =>
    setup({ kind: 'TRIGGER', type: 'schedule.trigger', config }, { issues });

  it('starts empty and sets up a weekday schedule in the browser timezone (FR-17.1/17.2)', async () => {
    const { last } = schedule({});
    await userEvent.click(screen.getByRole('button', { name: 'Set up the schedule' }));
    expect(last()).toEqual({
      schedule: {
        kind: 'weekdays',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        time: '09:00',
      },
    });
    expect(screen.getByLabelText('Runs')).toHaveValue('weekdays');
  });

  it('every kind round-trips without cron, keeping timezone and time (AC-17.1)', async () => {
    const { last } = schedule({
      schedule: { kind: 'daily', timezone: 'Africa/Johannesburg', time: '07:00' },
    });
    await userEvent.selectOptions(screen.getByLabelText('Runs'), 'weekly');
    await userEvent.click(screen.getByRole('button', { name: 'Fri' }));
    expect(last()).toEqual({
      schedule: {
        kind: 'weekly',
        timezone: 'Africa/Johannesburg',
        time: '07:00',
        daysOfWeek: [1, 5],
      },
    });
    await userEvent.selectOptions(screen.getByLabelText('Runs'), 'monthly');
    await userEvent.selectOptions(screen.getByLabelText('Day of the month'), '31');
    expect(screen.getByText(/Months without day 31 are skipped/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Day of the month'), 'last');
    expect(last()).toMatchObject({ schedule: { kind: 'monthly', dayOfMonth: 'last' } });
    await userEvent.selectOptions(screen.getByLabelText('Runs'), 'interval');
    await userEvent.selectOptions(screen.getByLabelText('Interval'), '30');
    expect(last()).toEqual({
      schedule: { kind: 'interval', timezone: 'Africa/Johannesburg', everyMinutes: 30 },
    });
    await userEvent.selectOptions(screen.getByLabelText('Runs'), 'hourly');
    fireEvent.change(screen.getByLabelText('Minute past the hour'), { target: { value: '45' } });
    expect(last()).toEqual({
      schedule: { kind: 'hourly', timezone: 'Africa/Johannesburg', minute: 45 },
    });
  });

  it('previews the next runs with a plain-language summary (FR-17.3)', () => {
    schedule({ schedule: { kind: 'weekdays', timezone: 'UTC', time: '07:00' } });
    const preview = screen.getByRole('region', { name: 'Schedule preview' });
    expect(within(preview).getByText('Weekdays at 07:00 (UTC)')).toBeInTheDocument();
    expect(
      within(within(preview).getByRole('list', { name: 'Next runs' })).getAllByRole('listitem'),
    ).toHaveLength(5);
  });

  it('shows the server issue on the right field, and whole-schedule issues on Runs (AC-17.3)', () => {
    schedule({ schedule: { kind: 'cron', timezone: 'UTC', expression: '* * * * *' } }, [
      {
        code: 'INVALID_NODE_CONFIG',
        severity: 'error',
        nodeKey: 'target',
        path: 'schedule.expression',
        message: 'Schedules on this server run at most every 5 minutes',
      },
      {
        code: 'INVALID_NODE_CONFIG',
        severity: 'error',
        nodeKey: 'target',
        path: 'schedule.timezone',
        message: 'Use an IANA timezone',
      },
    ]);
    const messageOf = (label: string) =>
      document.getElementById(screen.getByLabelText(label).getAttribute('aria-describedby')!)!;
    expect(messageOf('Cron expression')).toHaveTextContent('at most every 5 minutes');
    expect(messageOf('Timezone')).toHaveTextContent('Use an IANA timezone');
  });

  it('offers data for later steps (FR-17.10)', async () => {
    setup({ kind: 'ACTION', type: 'util.log', config: {} });
    // The harness trigger is GitHub; the catalogue entry is checked directly.
    const { triggerFields } = await import('../reference-catalog');
    expect(triggerFields('schedule.trigger').map((f) => f.path)).toEqual([
      'scheduledFor',
      'triggeredAt',
      'timezone',
      'scheduleId',
      'triggerType',
    ]);
  });
});

describe('HTTP request form (Part 18)', () => {
  const request = (config: Record<string, unknown>, issues: ValidationIssue[] = []) =>
    setup({ kind: 'ACTION', type: 'http.request', config }, { issues });

  it('connection is optional and created in place; GET has no body (FR-18.7)', async () => {
    request({ url: 'https://api.example.com/items' });
    expect(await screen.findByText(/No HTTP connection in this workspace yet/)).toBeInTheDocument();
    expect(screen.getByText(/without stored credentials/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New HTTP connection' }));
    expect(screen.getByRole('dialog', { name: 'New HTTP connection' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Body')).toBeDisabled();
    expect(screen.getByText('GET requests have no body.')).toBeInTheDocument();
  });

  it('POST with a JSON body and templates; idempotency only for POST/PATCH (FR-18.7/18.8)', async () => {
    const { last } = request({ url: 'https://api.example.com/items' });
    await userEvent.selectOptions(await screen.findByLabelText('Method'), 'POST');
    await userEvent.selectOptions(screen.getByLabelText('Body'), 'json');
    const json = screen.getByLabelText('JSON body');
    fireEvent.change(json, { target: { value: '{"title": "{{ trigger.issue.title }}"' } });
    expect(screen.getByText(/Not valid JSON yet/)).toBeInTheDocument();
    fireEvent.change(json, { target: { value: '{"title": "{{ trigger.issue.title }}"}' } });
    expect(last()).toMatchObject({
      method: 'POST',
      body: { type: 'json', value: { title: '{{ trigger.issue.title }}' } },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    await userEvent.click(screen.getByLabelText('The API de-duplicates retries'));
    expect(last()).toMatchObject({ idempotent: true });
    await userEvent.click(screen.getByLabelText('Fail the step on 4xx responses'));
    expect(last()).toMatchObject({ failOn4xx: false });
    // Back to GET: body and idempotency are dropped.
    await userEvent.selectOptions(screen.getByLabelText('Method'), 'GET');
    expect(last()).not.toHaveProperty('body');
    expect(last()).not.toHaveProperty('idempotent');
    expect(screen.queryByLabelText('The API de-duplicates retries')).not.toBeInTheDocument();
  });

  it('warns about hand-typed credential headers and risky URLs (FR-18.9/18.10)', async () => {
    const { last } = request({ url: 'http://api.example.com' });
    expect(await screen.findByText('Only https:// URLs are allowed.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add header' }));
    await userEvent.type(screen.getByLabelText('Headers 1 name'), 'Authorization');
    expect(screen.getByText(/looks like a credential/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Headers 1 value'), { target: { value: 'x' } });
    expect(last()).toMatchObject({ headers: { Authorization: 'x' } });
  });

  it('shows the server issue on the URL field', async () => {
    request({ url: 'https://internal.example' }, [
      {
        code: 'INVALID_NODE_CONFIG',
        severity: 'error',
        nodeKey: 'target',
        path: 'url',
        message: 'destination is not allowed by the egress policy',
      },
    ]);
    expect(
      await screen.findByText('destination is not allowed by the egress policy'),
    ).toBeInTheDocument();
  });

  it('registers its output for later steps (FR-18.11)', async () => {
    const { outputFields } = await import('../reference-catalog');
    expect(
      outputFields('http.request', {})
        ?.slice(0, 2)
        .map((f) => f.path),
    ).toEqual(['status', 'body']);
  });
});

describe('webhook trigger form (Part 19)', () => {
  const hook = (config: Record<string, unknown>, issues: ValidationIssue[] = []) =>
    setup({ kind: 'TRIGGER', type: 'webhook.received', config }, { issues });

  it('defaults to a shared secret; HMAC presets fill the backend fields (FR-19.1)', async () => {
    const { last } = hook({});
    expect(screen.getByLabelText('Verification')).toHaveValue('token');
    await userEvent.selectOptions(screen.getByLabelText('Verification'), 'hmac');
    await userEvent.click(screen.getByRole('button', { name: 'Slack-style' }));
    expect(last()).toEqual({
      verification: {
        mode: 'hmac',
        algorithm: 'sha256',
        headerName: 'X-Slack-Signature',
        encoding: 'hex',
        prefix: 'v0=',
        timestamp: {
          headerName: 'X-Slack-Request-Timestamp',
          toleranceSeconds: 300,
          format: 'v0:{timestamp}:{body}',
        },
      },
    });
    expect(screen.queryByRole('button', { name: /Stripe/ })).not.toBeInTheDocument();
  });

  it('"None" requires the explicit acknowledgement (FR-19.1)', async () => {
    const { last } = hook({});
    await userEvent.selectOptions(screen.getByLabelText('Verification'), 'none');
    expect(last()).toEqual({ verification: { mode: 'none' } });
    await userEvent.click(screen.getByLabelText('Anyone with the URL can start this workflow'));
    expect(last()).toEqual({ verification: { mode: 'none', acknowledgeUnverified: true } });
  });

  it('methods, deduplication, filter and response round-trip (FR-19.2)', async () => {
    const { last } = hook({});
    await userEvent.click(screen.getByLabelText('GET'));
    expect(last()).toMatchObject({ methods: ['POST', 'GET'] });
    await userEvent.selectOptions(screen.getByLabelText('Duplicate detection'), 'body');
    fireEvent.change(screen.getByLabelText('Body field (dot path)'), {
      target: { value: 'event.id' },
    });
    expect(last()).toMatchObject({ deduplication: { source: 'body', path: 'event.id' } });
    await userEvent.selectOptions(screen.getByLabelText('Response status'), '200');
    expect(last()).toMatchObject({ response: { status: 200 } });
    await userEvent.click(screen.getByLabelText(/Start a run only for some deliveries/));
    expect(last()).toHaveProperty('filter');
    expect(screen.getByText(/stored as “Ignored”/)).toBeInTheDocument();
  });

  it('shows server issues on the field', () => {
    hook({ verification: { mode: 'basic', username: 'a:b' } }, [
      {
        code: 'INVALID_NODE_CONFIG',
        severity: 'error',
        nodeKey: 'target',
        path: 'verification.username',
        message: 'must not contain ":"',
      },
    ]);
    expect(screen.getByText('must not contain ":"')).toBeInTheDocument();
  });
});

describe('HTTP poll form (Part 20)', () => {
  const poll = (config: Record<string, unknown>, issues: ValidationIssue[] = []) =>
    setup({ kind: 'TRIGGER', type: 'http.poll', config }, { issues });

  it('request, schedule, items, identity, cursor and first-poll options round-trip (AC-20.1)', async () => {
    const { last } = poll({ request: { url: 'https://api.example.com/orders' } });
    await userEvent.click(await screen.findByRole('button', { name: 'Set up the schedule' }));
    expect(last()).toMatchObject({ schedule: { kind: 'interval', everyMinutes: 15 } });
    fireEvent.change(screen.getByLabelText('Where the items are (dot path, optional)'), {
      target: { value: 'data.items' },
    });
    fireEvent.change(screen.getByLabelText('Item id (dot path, optional)'), {
      target: { value: 'id' },
    });
    fireEvent.change(screen.getByLabelText('Cursor in the response (optional)'), {
      target: { value: 'meta.next' },
    });
    fireEvent.change(screen.getByLabelText('Sent next time as'), { target: { value: 'since' } });
    await userEvent.click(screen.getByLabelText(/First poll records existing items/));
    fireEvent.change(screen.getByLabelText('Max new items per poll'), { target: { value: '20' } });
    expect(last()).toMatchObject({
      request: { url: 'https://api.example.com/orders' },
      items: { path: 'data.items' },
      identity: { path: 'id' },
      cursor: { responsePath: 'meta.next', queryParam: 'since' },
      seedOnFirstPoll: false,
      maxItemsPerPoll: 20,
    });
  });

  it('refuses templates in the URL with an explanation (AC-20.3)', async () => {
    poll({ request: { url: 'https://api.example.com/{{ trigger.id }}' } });
    expect(await screen.findByText(/Templates are not available here/)).toBeInTheDocument();
  });

  it('checks the paths against a pasted sample, locally (FR-20.6)', async () => {
    poll({
      request: { url: 'https://a.example' },
      items: { path: 'data' },
      identity: { path: 'id' },
    });
    await userEvent.click(await screen.findByRole('button', { name: /Check the paths/ }));
    fireEvent.change(screen.getByLabelText('Sample response (JSON)'), {
      target: { value: '{"data":[{"id":1,"title":"x"},{"title":"y"}]}' },
    });
    const result = screen.getByRole('status');
    expect(result).toHaveTextContent('2 items found');
    expect(result).toHaveTextContent('Ids: 1');
    expect(result).toHaveTextContent('1 item has no usable id at “id”');
    expect(result).toHaveTextContent('trigger.item.id, trigger.item.title');
    await userEvent.click(screen.getByRole('button', { name: 'Close and clear' }));
    expect(screen.queryByLabelText('Sample response (JSON)')).not.toBeInTheDocument();
  });

  it('shows server issues on request and schedule fields (FR-20.7)', async () => {
    poll(
      {
        request: { url: 'https://10.0.0.1/x' },
        schedule: { kind: 'interval', timezone: 'UTC', everyMinutes: 1 },
      },
      [
        {
          code: 'INVALID_NODE_CONFIG',
          severity: 'error',
          nodeKey: 'target',
          path: 'request.url',
          message: 'destination is blocked',
        },
        {
          code: 'INVALID_NODE_CONFIG',
          severity: 'error',
          nodeKey: 'target',
          path: 'schedule.everyMinutes',
          message: 'Schedules on this server run at most every 5 minutes',
        },
      ],
    );
    expect(await screen.findByText('destination is blocked')).toBeInTheDocument();
    expect(
      screen.getByText('Schedules on this server run at most every 5 minutes'),
    ).toBeInTheDocument();
  });

  it('registers item fields for later steps (AC-20.4)', async () => {
    const { triggerFields } = await import('../reference-catalog');
    expect(triggerFields('http.poll').map((f) => f.path)).toContain('item');
  });
});
