import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { user, workspaces, WS_ID } from '@/test/msw/fixtures';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { WorkspaceRole } from '@/types/api';

const asRole = (role: WorkspaceRole) =>
  server.use(
    http.get(`${API}/workspaces`, () =>
      HttpResponse.json(workspaces.map((w) => (w.id === WS_ID ? { ...w, role } : w))),
    ),
  );

describe('settings (Part 11)', () => {
  it('has deep-linkable tabs: Workspace, Members, Account, Danger zone (FR-11.5)', async () => {
    renderRoute(`/w/${WS_ID}/settings/account`);
    const tabs = await screen.findByRole('navigation', { name: 'Settings sections' });
    expect(
      within(tabs)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Workspace', 'Members', 'Account', 'Danger zone']);
    expect(within(tabs).getByRole('link', { name: 'Account' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows the account read-only: nothing editable the backend cannot change (FR-11.1, AC-11.2)', async () => {
    renderRoute(`/w/${WS_ID}/settings/account`);
    // The account panel (the header's user menu shows the email too).
    const panel = (await screen.findByRole('heading', { name: 'Your account' })).parentElement!;
    expect(within(panel).getByText(user.email)).toBeInTheDocument();
    expect(within(panel).getByText(user.name)).toBeInTheDocument();
    expect(
      within(panel).getByText(/Changing your name, email or password is not available yet/),
    ).toBeInTheDocument();
    expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('signs out of all devices from the account tab', async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/auth/logout-all`, () => {
        calls++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router } = renderRoute(`/w/${WS_ID}/settings/account`);
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out everywhere' }));
    await waitFor(() => expect(calls).toBe(1));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('the user menu links to the account settings', async () => {
    renderRoute(`/w/${WS_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(user.name) }));
    expect(screen.getByRole('menuitem', { name: 'Account settings' })).toHaveAttribute(
      'href',
      `/w/${WS_ID}/settings/account`,
    );
  });

  it('the workspace tab shows the id and role; a MEMBER cannot rename (FR-11.2)', async () => {
    asRole('MEMBER');
    renderRoute(`/w/${WS_ID}/settings`);
    expect(await screen.findByText(WS_ID)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy workspace id' })).toBeInTheDocument();
  });

  it('danger zone: members can leave, only owners can delete (FR-11.4)', async () => {
    asRole('MEMBER');
    renderRoute(`/w/${WS_ID}/settings/danger`);
    expect(await screen.findByRole('button', { name: 'Leave workspace' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete workspace' })).not.toBeInTheDocument();
  });
});
