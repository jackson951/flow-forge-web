import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { connections, dashboard, RUN_ID, WORKFLOW_ID, WS_ID } from '@/test/msw/fixtures';
import { API } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';
import type { StatusCounts } from '@/types/api';
import { successRate } from './health';

const WS = `${API}/workspaces/${WS_ID}`;
const URL_ = `/w/${WS_ID}`;
const zero: StatusCounts = {
  QUEUED: 0,
  RUNNING: 0,
  SUCCEEDED: 0,
  FAILED: 0,
  CANCELLED: 0,
  total: 0,
};
const empty = { items: [], nextCursor: null };

describe('dashboard (Part 09)', () => {
  it('shows run health with the success rate as a number (FR-09.1)', async () => {
    renderRoute(URL_);
    const day = await screen.findByRole('region', { name: 'Runs, last 24 hours' });
    expect(within(day).getByText('13')).toBeInTheDocument(); // total from the fixture
    expect(within(day).getByText('92.3%')).toBeInTheDocument(); // 12 of 13 finished runs
    expect(within(day).getByText('Failed').nextSibling).toHaveTextContent('1');
    const week = screen.getByRole('region', { name: 'Runs, last 7 days' });
    expect(within(week).getByText('95.2%')).toBeInTheDocument(); // 80 of 84
    expect(screen.getByText(/refreshes every 30 s/)).toBeInTheDocument();
  });

  it('links top failing workflows to the filtered run list, and failures to their run (AC-09.2)', async () => {
    renderRoute(URL_);
    const top = await screen.findByRole('region', { name: 'Top failing workflows' });
    expect(within(top).getByRole('link', { name: /4 failed runs/ })).toHaveAttribute(
      'href',
      `/w/${WS_ID}/runs?status=FAILED&workflow=${WORKFLOW_ID}`,
    );
    const recent = screen.getByRole('region', { name: 'Recent failures' });
    const link = within(recent).getByRole('link', { name: /Failed run of/ });
    expect(link).toHaveAttribute('href', `/w/${WS_ID}/runs/${RUN_ID}`);
    expect(link).toHaveTextContent('Connection rejected');
    expect(link).toHaveTextContent(dashboard.recentFailures[0].error!.description);
  });

  it('a calm workspace says so instead of showing empty lists', async () => {
    server.use(
      http.get(`${WS}/dashboard`, () =>
        HttpResponse.json({
          ...dashboard,
          runs: { last24h: zero, last7d: { ...zero, SUCCEEDED: 3, total: 3 } },
          topFailingWorkflows: [],
          recentFailures: [],
        }),
      ),
    );
    renderRoute(URL_);
    expect(await screen.findByText('No failed runs in the last 7 days.')).toBeInTheDocument();
    expect(screen.getByText('No failed runs.')).toBeInTheDocument();
    const day = screen.getByRole('region', { name: 'Runs, last 24 hours' });
    expect(within(day).getByText('—')).toBeInTheDocument(); // nothing finished: no invented rate
    expect(
      within(screen.getByRole('region', { name: 'Runs, last 7 days' })).getByText('100%'),
    ).toBeInTheDocument();
  });

  it('lists connections that need attention with a Reconnect link (FR-09.4)', async () => {
    server.use(
      http.get(`${WS}/integrations`, () =>
        HttpResponse.json([{ ...connections[0], status: 'NEEDS_ATTENTION' }]),
      ),
    );
    renderRoute(URL_);
    const section = await screen.findByRole('region', { name: 'Connections needing attention' });
    expect(within(section).getByText('Acme Slack')).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Reconnect' })).toHaveAttribute(
      'href',
      `/w/${WS_ID}/integrations`,
    );
  });

  it('a new workspace gets the onboarding checklist, ticked from real data (FR-09.5, AC-09.3)', async () => {
    server.use(
      http.get(`${WS}/integrations`, () => HttpResponse.json([])),
      http.get(`${WS}/workflows`, () => HttpResponse.json(empty)),
      http.get(`${WS}/runs`, () => HttpResponse.json(empty)),
      http.get(`${WS}/dashboard`, () =>
        HttpResponse.json({
          ...dashboard,
          runs: { last24h: zero, last7d: zero },
          topFailingWorkflows: [],
          recentFailures: [],
        }),
      ),
    );
    renderRoute(URL_);
    const checklist = await screen.findByRole('region', { name: 'Getting started' });
    expect(within(checklist).getByText('0 of 4 done')).toBeInTheDocument();
    expect(within(checklist).getByRole('link', { name: /Open integrations/ })).toHaveAttribute(
      'href',
      `/w/${WS_ID}/integrations`,
    );
    expect(within(checklist).getAllByLabelText('To do')).toHaveLength(4);
  });

  it('ticks steps as they are done: a workflow exists but nothing is published yet', async () => {
    server.use(
      http.get(`${WS}/workflows`, ({ request }) =>
        new URL(request.url).searchParams.get('status') === 'PUBLISHED'
          ? HttpResponse.json(empty)
          : HttpResponse.json({ items: [{ id: WORKFLOW_ID }], nextCursor: null }),
      ),
      http.get(`${WS}/runs`, () => HttpResponse.json(empty)),
    );
    renderRoute(URL_);
    const checklist = await screen.findByRole('region', { name: 'Getting started' });
    expect(within(checklist).getByText('2 of 4 done')).toBeInTheDocument(); // connected + workflow
    expect(within(checklist).getByRole('link', { name: /Open a workflow/ })).toBeInTheDocument();
  });

  it('hides the checklist once everything is done', async () => {
    renderRoute(URL_);
    await screen.findByRole('region', { name: 'Runs, last 24 hours' });
    await screen.findByRole('region', { name: 'Top failing workflows' });
    expect(screen.queryByRole('region', { name: 'Getting started' })).not.toBeInTheDocument();
  });
});

describe('successRate', () => {
  it('is the succeeded share of finished runs, or null when none finished', () => {
    expect(successRate(zero)).toBeNull();
    expect(successRate({ ...zero, RUNNING: 5, total: 5 })).toBeNull();
    expect(successRate({ ...zero, SUCCEEDED: 2, FAILED: 1, total: 3 })).toBe(66.7);
    expect(successRate({ ...zero, SUCCEEDED: 1, CANCELLED: 1, QUEUED: 4, total: 6 })).toBe(50);
  });
});
