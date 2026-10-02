/**
 * Typed fixtures in the backend's response shapes (Part 01, FR-01.9). Typing them against
 * `@/types/api` means a contract change breaks the build here first.
 */
import type {
  AuthResponse,
  Connection,
  Dashboard,
  IntegrationProvider,
  Member,
  NodeTypeInfo,
  PublicUser,
  RunDetail,
  RunSummary,
  StepRun,
  VersionSummary,
  WorkflowDetail,
  WorkflowSummary,
  Workspace,
} from '@/types/api';

export const WS_ID = '0b5f4c1e-7d55-4a3c-9d36-1f0c3a8e2a10';
export const OTHER_WS_ID = '6f1d2b3a-9e8c-4d7b-a6f5-0e4d3c2b1a09';
export const WORKFLOW_ID = 'a3e1c2d4-5b6f-4a7e-8c9d-0e1f2a3b4c5d';
export const RUN_ID = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';
export const CONNECTION_ID = 'd4c3b2a1-f6e5-4d7c-9b8a-7f6e5d4c3b2a';
const T = '2026-10-03T08:00:00.000Z';

export const user: PublicUser = {
  id: 'f0e1d2c3-b4a5-4968-8776-655443322110',
  email: 'ada@example.test',
  name: 'Ada Lovelace',
  createdAt: T,
};

export const authResponse: AuthResponse = {
  accessToken: 'test-access-token',
  refreshToken: 'ignored-by-the-app',
  expiresIn: 900,
  user,
};

export const workspaces: Workspace[] = [
  { id: WS_ID, name: 'Acme', role: 'OWNER', createdAt: T, updatedAt: T },
  { id: OTHER_WS_ID, name: 'Side project', role: 'MEMBER', createdAt: T, updatedAt: T },
];

export const members: Member[] = [
  { userId: user.id, email: user.email, name: user.name, role: 'OWNER', joinedAt: T },
];

export const workflowSummary: WorkflowSummary = {
  id: WORKFLOW_ID,
  name: 'Triage new issues',
  description: 'Classify GitHub issues and alert Slack on high priority',
  status: 'PUBLISHED',
  draftRevision: 3,
  createdAt: T,
  updatedAt: T,
  activeVersion: { id: '11111111-2222-4333-8444-555555555555', version: 2, publishedAt: T },
};

export const workflowDetail: WorkflowDetail = {
  ...workflowSummary,
  draftDefinition: {
    schemaVersion: 1,
    nodes: [
      {
        key: 'trigger',
        kind: 'TRIGGER',
        type: 'manual.trigger',
        config: {},
        position: { x: 0, y: 0 },
      },
      {
        key: 'log',
        kind: 'ACTION',
        type: 'util.log',
        config: { message: 'Hello {{trigger.name}}' },
        position: { x: 0, y: 160 },
      },
    ],
    edges: [{ from: 'trigger', to: 'log' }],
  },
  issues: [],
};

export const version: VersionSummary = {
  id: '11111111-2222-4333-8444-555555555555',
  version: 2,
  schemaVersion: 1,
  definitionHash: 'b'.repeat(64),
  publishedAt: T,
  publishedBy: { id: user.id, name: user.name },
  isActive: true,
};

export const nodeTypes: NodeTypeInfo[] = [
  { type: 'manual.trigger', kind: 'TRIGGER', displayName: 'Manual trigger' },
  { type: 'condition', kind: 'CONDITION', displayName: 'Condition' },
  { type: 'util.log', kind: 'ACTION', displayName: 'Log a message' },
  {
    type: 'ai.summarize',
    kind: 'ACTION',
    displayName: 'AI: summarize text',
    unavailableReason: 'No AI provider is configured on this server (AI_PROVIDER)',
  },
];

export const runSummary: RunSummary = {
  id: RUN_ID,
  workflowId: WORKFLOW_ID,
  workflowName: workflowSummary.name,
  version: 2,
  status: 'SUCCEEDED',
  triggerSource: 'MANUAL',
  attemptCount: 1,
  error: null,
  retryOfRunId: null,
  createdAt: T,
  startedAt: T,
  completedAt: '2026-10-03T08:00:00.181Z',
  durationMs: 181,
};

export const runDetail: RunDetail = {
  ...runSummary,
  workflowVersionId: version.id,
  triggerInput: { name: 'Ada' },
  correlationId: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
  webhookDeliveryId: null,
  queuedAt: T,
  cancelRequestedAt: null,
  payloadsTrimmedAt: null,
  retriedByRunIds: [],
  failedStep: null,
};

export const steps: StepRun[] = [
  {
    id: 'e1e1e1e1-0000-4000-8000-000000000001',
    nodeKey: 'trigger',
    nodeType: 'manual.trigger',
    sequence: 1,
    status: 'SUCCEEDED',
    attemptCount: 1,
    input: {},
    output: { name: 'Ada' },
    error: null,
    externalRef: null,
    startedAt: T,
    completedAt: T,
    durationMs: 2,
  },
  {
    id: 'e1e1e1e1-0000-4000-8000-000000000002',
    nodeKey: 'log',
    nodeType: 'util.log',
    sequence: 2,
    status: 'SUCCEEDED',
    attemptCount: 1,
    input: { message: 'Hello Ada' },
    output: { message: 'Hello Ada' },
    error: null,
    externalRef: null,
    startedAt: T,
    completedAt: T,
    durationMs: 5,
  },
];

const counts = (succeeded: number, failed: number) => ({
  QUEUED: 0,
  RUNNING: 0,
  SUCCEEDED: succeeded,
  FAILED: failed,
  CANCELLED: 0,
  total: succeeded + failed,
});

export const dashboard: Dashboard = {
  generatedAt: T,
  runs: { last24h: counts(12, 1), last7d: counts(80, 4) },
  topFailingWorkflows: [
    { workflowId: WORKFLOW_ID, workflowName: workflowSummary.name, failedRuns: 4 },
  ],
  recentFailures: [
    {
      runId: RUN_ID,
      workflowId: WORKFLOW_ID,
      workflowName: workflowSummary.name,
      error: {
        category: 'PROVIDER_AUTH',
        message: 'token_revoked',
        retryable: false,
        description: 'The provider rejected the credentials; reconnect the integration',
      },
      createdAt: T,
      completedAt: T,
    },
  ],
};

export const providers: IntegrationProvider[] = [
  { key: 'GITHUB', configured: true },
  { key: 'SLACK', configured: true },
  { key: 'MICROSOFT', configured: false },
];

export const connections: Connection[] = [
  {
    id: CONNECTION_ID,
    provider: 'SLACK',
    status: 'CONNECTED',
    externalAccountId: 'T0123456789',
    accountLabel: 'Acme Slack',
    scopes: ['chat:write', 'channels:read'],
    metadata: null,
    createdAt: T,
    updatedAt: T,
    lastUsedAt: null,
  },
];
