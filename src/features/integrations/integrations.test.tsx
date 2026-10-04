import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import {
  CONNECTION_ID,
  connections,
  workflowDetail,
  workflowSummary,
  workspaces,
  WS_ID,
} from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { Connection, WorkspaceRole } from '@/types/api';
import {
  browser,
  callbackErrorMessage,
  isSafeProviderUrl,
  parseCallback,
  rememberReturn,
} from './connect-flow';

const WS = `${API}/workspaces/${WS_ID}`;
const URL_ = `/w/${WS_ID}/integrations`;
const slack = connections[0];

const asRole = (role: WorkspaceRole) =>
  server.use(
    http.get(`${API}/workspaces`, () =>
      HttpResponse.json(workspaces.map((w) => (w.id === WS_ID ? { ...w, role } : w))),
    ),
  );
const withConnections = (list: Connection[]) =>
  server.use(http.get(`${WS}/integrations`, () => HttpResponse.json(list)));
const card = (name: string) => screen.findByRole('region', { name });

// The Integrations route is lazy (Part 19); load it once so the first test does not time out.
beforeAll(() => import('./pages/integrations-page'), 60_000);

afterEach(() => sessionStorage.clear());

describe('integrations page (Part 10)', () => {
  it('shows each provider with what it enables, its state and its connections (FR-10.1/10.2)', async () => {
    renderRoute(URL_);
    const github = await card('GitHub');
    expect(within(github).getByText('Trigger: Issue opened')).toBeInTheDocument();
    expect(within(github).getByRole('button', { name: 'Install on GitHub' })).toBeInTheDocument();
    expect(within(github).getByText(/Choose which repositories it can see/)).toBeInTheDocument();

    const slackCard = screen.getByRole('region', { name: 'Slack' });
    const list = within(slackCard).getByRole('list', { name: 'Slack connections' });
    expect(within(list).getByText('Acme Slack')).toBeInTheDocument();
    expect(within(list).getByText('Connected')).toBeInTheDocument();
    expect(within(list).getByText(/chat:write, channels:read/)).toBeInTheDocument();
    expect(within(slackCard).getByRole('button', { name: 'Add another' })).toBeInTheDocument();

    // Microsoft is not configured on this server (fixture).
    const microsoft = screen.getByRole('region', { name: 'Microsoft To Do' });
    expect(within(microsoft).getByText('Not available on this server')).toBeInTheDocument();
    expect(within(microsoft).queryByRole('button')).not.toBeInTheDocument();
    // Never any token on the page.
    // (token formats: Slack xox…, GitHub ghs_/gho_/ghu_, JWT-like eyJ…)
    expect(document.body.textContent).not.toMatch(/xox[abpr]-|gh[osu]_|eyJ[\w-]{10,}/);
  });

  it('lists several connections of one provider, and explains one that needs attention (FR-10.5)', async () => {
    withConnections([
      slack,
      {
        ...slack,
        id: '22222222-2222-4222-8222-222222222222',
        externalAccountId: 'T999',
        accountLabel: 'Ops Slack',
        status: 'NEEDS_ATTENTION',
      },
    ]);
    renderRoute(URL_);
    const list = within(await card('Slack')).getByRole('list', { name: 'Slack connections' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByText('Needs attention')).toBeInTheDocument();
    expect(within(list).getByText(/rejected FlowForge’s access/)).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
  });

  it('connecting follows the backend URL and remembers where to come back (FR-10.3)', async () => {
    const assign = vi.spyOn(browser, 'assign').mockImplementation(() => undefined);
    server.use(
      http.post(`${WS}/integrations/GITHUB/connect`, () =>
        HttpResponse.json({ url: 'https://github.com/apps/flowforge/installations/new?state=abc' }),
      ),
    );
    renderRoute(URL_);
    await userEvent.click(
      within(await card('GitHub')).getByRole('button', { name: 'Install on GitHub' }),
    );
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        'https://github.com/apps/flowforge/installations/new?state=abc',
      ),
    );
    expect(JSON.parse(sessionStorage.getItem('flowforge.integrations.return')!)).toEqual({
      provider: 'GITHUB',
      workspaceId: WS_ID,
    });
    assign.mockRestore();
  });

  it('refuses to follow an unexpected URL', async () => {
    const assign = vi.spyOn(browser, 'assign').mockImplementation(() => undefined);
    server.use(
      http.post(`${WS}/integrations/SLACK/connect`, () =>
        HttpResponse.json({ url: 'javascript:alert(1)' }),
      ),
    );
    renderRoute(URL_);
    await userEvent.click(within(await card('Slack')).getByRole('button', { name: 'Add another' }));
    expect(await screen.findByText(/unexpected connect address/)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    assign.mockRestore();
  });

  it('shows why connecting cannot start (e.g. 503 not configured)', async () => {
    server.use(
      http.post(`${WS}/integrations/GITHUB/connect`, () =>
        apiError(503, 'GitHub is not configured on this server'),
      ),
    );
    renderRoute(URL_);
    await userEvent.click(
      within(await card('GitHub')).getByRole('button', { name: 'Install on GitHub' }),
    );
    expect(
      await screen.findByText(/Could not start the connection: GitHub is not configured/),
    ).toBeInTheDocument();
  });

  it('disconnect names the workflows using the connection, then removes it (FR-10.6)', async () => {
    const deleted: string[] = [];
    server.use(
      http.get(`${WS}/workflows`, () =>
        HttpResponse.json({ items: [workflowSummary], nextCursor: null }),
      ),
      http.get(`${WS}/workflows/:id`, () =>
        HttpResponse.json({
          ...workflowDetail,
          draftDefinition: {
            ...workflowDetail.draftDefinition,
            nodes: [
              ...workflowDetail.draftDefinition.nodes,
              {
                key: 'notify',
                kind: 'ACTION',
                type: 'slack.sendMessage',
                config: { connectionId: CONNECTION_ID },
              },
            ],
          },
        }),
      ),
      http.delete(`${WS}/integrations/:id`, ({ params }) => {
        deleted.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderRoute(URL_);
    await userEvent.click(
      within(await card('Slack')).getByRole('button', { name: 'Disconnect Acme Slack' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Disconnect Slack: Acme Slack?' });
    expect(
      await within(dialog).findByRole('link', { name: workflowSummary.name }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/will fail until you connect Slack again/)).toBeInTheDocument();
    withConnections([]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(deleted).toEqual([CONNECTION_ID]));
    await waitFor(() => expect(screen.queryByText('Acme Slack')).not.toBeInTheDocument());
  });

  it('members see connections but cannot connect or disconnect', async () => {
    asRole('MEMBER');
    renderRoute(URL_);
    const github = await card('GitHub');
    expect(within(github).getByText(/Owners and admins can connect GitHub/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Disconnect|Add another|Install/ }),
    ).not.toBeInTheDocument();
  });

  it('does not show providers the app does not know (e.g. TEST)', async () => {
    server.use(
      http.get(`${API}/integrations/providers`, () =>
        HttpResponse.json([
          { key: 'SLACK', configured: true },
          { key: 'TEST', configured: true },
        ]),
      ),
    );
    renderRoute(URL_);
    expect(await card('Slack')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'GitHub' })).not.toBeInTheDocument();
    expect(screen.queryByText('TEST')).not.toBeInTheDocument();
  });
});

describe('integration callback landing (Part 10, FR-10.4)', () => {
  it('returns to the workspace with a success message and drops the query string', async () => {
    rememberReturn({ workspaceId: WS_ID, provider: 'SLACK' });
    const { router } = renderRoute(
      `/integrations?provider=slack&status=connected&connectionId=${CONNECTION_ID}`,
    );
    expect(await screen.findByText('Slack connected: Acme Slack.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(URL_);
    expect(router.state.location.search).toBe('');
    expect(sessionStorage.getItem('flowforge.integrations.return')).toBeNull();
  });

  it('goes back to where the connection was started', async () => {
    rememberReturn({
      workspaceId: WS_ID,
      provider: 'SLACK',
      returnTo: `/w/${WS_ID}/runs`,
      stepKey: 'notify',
    });
    const { router } = renderRoute('/integrations?provider=slack&status=connected&connectionId=x');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}/runs`));
    expect(router.state.location.state).toMatchObject({
      selectStep: 'notify',
      integrationResult: { status: 'connected' },
    });
  });

  it('without a remembered target it uses the user’s workspace', async () => {
    const { router } = renderRoute('/integrations?provider=github&status=error&reason=denied');
    expect(await screen.findByText(/GitHub access was not granted/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(URL_);
  });

  it.each([
    'denied',
    'not_authorized',
    'invalid_state',
    'unknown_provider',
    'provider_error',
    'something_new',
  ])('reason %s gets a specific, actionable message (AC-10.2)', async (reason) => {
    rememberReturn({ workspaceId: WS_ID, provider: 'SLACK' });
    renderRoute(`/integrations?provider=slack&status=error&reason=${reason}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      callbackErrorMessage(reason, 'Slack'),
    );
  });

  it('ignores a remembered return path that is not an app path', () => {
    rememberReturn({ workspaceId: WS_ID, provider: 'SLACK', returnTo: '//evil.example.com' });
    // The landing logic reads it through peekReturn, which drops unsafe paths.
    return import('./connect-flow').then(({ peekReturn }) =>
      expect(peekReturn()?.returnTo).toBeUndefined(),
    );
  });
});

describe('connect-flow helpers', () => {
  it('parses only real callbacks', () => {
    expect(parseCallback('?provider=slack&status=connected&connectionId=c1')).toEqual({
      provider: 'slack',
      status: 'connected',
      connectionId: 'c1',
      reason: undefined,
    });
    expect(parseCallback('?foo=bar')).toBeNull();
  });

  it('only follows https (or localhost) URLs', () => {
    expect(isSafeProviderUrl('https://slack.com/oauth')).toBe(true);
    expect(isSafeProviderUrl('http://localhost:3000/mock')).toBe(true);
    expect(isSafeProviderUrl('http://evil.example.com')).toBe(false);
    expect(isSafeProviderUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeProviderUrl('/relative')).toBe(false);
  });
});

describe('expanded providers (Part 16)', () => {
  const withProviders = () =>
    server.use(
      http.get(`${API}/integrations/providers`, () =>
        HttpResponse.json([
          { key: 'GITHUB', configured: true, connectionType: 'OAUTH' },
          { key: 'JIRA', configured: true, connectionType: 'OAUTH' },
          { key: 'GMAIL', configured: false, connectionType: 'OAUTH' },
          { key: 'HTTP', configured: true, connectionType: 'CREDENTIALS' },
          { key: 'TEST', configured: true, connectionType: 'OAUTH' },
        ]),
      ),
    );

  it('shows Jira, Gmail and HTTP cards from the provider list; TEST is never shown (FR-16.4/16.6)', async () => {
    withProviders();
    withConnections([]);
    renderRoute(URL_);
    const jira = await card('Jira');
    expect(within(jira).getByRole('button', { name: 'Connect Jira' })).toBeInTheDocument();
    const gmail = screen.getByRole('region', { name: 'Gmail' });
    expect(within(gmail).getByText('Not available on this server')).toBeInTheDocument();
    // Credentials providers open a form instead of an OAuth redirect (Part 18).
    const httpCard = screen.getByRole('region', { name: 'HTTP connections' });
    expect(
      within(httpCard).getByRole('button', { name: 'New HTTP connection' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /test/i })).not.toBeInTheDocument();
  });

  it('explains why a connection needs attention, per reason (FR-16.5)', async () => {
    withProviders();
    withConnections([
      {
        ...slack,
        id: 'c1',
        provider: 'GMAIL',
        accountLabel: 'ops@example.com',
        status: 'NEEDS_ATTENTION',
        statusReason: 'WATCH_RENEWAL_FAILED',
      },
      {
        ...slack,
        id: 'c2',
        provider: 'HTTP',
        accountLabel: 'Billing API',
        status: 'NEEDS_ATTENTION',
        statusReason: 'AUTHENTICATION_FAILED',
        metadata: { authType: 'bearer', secretHint: '…a1b2', baseUrl: 'https://api.example.com' },
      },
    ]);
    renderRoute(URL_);
    const httpCard = await card('HTTP connections');
    expect(within(httpCard).getByText(/credentials were rejected/)).toBeInTheDocument();
    expect(
      within(httpCard).getByText('Bearer token · …a1b2 · https://api.example.com'),
    ).toBeInTheDocument();
    // No OAuth reconnect for credentials.
    expect(within(httpCard).queryByRole('button', { name: /Reconnect/ })).not.toBeInTheDocument();
    const gmail = screen.getByRole('region', { name: 'Gmail' });
    expect(within(gmail).getByText(/stopped sending notifications/)).toBeInTheDocument();
  });
});

describe('HTTP connections (Part 18)', () => {
  const SECRET = ['live', 'token', 'not', 'real', '42'].join('-');
  const httpProviders = () =>
    server.use(
      http.get(`${API}/integrations/providers`, () =>
        HttpResponse.json([{ key: 'HTTP', configured: true, connectionType: 'CREDENTIALS' }]),
      ),
    );
  const billing: Connection = {
    ...slack,
    id: 'h1',
    provider: 'HTTP',
    accountLabel: 'Billing API',
    externalAccountId: 'h1',
    scopes: [],
    metadata: {
      authType: 'bearer',
      secretHint: '…r-42',
      baseUrl: 'https://api.example.com/v1',
      allowedHosts: ['api.example.com'],
    },
  };

  it('creates a connection: hosts follow the base URL, the secret goes only in the body (AC-18.1, AC-18.4)', async () => {
    httpProviders();
    withConnections([]);
    let body: unknown;
    server.use(
      http.post(`${WS}/integrations/http`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...billing }, { status: 201 });
      }),
    );
    renderRoute(URL_);
    const card_ = await card('HTTP connections');
    await userEvent.click(within(card_).getByRole('button', { name: 'New HTTP connection' }));
    const dialog = screen.getByRole('dialog', { name: 'New HTTP connection' });
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Billing API');
    await userEvent.type(
      within(dialog).getByLabelText('Base URL (optional)'),
      'https://api.example.com/v1',
    );
    expect(within(dialog).getByLabelText('Allowed hosts')).toHaveValue('api.example.com');
    const token = within(dialog).getByLabelText('Token');
    expect(token).toHaveAttribute('type', 'password');
    await userEvent.type(token, SECRET);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save connection' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'New HTTP connection' })).not.toBeInTheDocument(),
    );
    expect(body).toEqual({
      name: 'Billing API',
      credentials: { authType: 'bearer', token: SECRET },
      baseUrl: 'https://api.example.com/v1',
      allowedHosts: ['api.example.com'],
    });
    // Nothing kept client-side.
    expect(JSON.stringify({ ...localStorage })).not.toContain(SECRET);
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(SECRET);
    expect(window.location.href).not.toContain(SECRET);
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('warns when no allowed hosts are set, and shows server field errors', async () => {
    httpProviders();
    withConnections([]);
    server.use(
      http.post(`${WS}/integrations/http`, () =>
        HttpResponse.json(
          {
            statusCode: 422,
            error: 'Unprocessable Entity',
            message: 'Invalid base URL',
            details: [{ path: 'baseUrl', message: 'blocked destination' }],
            requestId: 'r',
            path: '/x',
            timestamp: '',
          },
          { status: 422 },
        ),
      ),
    );
    renderRoute(URL_);
    await userEvent.click(
      within(await card('HTTP connections')).getByRole('button', { name: 'New HTTP connection' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'New HTTP connection' });
    expect(within(dialog).getByText(/sent to any host a step calls/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Internal');
    await userEvent.type(within(dialog).getByLabelText('Base URL (optional)'), 'https://10.0.0.1');
    await userEvent.type(within(dialog).getByLabelText('Token'), SECRET);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save connection' }));
    expect(await within(dialog).findByText('blocked destination')).toBeInTheDocument();
  });

  it('tests, edits and replaces credentials of a connection; the secret only appears as its hint', async () => {
    httpProviders();
    withConnections([billing]);
    const calls: { method: string; url: string; body: unknown }[] = [];
    const record = async ({ request }: { request: Request }) => {
      calls.push({ method: request.method, url: request.url, body: await request.json() });
    };
    server.use(
      http.post(`${WS}/integrations/h1/test`, async (info) => {
        await record(info);
        return HttpResponse.json({
          ok: false,
          status: 401,
          category: 'PROVIDER_AUTH',
          message: 'HTTP 401 Unauthorized',
        });
      }),
      http.patch(`${WS}/integrations/h1`, async (info) => {
        await record(info);
        return HttpResponse.json(billing);
      }),
      http.put(`${WS}/integrations/h1/credentials`, async (info) => {
        await record(info);
        return HttpResponse.json(billing);
      }),
    );
    renderRoute(URL_);
    const card_ = await card('HTTP connections');
    expect(
      within(card_).getByText(/Bearer token · …r-42 · https:\/\/api.example.com\/v1/),
    ).toBeInTheDocument();

    await userEvent.click(within(card_).getByRole('button', { name: 'Test' }));
    let dialog = screen.getByRole('dialog', { name: 'Test connection' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send test request' }));
    expect(
      await within(dialog).findByText(/Failed — HTTP 401: HTTP 401 Unauthorized/),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));

    await userEvent.click(within(card_).getByRole('button', { name: 'Edit' }));
    dialog = screen.getByRole('dialog', { name: 'Edit HTTP connection' });
    await userEvent.clear(within(dialog).getByLabelText('Allowed hosts'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));

    await userEvent.click(within(card_).getByRole('button', { name: 'Replace credentials' }));
    dialog = screen.getByRole('dialog', { name: 'Replace credentials' });
    expect(within(dialog).getByText(/…r-42/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Token'), SECRET);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Replace' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));

    expect(calls.map((c) => [c.method, c.body])).toEqual([
      ['POST', { url: 'https://api.example.com/v1', method: 'GET' }],
      ['PATCH', { name: 'Billing API', baseUrl: 'https://api.example.com/v1', allowedHosts: null }],
      ['PUT', { credentials: { authType: 'bearer', token: SECRET } }],
    ]);
    await waitFor(() => expect(document.body.innerHTML).not.toContain(SECRET));
  });

  it('members see HTTP connections but cannot create, test or change them', async () => {
    asRole('MEMBER');
    httpProviders();
    withConnections([billing]);
    renderRoute(URL_);
    const card_ = await card('HTTP connections');
    expect(within(card_).getByText('Billing API')).toBeInTheDocument();
    expect(within(card_).queryByRole('button')).not.toBeInTheDocument();
  });
});
