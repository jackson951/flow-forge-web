import { authApi } from '@/features/auth/api/auth.api';
import { dashboardApi } from '@/features/dashboard/api/dashboard.api';
import { integrationsApi } from '@/features/integrations/api/integrations.api';
import { runsApi } from '@/features/runs/api/runs.api';
import { workflowsApi } from '@/features/workflows/api/workflows.api';
import { EMPTY_DEFINITION } from '@/features/workflows/types/workflow-definition';
import { workspacesApi } from '@/features/workspaces/api/workspaces.api';
import { isNotFound } from '@/lib/api-client';
import { CONNECTION_ID, OTHER_WS_ID, RUN_ID, user, WORKFLOW_ID, WS_ID } from './fixtures';

/**
 * Part 01, AC-01.5: every API function the app has is served by MSW (setup.ts fails the test
 * on an unhandled request), so the whole UI can be developed and tested without a backend.
 * The list must name every function of every feature API module — the last test checks that.
 */
const calls: Record<string, Record<string, () => Promise<unknown>>> = {
  authApi: {
    me: () => authApi.me(),
    login: () => authApi.login({ email: user.email, password: 'x' }),
    register: () => authApi.register({ name: 'A', email: user.email, password: 'x'.repeat(12) }),
    refresh: () => authApi.refresh(),
    logout: () => authApi.logout(),
    logoutAll: () => authApi.logoutAll(),
  },
  workspacesApi: {
    list: () => workspacesApi.list(),
    get: () => workspacesApi.get(WS_ID),
    create: () => workspacesApi.create({ name: 'New' }),
    rename: () => workspacesApi.rename(WS_ID, { name: 'Renamed' }),
    remove: () => workspacesApi.remove(WS_ID),
    members: () => workspacesApi.members(WS_ID),
    addMember: () => workspacesApi.addMember(WS_ID, { email: 'b@example.test', role: 'MEMBER' }),
    changeRole: () => workspacesApi.changeRole(WS_ID, user.id, { role: 'ADMIN' }),
    removeMember: () => workspacesApi.removeMember(WS_ID, user.id),
  },
  workflowsApi: {
    list: () => workflowsApi.list(WS_ID, { status: 'PUBLISHED', limit: 20 }),
    get: () => workflowsApi.get(WS_ID, WORKFLOW_ID),
    create: () => workflowsApi.create(WS_ID, { name: 'New' }),
    update: () => workflowsApi.update(WS_ID, WORKFLOW_ID, { name: 'Renamed' }),
    remove: () => workflowsApi.remove(WS_ID, WORKFLOW_ID),
    saveDraft: () => workflowsApi.saveDraft(WS_ID, WORKFLOW_ID, 3, EMPTY_DEFINITION),
    validate: () => workflowsApi.validate(WS_ID, WORKFLOW_ID),
    publish: () => workflowsApi.publish(WS_ID, WORKFLOW_ID, 4),
    versions: () => workflowsApi.versions(WS_ID, WORKFLOW_ID),
    version: () => workflowsApi.version(WS_ID, WORKFLOW_ID, 2),
    duplicate: () => workflowsApi.duplicate(WS_ID, WORKFLOW_ID),
    archive: () => workflowsApi.archive(WS_ID, WORKFLOW_ID),
    unarchive: () => workflowsApi.unarchive(WS_ID, WORKFLOW_ID),
    nodeTypes: () => workflowsApi.nodeTypes(),
  },
  runsApi: {
    list: () => runsApi.list(WS_ID, { status: 'FAILED' }),
    get: () => runsApi.get(WS_ID, RUN_ID),
    steps: () => runsApi.steps(WS_ID, RUN_ID),
    start: () => runsApi.start(WS_ID, WORKFLOW_ID, { input: {} }, 'key-1'),
    retry: () => runsApi.retry(WS_ID, RUN_ID, { resumeFromFailedStep: true }),
    cancel: () => runsApi.cancel(WS_ID, RUN_ID),
  },
  dashboardApi: {
    summary: () => dashboardApi.summary(WS_ID),
  },
  integrationsApi: {
    providers: () => integrationsApi.providers(),
    connections: () => integrationsApi.connections(WS_ID),
    connect: () => integrationsApi.connect(WS_ID, 'SLACK'),
    disconnect: () => integrationsApi.disconnect(WS_ID, CONNECTION_ID),
    repositories: () => integrationsApi.repositories(WS_ID, CONNECTION_ID),
    slackChannels: () => integrationsApi.slackChannels(WS_ID, CONNECTION_ID),
    todoLists: () => integrationsApi.todoLists(WS_ID, CONNECTION_ID),
    createHttp: () =>
      integrationsApi.createHttp(WS_ID, {
        name: 'API',
        credentials: { authType: 'bearer', token: 'x' },
      }),
    testHttp: () => integrationsApi.testHttp(WS_ID, CONNECTION_ID, { url: 'https://a.example' }),
    updateHttp: () => integrationsApi.updateHttp(WS_ID, CONNECTION_ID, { name: 'API 2' }),
    rotateHttp: () =>
      integrationsApi.rotateHttp(WS_ID, CONNECTION_ID, { authType: 'bearer', token: 'y' }),
  },
};

const modules = { authApi, workspacesApi, workflowsApi, runsApi, dashboardApi, integrationsApi };

describe('MSW serves every API function (Part 01, AC-01.5)', () => {
  for (const [module, fns] of Object.entries(calls)) {
    for (const [name, call] of Object.entries(fns)) {
      it(`${module}.${name}`, async () => {
        await expect(call()).resolves.not.toThrow();
      });
    }
  }

  it('the list above covers every function of every API module', () => {
    for (const [module, impl] of Object.entries(modules)) {
      expect(Object.keys(calls[module]).sort()).toEqual(Object.keys(impl).sort());
    }
  });

  it('answers 404 for a workspace the user cannot see, like the backend', async () => {
    const unknown = '00000000-0000-4000-8000-000000000000';
    expect(isNotFound(await runsApi.list(unknown).catch((e: unknown) => e))).toBe(true);
    await expect(runsApi.list(OTHER_WS_ID)).resolves.toBeDefined();
  });
});
