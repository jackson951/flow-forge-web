/**
 * MSW handlers for every endpoint the app calls (Part 01, FR-01.9). Tests override single
 * endpoints with `server.use(...)`; anything unhandled fails the test (see setup.ts).
 */
import { http, HttpResponse, type JsonBodyType, type PathParams } from 'msw';
import type { ErrorResponse } from '@/types/api';
import * as f from './fixtures';

/** Same origin as the app; matches `/api/v1` on any host. */
export const API = '*/api/v1';

/** A response in the backend's error envelope. */
export function apiError(
  statusCode: number,
  message: string | string[],
  extra: { details?: unknown; headers?: Record<string, string>; error?: string } = {},
) {
  const body: ErrorResponse = {
    statusCode,
    error: extra.error ?? 'Error',
    message,
    details: extra.details,
    requestId: 'req-test-0001',
    path: '/api/v1/test',
    timestamp: '2026-10-03T08:00:00.000Z',
  };
  return HttpResponse.json(body, { status: statusCode, headers: extra.headers });
}

const page = <T>(items: T[]) => ({ items, nextCursor: null });
const noContent = () => new HttpResponse(null, { status: 204 });

/** Tenant routes answer only for workspaces in the fixtures, like the backend's 404. */
const known = (params: PathParams) => f.workspaces.some((w) => w.id === params.workspaceId);
const notFound = () => apiError(404, 'Workspace not found', { error: 'Not Found' });
const scoped =
  (body: () => JsonBodyType, status = 200) =>
  ({ params }: { params: PathParams }) =>
    known(params) ? HttpResponse.json(body(), { status }) : notFound();

const WS = `${API}/workspaces/:workspaceId`;
const WF = `${WS}/workflows/:workflowId`;

export const handlers = [
  http.get(`${API}/health/ready`, () =>
    HttpResponse.json({
      status: 'ok',
      checks: { database: { status: 'up' }, redis: { status: 'up' } },
    }),
  ),

  // Auth
  http.post(`${API}/auth/register`, () => HttpResponse.json(f.authResponse, { status: 201 })),
  http.post(`${API}/auth/login`, () => HttpResponse.json(f.authResponse)),
  http.post(`${API}/auth/refresh`, () =>
    HttpResponse.json({ accessToken: 'refreshed-token', refreshToken: 'ignored', expiresIn: 900 }),
  ),
  http.post(`${API}/auth/logout`, noContent),
  http.post(`${API}/auth/logout-all`, noContent),
  http.get(`${API}/auth/me`, () => HttpResponse.json(f.user)),

  // Workspaces and members
  http.get(`${API}/workspaces`, () => HttpResponse.json(f.workspaces)),
  http.post(`${API}/workspaces`, () => HttpResponse.json(f.workspaces[0], { status: 201 })),
  http.get(WS, ({ params }) =>
    known(params)
      ? HttpResponse.json(f.workspaces.find((w) => w.id === params.workspaceId))
      : notFound(),
  ),
  http.patch(
    WS,
    scoped(() => f.workspaces[0]),
  ),
  http.delete(WS, noContent),
  http.get(
    `${WS}/members`,
    scoped(() => f.members),
  ),
  http.post(
    `${WS}/members`,
    scoped(() => f.members[0], 201),
  ),
  http.patch(
    `${WS}/members/:userId`,
    scoped(() => f.members[0]),
  ),
  http.delete(`${WS}/members/:userId`, noContent),

  // Workflows, versions, node types
  http.get(`${API}/node-types`, () => HttpResponse.json(f.nodeTypes)),
  http.get(
    `${WS}/workflows`,
    scoped(() => page([f.workflowSummary])),
  ),
  http.post(
    `${WS}/workflows`,
    scoped(() => ({ ...f.workflowDetail, status: 'DRAFT', activeVersion: null }), 201),
  ),
  http.get(
    WF,
    scoped(() => f.workflowDetail),
  ),
  http.patch(
    WF,
    scoped(() => f.workflowSummary),
  ),
  http.delete(WF, noContent),
  http.put(
    `${WF}/draft`,
    scoped(() => ({ draftRevision: f.workflowSummary.draftRevision + 1, issues: [] })),
  ),
  http.post(
    `${WF}/validate`,
    scoped(() => ({ issues: [] })),
  ),
  http.post(
    `${WF}/publish`,
    scoped(() => ({ ...f.version, version: 3 }), 201),
  ),
  http.get(
    `${WF}/versions`,
    scoped(() => page([f.version])),
  ),
  http.get(
    `${WF}/versions/:version`,
    scoped(() => ({ ...f.version, definition: f.workflowDetail.draftDefinition })),
  ),
  http.post(
    `${WF}/duplicate`,
    scoped(() => ({ ...f.workflowDetail, id: 'b0000000-0000-4000-8000-000000000001' }), 201),
  ),
  http.post(
    `${WF}/archive`,
    scoped(() => ({ ...f.workflowSummary, status: 'ARCHIVED' })),
  ),
  http.post(
    `${WF}/unarchive`,
    scoped(() => f.workflowSummary),
  ),

  // Runs
  http.post(
    `${WF}/runs`,
    scoped(() => ({ runId: f.RUN_ID, status: 'QUEUED' }), 202),
  ),
  http.get(
    `${WS}/runs`,
    scoped(() => page([f.runSummary])),
  ),
  http.get(
    `${WS}/runs/:runId`,
    scoped(() => f.runDetail),
  ),
  http.get(
    `${WS}/runs/:runId/steps`,
    scoped(() => f.steps),
  ),
  http.post(
    `${WS}/runs/:runId/retry`,
    scoped(
      () => ({
        runId: 'c2000000-0000-4000-8000-000000000002',
        status: 'QUEUED',
        retryOfRunId: f.RUN_ID,
        reusedSteps: [],
      }),
      202,
    ),
  ),
  http.post(
    `${WS}/runs/:runId/cancel`,
    scoped(() => ({ runId: f.RUN_ID, status: 'CANCELLED', cancelRequested: true })),
  ),

  // Dashboard
  http.get(
    `${WS}/dashboard`,
    scoped(() => f.dashboard),
  ),

  // Integrations
  http.get(`${API}/integrations/providers`, () => HttpResponse.json(f.providers)),
  http.get(
    `${WS}/integrations`,
    scoped(() => f.connections),
  ),
  http.post(
    `${WS}/integrations/:provider/connect`,
    scoped(() => ({ url: 'https://slack.com/oauth/v2/authorize?state=test' }), 201),
  ),
  http.delete(`${WS}/integrations/:connectionId`, noContent),
  http.get(
    `${WS}/integrations/:connectionId/github/repositories`,
    scoped(() => [{ fullName: 'acme/api', private: true }]),
  ),
  http.get(
    `${WS}/integrations/:connectionId/slack/channels`,
    scoped(() => page([{ id: 'C0123456789', name: 'support', isPrivate: false }])),
  ),
  http.get(
    `${WS}/integrations/:connectionId/microsoft/todo-lists`,
    scoped(() => [{ id: 'AQMkADAwATM0MDAAMS1', displayName: 'Tasks', isDefault: true }]),
  ),
  // HTTP connections (Part 18): echo a connection; the test endpoint answers OK.
  http.post(
    `${WS}/integrations/http`,
    scoped(() => ({ ...f.connections[0], provider: 'HTTP' }), 201),
  ),
  http.post(
    `${WS}/integrations/:connectionId/test`,
    scoped(() => ({ ok: true, status: 200, durationMs: 42 })),
  ),
  http.patch(
    `${WS}/integrations/:connectionId`,
    scoped(() => ({ ...f.connections[0], provider: 'HTTP' })),
  ),
  http.put(
    `${WS}/integrations/:connectionId/credentials`,
    scoped(() => ({ ...f.connections[0], provider: 'HTTP' })),
  ),
];
