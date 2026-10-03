import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const signedOut = () =>
  server.use(
    http.post(`${API}/auth/refresh`, () => apiError(401, 'Invalid or expired refresh token')),
  );

describe('public website (Part 12)', () => {
  it('signed-out visitors get the homepage at /, with sign in and start building', async () => {
    signedOut();
    renderRoute('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Connect your tools/ }),
    ).toBeInTheDocument();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: /Sign in/ })).toHaveAttribute('href', '/login');
    expect(within(header).getByRole('link', { name: /Start building/ })).toHaveAttribute(
      'href',
      '/register',
    );
    // Only real integrations and steps are advertised.
    expect(screen.getAllByText('Microsoft To Do').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/Jira|ServiceNow|SQL Server|PostgreSQL|OpenAI/);
  });

  it('signed-in users still go straight to their workspace', async () => {
    const { router } = renderRoute('/');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}`));
  });

  it.each([
    ['/features', /Everything you need to automate/],
    ['/security', /Built to be trusted/],
    ['/integrations', /Connect the tools your team already uses/],
  ])('%s is public', async (path, heading) => {
    signedOut();
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('/integrations with a callback query still finishes the connection', async () => {
    const { router } = renderRoute('/integrations?provider=slack&status=error&reason=denied');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/w/${WS_ID}/integrations`));
  });
});
