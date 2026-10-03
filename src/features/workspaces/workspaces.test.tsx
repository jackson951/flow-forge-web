import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { members, OTHER_WS_ID, user, workspaces, WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { Member, Workspace, WorkspaceRole } from '@/types/api';
import { sameSectionIn } from './same-section';
import { lastWorkspace } from './last-workspace';

const T = '2026-10-03T08:00:00.000Z';
const person = (name: string, role: WorkspaceRole, userId = `u-${name}`): Member => ({
  userId,
  email: `${name.toLowerCase()}@example.test`,
  name,
  role,
  joinedAt: T,
});

/** The signed-in user has `role` in WS_ID. */
function asRole(role: WorkspaceRole, roster: Member[] = []) {
  const list: Workspace[] = workspaces.map((w) => (w.id === WS_ID ? { ...w, role } : w));
  server.use(
    http.get(`${API}/workspaces`, () => HttpResponse.json(list)),
    http.get(`${API}/workspaces/${WS_ID}/members`, () =>
      HttpResponse.json([{ ...members[0], role }, ...roster]),
    ),
  );
}

afterEach(() => localStorage.clear());

describe('sameSectionIn', () => {
  it.each([
    [`/w/${WS_ID}`, `/w/b`],
    [`/w/${WS_ID}/runs`, `/w/b/runs`],
    [`/w/${WS_ID}/runs/r1`, `/w/b/runs`],
    [`/w/${WS_ID}/workflows/f1`, `/w/b/workflows`],
    [`/w/${WS_ID}/settings/members`, `/w/b/settings/members`],
    [`/w/${WS_ID}/integrations`, `/w/b/integrations`],
  ])('%s → %s', (from, to) => expect(sameSectionIn(from, 'b')).toBe(to));
});

describe('workspace switcher (Part 03)', () => {
  it('lists the workspaces with roles and switches to the same section', async () => {
    const { router } = renderRoute(`/w/${WS_ID}/runs`);
    await userEvent.click(await screen.findByRole('button', { name: /Workspace: Acme/ }));
    const list = screen.getByRole('listbox', { name: 'Your workspaces' });
    expect(within(list).getByRole('option', { name: /Acme/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(within(list).getByRole('option', { name: /Side project/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${OTHER_WS_ID}/runs`));
    expect(
      await screen.findByRole('button', { name: /Workspace: Side project/ }),
    ).toBeInTheDocument();
  });

  it("never shows the previous workspace's data while the next one loads (AC-03.1)", async () => {
    server.use(
      http.get(`${API}/workspaces/${WS_ID}/members`, () =>
        HttpResponse.json([person('Alice', 'OWNER', user.id), person('Ann', 'MEMBER')]),
      ),
      http.get(`${API}/workspaces/${OTHER_WS_ID}/members`, async () => {
        await delay(400);
        return HttpResponse.json([person('Bob', 'OWNER'), person('Ada', 'MEMBER', user.id)]);
      }),
    );
    const { router } = renderRoute(`/w/${WS_ID}/settings/members`);
    expect(await screen.findByText('Ann')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Workspace: Acme/ }));
    await userEvent.click(screen.getByRole('option', { name: /Side project/ }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/w/${OTHER_WS_ID}/settings/members`),
    );

    // While Bob's workspace loads, Ann (previous workspace) must not be on screen.
    expect(screen.queryByText('Ann')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Loading members')).toBeInTheDocument();
    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Ann')).not.toBeInTheDocument();
  });

  it('creates a workspace and opens it', async () => {
    const created: Workspace = {
      id: 'new-ws-id',
      name: 'Platform',
      role: 'OWNER',
      createdAt: T,
      updatedAt: T,
    };
    let body: unknown;
    server.use(
      http.post(`${API}/workspaces`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(created, { status: 201 });
      }),
      http.get(`${API}/workspaces`, () => HttpResponse.json([...workspaces, created])),
    );
    const { router } = renderRoute(`/w/${WS_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: /Workspace: Acme/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
    const dialog = screen.getByRole('dialog', { name: 'Create a workspace' });
    await userEvent.type(within(dialog).getByLabelText('Name'), '  Platform  ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create workspace' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/w/new-ws-id'));
    expect(body).toEqual({ name: 'Platform' });
  });
});

describe('workspace URL guard (Part 03, AC-03.2)', () => {
  it('a workspace the user is not a member of shows "not found" and loads none of its data', async () => {
    const foreign = '99999999-9999-4999-8999-999999999999';
    const tenantCalls: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes(foreign)) tenantCalls.push(request.url);
    });
    renderRoute(`/w/${foreign}/settings/members`);
    expect(await screen.findByRole('heading', { name: 'Workspace not found' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(tenantCalls).toEqual([]);
    server.events.removeAllListeners();
  });
});

describe('last-used workspace (FR-03.2)', () => {
  it('/ returns to the workspace opened last', async () => {
    lastWorkspace.set(user.id, OTHER_WS_ID);
    const { router } = renderRoute('/');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${OTHER_WS_ID}`));
  });

  it('falls back to the first workspace when the remembered one is gone', async () => {
    lastWorkspace.set(user.id, 'deleted-workspace');
    const { router } = renderRoute('/');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}`));
  });

  it('offers to create one when the user has no workspace', async () => {
    server.use(http.get(`${API}/workspaces`, () => HttpResponse.json([])));
    renderRoute('/');
    expect(
      await screen.findByRole('heading', { name: 'Create your first workspace' }),
    ).toBeInTheDocument();
  });
});

describe('members and roles (Part 03, AC-03.3)', () => {
  it('a MEMBER sees no admin controls and can only leave', async () => {
    asRole('MEMBER', [person('Olive', 'OWNER')]);
    renderRoute(`/w/${WS_ID}/settings/members`);
    expect(await screen.findByText('Olive')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
  });

  it('an ADMIN cannot grant OWNER or change an owner', async () => {
    asRole('ADMIN', [person('Olive', 'OWNER'), person('Max', 'MEMBER')]);
    renderRoute(`/w/${WS_ID}/settings/members`);
    expect(await screen.findByText('Max')).toBeInTheDocument();

    // Max's role select offers ADMIN and MEMBER, never OWNER.
    const maxRole = screen.getByRole('combobox', { name: 'Role of Max' });
    expect(
      within(maxRole)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Admin', 'Member']);
    // Olive (OWNER) cannot be changed or removed by an ADMIN.
    expect(screen.queryByRole('combobox', { name: 'Role of Olive' })).not.toBeInTheDocument();
    const oliveRow = screen.getByText('Olive').closest('tr')!;
    expect(within(oliveRow).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a member' });
    expect(
      within(dialog)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Admin', 'Member']);
  });

  it('an OWNER sees delete; an ADMIN does not', async () => {
    asRole('OWNER');
    const owner = renderRoute(`/w/${WS_ID}/settings/danger`);
    expect(await screen.findByRole('button', { name: 'Delete workspace' })).toBeInTheDocument();
    owner.unmount();

    asRole('ADMIN');
    renderRoute(`/w/${WS_ID}/settings/danger`);
    expect(await screen.findByRole('button', { name: 'Leave workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete workspace' })).not.toBeInTheDocument();
  });

  it('adds a member, with an actionable message for an unknown email', async () => {
    let body: unknown;
    server.use(
      http.post(`${API}/workspaces/${WS_ID}/members`, async ({ request }) => {
        body = await request.json();
        return (body as { email: string }).email === 'nobody@example.test'
          ? apiError(404, 'User not found')
          : HttpResponse.json(person('Grace', 'ADMIN'), { status: 201 });
      }),
    );
    renderRoute(`/w/${WS_ID}/settings/members`);
    await userEvent.click(await screen.findByRole('button', { name: 'Add member' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a member' });
    await userEvent.type(within(dialog).getByLabelText('Email'), 'nobody@example.test');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add member' }));
    expect(
      await within(dialog).findByText(/No FlowForge account uses this email/),
    ).toBeInTheDocument();

    await userEvent.clear(within(dialog).getByLabelText('Email'));
    await userEvent.type(within(dialog).getByLabelText('Email'), 'grace@example.test');
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'ADMIN');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add member' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(body).toEqual({ email: 'grace@example.test', role: 'ADMIN' });
  });

  it('changes a role and shows the last-owner error from the backend', async () => {
    asRole('OWNER', [person('Max', 'MEMBER')]);
    const sent: unknown[] = [];
    server.use(
      http.patch(`${API}/workspaces/${WS_ID}/members/:userId`, async ({ request, params }) => {
        sent.push({ userId: params.userId, ...((await request.json()) as object) });
        return params.userId === user.id
          ? apiError(409, 'A workspace must keep at least one owner')
          : HttpResponse.json(person('Max', 'ADMIN'));
      }),
    );
    renderRoute(`/w/${WS_ID}/settings/members`);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Role of Max' }),
      'ADMIN',
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: `Role of ${user.name}` }),
      'MEMBER',
    );
    expect(await screen.findByText('A workspace must keep at least one owner')).toBeInTheDocument();
    expect(sent).toEqual([
      { userId: 'u-Max', role: 'ADMIN' },
      { userId: user.id, role: 'MEMBER' },
    ]);
  });
});

describe('rename, leave and delete (AC-03.4)', () => {
  it('renames the workspace', async () => {
    asRole('ADMIN');
    server.use(
      http.patch(`${API}/workspaces/${WS_ID}`, async ({ request }) =>
        HttpResponse.json({
          ...workspaces[0],
          role: 'ADMIN',
          ...((await request.json()) as object),
        }),
      ),
    );
    renderRoute(`/w/${WS_ID}/settings`);
    const name = await screen.findByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Acme Corp');
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Workspace: Acme Corp/ })).toBeInTheDocument();
  });

  it('a MEMBER cannot rename', async () => {
    asRole('MEMBER');
    renderRoute(`/w/${WS_ID}/settings`);
    expect(await screen.findByLabelText('Name')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save name' })).not.toBeInTheDocument();
  });

  it('delete needs the name typed, then leaves for another workspace', async () => {
    let deleted = false;
    server.use(
      http.delete(`${API}/workspaces/${WS_ID}`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${API}/workspaces`, () =>
        HttpResponse.json(deleted ? workspaces.filter((w) => w.id !== WS_ID) : workspaces),
      ),
    );
    const { router } = renderRoute(`/w/${WS_ID}/settings/danger`);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete workspace' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Acme?' });
    const confirm = within(dialog).getByRole('button', { name: 'Delete workspace' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Type “Acme” to confirm/), 'Acme');
    await userEvent.click(confirm);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${OTHER_WS_ID}`));
    expect(deleted).toBe(true);
  });

  it('leaving removes yourself and goes to another workspace', async () => {
    let left = false;
    server.use(
      http.delete(`${API}/workspaces/${WS_ID}/members/${user.id}`, () => {
        left = true;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${API}/workspaces`, () =>
        HttpResponse.json(left ? workspaces.filter((w) => w.id !== WS_ID) : workspaces),
      ),
    );
    const { router } = renderRoute(`/w/${WS_ID}/settings/danger`);
    await userEvent.click(await screen.findByRole('button', { name: 'Leave workspace' }));
    const dialog = screen.getByRole('dialog', { name: 'Leave Acme?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Leave workspace' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${OTHER_WS_ID}`));
  });
});
