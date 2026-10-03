import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { workflowSummary, workspaces, WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { WorkflowSummary, WorkspaceRole } from '@/types/api';

const wf = (n: number, extra: Partial<WorkflowSummary> = {}): WorkflowSummary => ({
  ...workflowSummary,
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name: `Workflow ${n}`,
  description: null,
  status: 'DRAFT',
  activeVersion: null,
  ...extra,
});

const LIST = `${API}/workspaces/${WS_ID}/workflows`;
const URL_ = `/w/${WS_ID}/workflows`;

/** Records list requests' query strings and serves `pages` by cursor. */
function serveList(pages: Record<string, { items: WorkflowSummary[]; nextCursor: string | null }>) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(LIST, ({ request }) => {
      const q = new URL(request.url).searchParams;
      queries.push(q);
      return HttpResponse.json(
        pages[q.get('cursor') ?? 'first'] ?? { items: [], nextCursor: null },
      );
    }),
  );
  return queries;
}

function asRole(role: WorkspaceRole) {
  server.use(
    http.get(`${API}/workspaces`, () =>
      HttpResponse.json(workspaces.map((w) => (w.id === WS_ID ? { ...w, role } : w))),
    ),
  );
}

/** Where the router is going: the editor route is lazy (React Flow), so it may still be loading. */
const target = (router: {
  state: { navigation: { location?: { pathname: string } }; location: { pathname: string } };
}) => router.state.navigation.location?.pathname ?? router.state.location.pathname;

const openMenu = async (name: string) => {
  await userEvent.click(await screen.findByRole('button', { name: `Actions for ${name}` }));
  return screen.getByRole('menu', { name: `Actions for ${name}` });
};

describe('Workflows list (Part 04)', () => {
  it('pages with "Load more" via the keyset cursor, without duplicates (AC-04.1)', async () => {
    const queries = serveList({
      first: { items: [wf(1), wf(2)], nextCursor: 'cursor-1' },
      'cursor-1': { items: [wf(3), wf(4)], nextCursor: null },
    });
    renderRoute(URL_);
    expect(await screen.findByRole('link', { name: 'Workflow 2' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('link', { name: 'Workflow 4' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Workflow \d$/ })).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    expect(queries.map((q) => q.get('cursor'))).toEqual([null, 'cursor-1']);
  });

  it('keeps the status filter in the URL and sends it to the API (AC-04.2)', async () => {
    const queries = serveList({ first: { items: [wf(1)], nextCursor: null } });
    const { router } = renderRoute(URL_);
    await screen.findByRole('link', { name: 'Workflow 1' });
    await userEvent.click(screen.getByRole('button', { name: 'Drafts' }));
    await waitFor(() => expect(router.state.location.search).toBe('?status=DRAFT'));
    await waitFor(() => expect(queries.at(-1)?.get('status')).toBe('DRAFT'));
    expect(screen.getByRole('button', { name: 'Drafts' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens with the filter from the URL (reload keeps it)', async () => {
    const queries = serveList({
      first: { items: [wf(1, { status: 'ARCHIVED' })], nextCursor: null },
    });
    renderRoute(`${URL_}?status=ARCHIVED`);
    await screen.findByRole('link', { name: 'Workflow 1' });
    expect(queries[0].get('status')).toBe('ARCHIVED');
    expect(screen.getByRole('button', { name: 'Archived' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Archived', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows status, active version and last edit', async () => {
    serveList({
      first: {
        items: [
          wf(1, {
            status: 'PUBLISHED',
            activeVersion: { id: 'v', version: 3, publishedAt: new Date().toISOString() },
          }),
        ],
        nextCursor: null,
      },
    });
    renderRoute(URL_);
    const row = (await screen.findByRole('link', { name: 'Workflow 1' })).closest('tr')!;
    expect(within(row).getByText('Published')).toBeInTheDocument();
    expect(within(row).getByText(/v3 · published/)).toBeInTheDocument();
  });

  it('creates a workflow and opens the editor (FR-04.3)', async () => {
    let body: unknown;
    server.use(
      http.post(LIST, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { ...wf(9), issues: [], draftDefinition: { schemaVersion: 1, nodes: [], edges: [] } },
          { status: 201 },
        );
      }),
    );
    const { router } = renderRoute(URL_);
    await userEvent.click(await screen.findByRole('button', { name: 'Create workflow' }));
    const dialog = screen.getByRole('dialog', { name: 'Create a workflow' });
    await userEvent.type(within(dialog).getByLabelText('Name'), '  Triage issues ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and open editor' }));
    await waitFor(() => expect(target(router)).toBe(`${URL_}/${wf(9).id}`));
    expect(body).toEqual({ name: 'Triage issues' });
    // Let the lazily loaded editor (React Flow) finish inside this test.
    expect(
      await screen.findByRole('heading', { level: 1 }, { timeout: 20_000 }),
    ).toBeInTheDocument();
  });

  it('validates the name before creating', async () => {
    renderRoute(URL_);
    await userEvent.click(await screen.findByRole('button', { name: 'Create workflow' }));
    const dialog = screen.getByRole('dialog', { name: 'Create a workflow' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and open editor' }));
    expect(await within(dialog).findByText('Enter a name')).toBeInTheDocument();
  });

  it('renames optimistically and rolls back if the server refuses (FR-04.6)', async () => {
    serveList({ first: { items: [wf(1)], nextCursor: null } });
    server.use(
      http.patch(`${LIST}/:id`, async () => {
        await delay(300);
        return apiError(409, 'Archived workflows cannot be edited; unarchive first');
      }),
    );
    renderRoute(URL_);
    const menu = await openMenu('Workflow 1');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Edit details' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit workflow details' });
    await userEvent.clear(within(dialog).getByLabelText('Name'));
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Renamed');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('link', { name: 'Renamed' })).toBeInTheDocument(); // optimistic
    expect(await within(dialog).findByText(/cannot be edited/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Workflow 1' })).toBeInTheDocument(); // rolled back
  });

  it('duplicates and opens the copy', async () => {
    serveList({ first: { items: [wf(1)], nextCursor: null } });
    server.use(
      http.post(`${LIST}/:id/duplicate`, () =>
        HttpResponse.json(
          { ...wf(2, { name: 'Copy of Workflow 1' }), issues: [], draftDefinition: {} },
          { status: 201 },
        ),
      ),
    );
    const { router } = renderRoute(URL_);
    const menu = await openMenu('Workflow 1');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }));
    await waitFor(() => expect(target(router)).toBe(`${URL_}/${wf(2).id}`));
  });

  it('archives after a confirmation that explains the consequences', async () => {
    serveList({ first: { items: [wf(1, { status: 'PUBLISHED' })], nextCursor: null } });
    let archived = '';
    server.use(
      http.post(`${LIST}/:id/archive`, ({ params }) => {
        archived = String(params.id);
        return HttpResponse.json(wf(1, { status: 'ARCHIVED' }));
      }),
    );
    renderRoute(URL_);
    const menu = await openMenu('Workflow 1');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Archive' }));
    const dialog = screen.getByRole('dialog', { name: 'Archive “Workflow 1”?' });
    expect(dialog).toHaveTextContent('no new runs start');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive workflow' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(archived).toBe(wf(1).id);
  });

  it('a workflow with runs cannot be deleted; the dialog offers to archive instead', async () => {
    serveList({ first: { items: [wf(1, { status: 'PUBLISHED' })], nextCursor: null } });
    server.use(
      http.delete(`${LIST}/:id`, () =>
        apiError(409, 'This workflow has run history and cannot be deleted; archive it instead'),
      ),
    );
    renderRoute(URL_);
    const menu = await openMenu('Workflow 1');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete “Workflow 1”?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete workflow' }));
    expect(await within(dialog).findByText(/has run history/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive instead' }));
    expect(screen.getByRole('dialog', { name: 'Archive “Workflow 1”?' })).toBeInTheDocument();
  });

  it('deletes a workflow that never ran', async () => {
    let calls = 0;
    serveList({ first: { items: calls ? [] : [wf(1)], nextCursor: null } });
    server.use(
      http.delete(`${LIST}/:id`, () => {
        calls++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderRoute(URL_);
    const menu = await openMenu('Workflow 1');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete “Workflow 1”?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete workflow' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toBe(1);
  });

  it('unarchives from the archived filter', async () => {
    serveList({ first: { items: [wf(1, { status: 'ARCHIVED' })], nextCursor: null } });
    let called = false;
    server.use(
      http.post(`${LIST}/:id/unarchive`, () => {
        called = true;
        return HttpResponse.json(wf(1));
      }),
    );
    renderRoute(`${URL_}?status=ARCHIVED`);
    const menu = await openMenu('Workflow 1');
    expect(within(menu).queryByRole('menuitem', { name: 'Edit details' })).not.toBeInTheDocument();
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Unarchive' }));
    await waitFor(() => expect(called).toBe(true));
  });

  it('a MEMBER cannot archive or delete (AC-04.4)', async () => {
    asRole('MEMBER');
    serveList({ first: { items: [wf(1)], nextCursor: null } });
    renderRoute(URL_);
    const menu = await openMenu('Workflow 1');
    const labels = within(menu)
      .getAllByRole('menuitem')
      .map((i) => i.textContent);
    expect(labels).toEqual(['Open editor', 'Edit details', 'Duplicate']);
  });

  it('empty states: first workflow, and nothing matching a filter', async () => {
    serveList({});
    const first = renderRoute(URL_);
    expect(await screen.findByText('No workflows yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create your first workflow' })).toBeInTheDocument();
    first.unmount();

    renderRoute(`${URL_}?status=PUBLISHED`);
    expect(await screen.findByText('No published workflows')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all workflows' })).toBeInTheDocument();
  });

  it('shows the error with its request id and retries', async () => {
    server.use(http.get(LIST, () => apiError(500, 'Internal server error')));
    renderRoute(URL_);
    expect(await screen.findByText('Request req-test-0001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
