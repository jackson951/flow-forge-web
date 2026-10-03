import { screen } from '@testing-library/react';
import { http } from 'msw';
import { axeViolations } from '@/test/axe';
import { RUN_ID, WORKFLOW_ID, WS_ID } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

/** Every page, rendered with fixtures, has no serious/critical axe violations (AC-12.1). */
const signedIn: [string, string, RegExp | string][] = [
  ['dashboard', `/w/${WS_ID}`, 'Dashboard'],
  ['workflow list', `/w/${WS_ID}/workflows`, 'Workflows'],
  ['workflow editor', `/w/${WS_ID}/workflows/${WORKFLOW_ID}`, 'Triage new issues'],
  ['version view', `/w/${WS_ID}/workflows/${WORKFLOW_ID}/versions/2`, /· v2/],
  ['run list', `/w/${WS_ID}/runs`, 'Runs'],
  ['run detail', `/w/${WS_ID}/runs/${RUN_ID}`, /Triage new issues/],
  ['integrations', `/w/${WS_ID}/integrations`, 'Integrations'],
  ['settings: workspace', `/w/${WS_ID}/settings`, 'Settings'],
  ['settings: members', `/w/${WS_ID}/settings/members`, 'Settings'],
  ['settings: account', `/w/${WS_ID}/settings/account`, 'Settings'],
  ['settings: danger zone', `/w/${WS_ID}/settings/danger`, 'Settings'],
  ['not found', '/no/such/page', /doesn’t exist/],
];

describe('accessibility (Part 12, AC-12.1)', () => {
  beforeAll(() => import('@/features/workflows/pages/workflow-editor-page'), 180_000);

  it.each(signedIn)(
    '%s has no serious or critical axe violations',
    async (_name, path, heading) => {
      renderRoute(path);
      await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 30_000 });
      // Let async sections (lists, panels) render before checking.
      await new Promise((r) => setTimeout(r, 300));
      expect(await axeViolations()).toEqual([]);
    },
  );

  it.each([
    ['sign in', '/login', 'Sign in'],
    ['register', '/register', /Create/],
    ['public home', '/', /Connect your tools/],
    ['public features', '/features', /Everything you need/],
    ['public security', '/security', /Built to be trusted/],
    ['public integrations', '/integrations', /Connect the tools/],
  ])('%s has no serious or critical axe violations', async (_name, path, heading) => {
    server.use(
      http.post(`${API}/auth/refresh`, () => apiError(401, 'Invalid or expired refresh token')),
    );
    renderRoute(path);
    await screen.findByRole('heading', { level: 1, name: heading });
    expect(await axeViolations()).toEqual([]);
  });
});
