import { screen } from '@testing-library/react';
import { renderRoute } from '@/test/render';

describe('routes', () => {
  it.each([
    ['/', 'Dashboard'],
    ['/workflows', 'Workflows'],
    ['/runs', 'Runs'],
    ['/integrations', 'Integrations'],
    ['/settings', 'Settings'],
    ['/login', 'Sign in'],
  ])('%s renders %s', async (path, heading) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('shows not-found for unknown paths', async () => {
    renderRoute('/nope');
    expect(await screen.findByText('This page doesn’t exist')).toBeInTheDocument();
  });
});
