import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { queryKeys } from '@/lib/query-keys';
import { WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import { session } from '../session/session';

describe('RequireAuth (Part 02, FR-02.6)', () => {
  it('restores the session from the refresh cookie on load and shows the page', async () => {
    renderRoute(`/w/${WS_ID}/runs`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Runs' })).toBeInTheDocument();
    expect(session.getState().status).toBe('authenticated');
  });

  it('sends a signed-out visitor to /login with the page as ?next=', async () => {
    server.use(
      http.post(`${API}/auth/refresh`, () => apiError(401, 'Invalid or expired refresh token')),
    );
    const { router } = renderRoute(`/w/${WS_ID}/runs?status=FAILED`);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe(
      `/w/${WS_ID}/runs?status=FAILED`,
    );
    expect(screen.queryByRole('heading', { name: 'Runs' })).not.toBeInTheDocument();
  });
});

describe('user menu (Part 02, FR-02.7)', () => {
  it('signing out clears cached data and returns to login with a notice (AC-02.6)', async () => {
    const { router, client } = renderRoute(`/w/${WS_ID}`);
    client.setQueryData(queryKeys.runs.list(WS_ID), { items: [], nextCursor: null });

    await userEvent.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(client.getQueryData(queryKeys.runs.list(WS_ID))).toBeUndefined();
    // A deliberate sign-out does not remember the page for the next person.
    expect(router.state.location.search).toBe('');
    expect(await screen.findByRole('status')).toHaveTextContent('You are signed out.');
  });

  it('sign out of all devices calls logout-all', async () => {
    let calledAll = false;
    server.use(
      http.post(`${API}/auth/logout-all`, () => {
        calledAll = true;
        return new Response(null, { status: 204 });
      }),
    );
    const { router } = renderRoute(`/w/${WS_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out of all devices' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(calledAll).toBe(true);
  });

  it('an expired session mid-use shows "session has ended" on the login page', async () => {
    const { router } = renderRoute(`/w/${WS_ID}`);
    await screen.findByRole('button', { name: /Ada Lovelace/ });
    server.use(
      http.post(`${API}/auth/refresh`, () => apiError(401, 'Invalid or expired refresh token')),
    );
    // e.g. the proactive refresh fails
    const { refresh } = await import('../session/session');
    await refresh();
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(await screen.findByRole('status')).toHaveTextContent('Your session has ended');
    // An expired session returns the user to where they were after signing in again.
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe(`/w/${WS_ID}`);
  });
});
