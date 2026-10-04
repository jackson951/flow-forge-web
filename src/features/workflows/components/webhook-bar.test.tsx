import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { RUN_ID, WORKFLOW_ID, workflowDetail, WS_ID } from '@/test/msw/fixtures';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const WF = `${API}/workspaces/${WS_ID}/workflows/${WORKFLOW_ID}`;
const HOOK = `${WF}/webhook`;
const URL_ = `/w/${WS_ID}/workflows/${WORKFLOW_ID}`;
const SECRET = ['whsec', 'not', 'real', 'value', '1234'].join('_');
const HOOK_URL = 'https://flowforge.example/api/v1/webhooks/hooks/AbCdEfGhIjKlMnOpQrStUv';

const withWebhookDraft = () =>
  server.use(
    http.get(WF, () =>
      HttpResponse.json({
        ...workflowDetail,
        draftDefinition: {
          ...workflowDetail.draftDefinition,
          nodes: [
            { key: 'trigger', kind: 'TRIGGER', type: 'webhook.received', config: {} },
            ...workflowDetail.draftDefinition.nodes.slice(1),
          ],
        },
      }),
    ),
  );

const provisioned = (extra: object = {}) => ({
  provisioned: true,
  active: true,
  url: HOOK_URL,
  path: '/api/v1/webhooks/hooks/AbCdEfGhIjKlMnOpQrStUv',
  verificationMode: 'token',
  secretHint: '…1234',
  previousSecretExpiresAt: null,
  previousUrlExpiresAt: null,
  listening: false,
  ...extra,
});

const bar = () => screen.findByRole('region', { name: 'Webhook' }, { timeout: 30_000 });

beforeAll(() => import('../pages/workflow-editor-page'), 180_000);

describe('webhook bar (Part 19)', () => {
  it('before publishing: explains how the URL is created (FR-19.4)', async () => {
    withWebhookDraft();
    server.use(http.get(HOOK, () => HttpResponse.json({ provisioned: false })));
    renderRoute(URL_);
    expect(await within(await bar()).findByText(/Publish to create the URL/)).toBeInTheDocument();
  });

  it('shows the secret once, never again after dismissing or refetching (FR-19.5, AC-19.2)', async () => {
    withWebhookDraft();
    let reads = 0;
    server.use(
      http.get(HOOK, () => {
        reads++;
        return HttpResponse.json(provisioned(reads === 1 ? { secret: SECRET } : {}));
      }),
    );
    renderRoute(URL_);
    const b = await bar();
    expect(await within(b).findByText(HOOK_URL)).toBeInTheDocument();
    expect(within(b).getByText(/Webhook secret — shown only now/)).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(SECRET); // masked until revealed
    await userEvent.click(within(b).getByRole('button', { name: 'Reveal' }));
    expect(within(b).getByText(SECRET)).toBeInTheDocument();
    await userEvent.click(within(b).getByRole('button', { name: 'I’ve stored it' }));
    expect(document.body.innerHTML).not.toContain(SECRET);
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(SECRET);
    expect(within(b).getByText('(…1234)')).toBeInTheDocument();
  });

  it('rotating the secret states the grace period and shows the new one once (FR-19.6)', async () => {
    withWebhookDraft();
    server.use(
      http.get(HOOK, () => HttpResponse.json(provisioned())),
      http.post(`${HOOK}/rotate-secret`, () =>
        HttpResponse.json({ secret: SECRET, secretHint: '…1234', previousSecretExpiresAt: null }),
      ),
    );
    renderRoute(URL_);
    const b = await bar();
    await userEvent.click(await within(b).findByRole('button', { name: 'Rotate secret' }));
    const dialog = screen.getByRole('dialog', { name: 'Rotate the webhook secret?' });
    expect(within(dialog).getByText(/keeps working for 24 hours/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Generate new secret' }));
    expect(await within(b).findByText(/shown only now/)).toBeInTheDocument();
  });

  it('lists deliveries with their outcome and reason; replay starts a new run (FR-19.8/19.9, AC-19.4)', async () => {
    withWebhookDraft();
    const delivery = (
      id: string,
      status: string,
      reason: string | null,
      run: object | null = null,
    ) => ({
      id,
      deliveryId: id,
      status,
      reason,
      receivedAt: new Date().toISOString(),
      sizeBytes: 120,
      sourceIp: '203.0.113.7',
      duplicateCount: id === 'd1' ? 2 : 0,
      lastDuplicateAt: null,
      run,
    });
    server.use(
      http.get(HOOK, () => HttpResponse.json(provisioned())),
      http.get(`${HOOK}/deliveries`, () =>
        HttpResponse.json({
          items: [
            delivery('d1', 'PROCESSED', null, { id: RUN_ID, status: 'SUCCEEDED' }),
            delivery('d2', 'IGNORED', 'filter did not match'),
            delivery('d3', 'REJECTED', 'signature mismatch'),
          ],
          nextCursor: null,
        }),
      ),
      http.post(`${HOOK}/deliveries/d2/replay`, () =>
        HttpResponse.json({ runId: 'r-new', status: 'QUEUED' }, { status: 202 }),
      ),
    );
    renderRoute(URL_);
    await userEvent.click(await within(await bar()).findByRole('button', { name: 'Deliveries' }));
    const dialog = screen.getByRole('dialog', { name: 'Webhook deliveries' });
    const list = await within(dialog).findByRole('list', { name: 'Deliveries' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Processed');
    expect(rows[0]).toHaveTextContent('+2 duplicates');
    expect(rows[1]).toHaveTextContent('Ignored');
    expect(rows[1]).toHaveTextContent('filter did not match');
    expect(rows[2]).toHaveTextContent('signature mismatch');
    expect(within(rows[2]).queryByRole('button', { name: 'Replay' })).not.toBeInTheDocument();
    await userEvent.click(within(rows[1]).getByRole('button', { name: 'Replay' }));
    expect(await within(rows[1]).findByRole('link', { name: 'New run' })).toHaveAttribute(
      'href',
      `/w/${WS_ID}/runs/r-new`,
    );
  });

  it('Listen captures a delivery whose fields are then suggested in later steps (FR-19.7, AC-19.5)', async () => {
    withWebhookDraft();
    server.use(
      http.get(HOOK, () => HttpResponse.json({ provisioned: false })),
      http.post(`${HOOK}/listen`, () =>
        HttpResponse.json({
          url: HOOK_URL,
          path: '/x',
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        }),
      ),
      http.get(`${HOOK}/listen`, () =>
        HttpResponse.json({
          listening: false,
          event: { method: 'POST', headers: {}, query: {}, body: { order: { id: 7 } } },
        }),
      ),
    );
    renderRoute(URL_);
    await userEvent.click(
      await within(await bar()).findByRole('button', { name: 'Listen for a test' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Listen for a test delivery' });
    expect(
      await within(dialog).findByText(/Captured a POST request/, {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));

    // The log step (after the trigger) now offers the captured fields.
    fireEvent.click(document.querySelector<HTMLElement>('.react-flow__node[data-id="log"]')!);
    const message = await screen.findByLabelText('Message');
    await userEvent.type(message, '{{{{body.order');
    const suggestions = screen.getByRole('listbox', { name: 'Data from earlier steps' });
    await waitFor(() =>
      expect(within(suggestions).getByText('trigger.body.order.id')).toBeInTheDocument(),
    );
  });
});
