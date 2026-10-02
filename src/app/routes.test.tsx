import { screen } from '@testing-library/react';
import { http } from 'msw';
import { WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

describe('routes (Part 01, FR-01.7)', () => {
  it.each([
    [`/w/${WS_ID}`, 'Dashboard'],
    [`/w/${WS_ID}/workflows`, 'Workflows'],
    [`/w/${WS_ID}/runs`, 'Runs'],
    [`/w/${WS_ID}/integrations`, 'Integrations'],
    [`/w/${WS_ID}/settings`, 'Settings'],
  ])('%s renders %s', async (path, heading) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('/login renders Sign in for a signed-out visitor', async () => {
    server.use(
      http.post(`${API}/auth/refresh`, () => apiError(401, 'Invalid or expired refresh token')),
    );
    renderRoute('/login');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });

  it('/ goes to the first workspace of the user', async () => {
    const { router } = renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/w/${WS_ID}`);
  });

  it('sidebar links stay inside the current workspace', async () => {
    renderRoute(`/w/${WS_ID}/runs`);
    const link = await screen.findByRole('link', { name: 'Workflows' });
    expect(link).toHaveAttribute('href', `/w/${WS_ID}/workflows`);
  });

  it('pages outside a workspace no longer exist', async () => {
    renderRoute('/workflows');
    expect(await screen.findByText('This page doesn’t exist')).toBeInTheDocument();
  });

  it('shows not-found for unknown paths', async () => {
    renderRoute('/nope');
    expect(await screen.findByText('This page doesn’t exist')).toBeInTheDocument();
  });
});
