/**
 * API contract (Part 01). Shapes the backend documents with a schema come from the generated
 * `openapi.ts` (`npm run api:types`); the rest are written by hand from the backend service
 * that produces them (named in each section) — the backend's Swagger has no typed schema for
 * those responses yet.
 */
import type { WorkflowDefinition } from '@/features/workflows/types/workflow-definition';
import type { components } from './openapi';

type Schemas = components['schemas'];

// ── Generated ────────────────────────────────────────────────────────────────

export type ErrorResponse = Schemas['ErrorResponse'];
export type PublicUser = Schemas['UserResponseDto'];
/** Login / register. The `refreshToken` field is ignored: the httpOnly cookie is used. */
export type AuthResponse = Schemas['AuthResponseDto'];
/** Refresh returns tokens only (no user). */
export type TokenResponse = Schemas['TokenResponseDto'];
export type Workspace = Schemas['WorkspaceResponseDto'];
export type Member = Schemas['MemberResponseDto'];
export type WorkspaceRole = Workspace['role'];

export type RegisterRequest = Schemas['RegisterDto'];
export type LoginRequest = Schemas['LoginDto'];
export type CreateWorkspaceRequest = Schemas['CreateWorkspaceDto'];
export type UpdateWorkspaceRequest = Schemas['UpdateWorkspaceDto'];
export type AddMemberRequest = Schemas['AddMemberDto'];
export type UpdateMemberRoleRequest = Schemas['UpdateMemberRoleDto'];
export type CreateWorkflowRequest = Schemas['CreateWorkflowDto'];
export type UpdateWorkflowRequest = Schemas['UpdateWorkflowDto'];
/** Both flags are optional on the backend (Swagger marks them required). */
export type RetryRunRequest = Partial<Schemas['RetryRunDto']>;
export type ManualRunRequest = Schemas['ManualRunDto'];

// ── Enums (Prisma enums in flowforge-api/prisma/schema.prisma) ──────────────

export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type RunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type StepStatus = 'PENDING' | 'RUNNING' | 'RETRYING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
/** WEBHOOK covers GitHub, Jira, Gmail and generic hooks; POLL is one run per new http.poll item. */
export type TriggerSource = 'WEBHOOK' | 'MANUAL' | 'RETRY' | 'SCHEDULE' | 'POLL';
export type ConnectionStatus = 'CONNECTED' | 'NEEDS_ATTENTION' | 'DISCONNECTED';
/** `TEST` exists on the backend for tests only and is never offered in the UI. */
export type IntegrationProviderKey =
  | 'GITHUB'
  | 'SLACK'
  | 'MICROSOFT'
  | 'JIRA'
  | 'GMAIL'
  /** Credential-based connections for http.request / http.poll (backend Part 24). */
  | 'HTTP'
  /** Generic inbound webhooks: no connection, used for labels and icons only. */
  | 'WEBHOOK';
/** Why a connection needs attention (backend Part 24 onwards). */
export type ConnectionStatusReason =
  | 'TOKEN_REVOKED'
  | 'TOKEN_EXPIRED'
  | 'APP_UNINSTALLED'
  | 'PERMISSION_CHANGED'
  | 'WATCH_RENEWAL_FAILED'
  | 'AUTHENTICATION_FAILED';
/** How a provider is connected: OAuth redirect, or a credentials form (HTTP). */
export type ConnectionType = 'OAUTH' | 'CREDENTIALS';
export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTHORIZATION'
  | 'PROVIDER_AUTH'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_TIMEOUT'
  | 'TRANSIENT_INFRASTRUCTURE'
  | 'PERMANENT_PROVIDER_ERROR'
  | 'UNCERTAIN_OUTCOME'
  | 'CANCELLED'
  | 'INTERNAL';
export type NodeKind = 'TRIGGER' | 'ACTION' | 'CONDITION';

// ── Pagination ───────────────────────────────────────────────────────────────

/** Keyset page: pass `nextCursor` back as `cursor`; null means no more items. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

// ── Workflows (workflows.service.ts, publishing.service.ts) ──────────────────

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  draftRevision: number;
  createdAt: string;
  updatedAt: string;
  activeVersion: { id: string; version: number; publishedAt: string } | null;
  /** The active version's schedule trigger (backend Part 23); null without one. */
  schedule: WorkflowSchedule | null;
}

export interface WorkflowSchedule {
  active: boolean;
  timezone: string;
  description: string;
  nextRunAt: string | null;
  lastOccurrenceAt: string | null;
  lastRunId: string | null;
}

/** graph-validator.ts `IssueCode`. */
export type IssueCode =
  | 'NO_TRIGGER'
  | 'MULTIPLE_TRIGGERS'
  | 'DUPLICATE_NODE_KEY'
  | 'UNKNOWN_NODE_TYPE'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'INVALID_NODE_CONFIG'
  | 'SECRET_IN_CONFIG'
  | 'EDGE_UNKNOWN_NODE'
  | 'SELF_LOOP'
  | 'DUPLICATE_EDGE'
  | 'EDGE_INTO_TRIGGER'
  | 'BRANCH_REQUIRED'
  | 'BRANCH_NOT_ALLOWED'
  | 'DUPLICATE_BRANCH'
  | 'MULTIPLE_INCOMING'
  | 'CYCLE'
  | 'UNREACHABLE_NODE'
  | 'CONDITION_WITHOUT_BRANCH'
  | 'LIMIT_EXCEEDED'
  | 'INVALID_CONDITION'
  | 'INVALID_REFERENCE'
  | 'UNKNOWN_REFERENCE_NODE'
  | 'NON_ANCESTOR_REFERENCE'
  /** Publish only: the step's connection is missing or needs attention. */
  | 'CONNECTION_INVALID';

export interface ValidationIssue {
  code: IssueCode;
  severity: 'error' | 'warning';
  message: string;
  nodeKey?: string;
  edge?: { from: string; to: string; index: number };
  /** Path inside the node config (INVALID_NODE_CONFIG, SECRET_IN_CONFIG). */
  path?: string;
}

export interface WorkflowDetail extends WorkflowSummary {
  draftDefinition: WorkflowDefinition;
  issues: ValidationIssue[];
}

export interface DraftSaveResult {
  draftRevision: number;
  issues: ValidationIssue[];
}

export interface ValidationResult {
  issues: ValidationIssue[];
}

export interface VersionSummary {
  id: string;
  version: number;
  schemaVersion: number;
  definitionHash: string;
  publishedAt: string;
  publishedBy: { id: string; name: string } | null;
  isActive: boolean;
}

export interface VersionDetail extends VersionSummary {
  definition: WorkflowDefinition;
}

/** node-types.controller.ts — no config schema is exposed (forms are per type, Part 06). */
export interface NodeTypeInfo {
  type: string;
  kind: NodeKind;
  displayName: string;
  /** False when `unavailableReason` is set. */
  available?: boolean;
  /** Set when the server cannot run this type (e.g. no AI provider configured). */
  unavailableReason?: string;
}

// ── Runs (runs.service.ts, run-dispatcher.service.ts, error-categories.ts) ───

export interface ErrorDescription {
  category: ErrorCategory;
  message: string | null;
  retryable: boolean;
  description: string;
}

export interface RunSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  version: number;
  status: RunStatus;
  triggerSource: TriggerSource;
  attemptCount: number;
  error: ErrorDescription | null;
  retryOfRunId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface RunDetail extends RunSummary {
  workflowVersionId: string;
  /** Redacted by the backend. */
  triggerInput: unknown;
  correlationId: string | null;
  webhookDeliveryId: string | null;
  queuedAt: string;
  cancelRequestedAt: string | null;
  /** Set when retention removed the steps' stored input/output. */
  payloadsTrimmedAt: string | null;
  retriedByRunIds: string[];
  failedStep: { nodeKey: string; nodeType: string; error: ErrorDescription | null } | null;
}

export interface StepRun {
  id: string;
  nodeKey: string;
  nodeType: string;
  sequence: number;
  status: StepStatus;
  attemptCount: number;
  input: unknown;
  output: unknown;
  error: ErrorDescription | null;
  externalRef: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface RunFilters {
  workflowId?: string;
  status?: RunStatus;
  triggerSource?: TriggerSource;
  /** ISO date-times. */
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/** POST …/workflows/:id/runs (202). */
export interface DispatchedRun {
  runId: string;
  status: RunStatus;
}

/** POST …/runs/:id/retry (202). */
export interface RetriedRun extends DispatchedRun {
  retryOfRunId: string;
  reusedSteps: string[];
}

/** POST …/runs/:id/cancel. */
export interface CancelResult {
  runId: string;
  status: RunStatus;
  cancelRequested: true;
}

// ── Dashboard (dashboard.service.ts) ─────────────────────────────────────────

export type StatusCounts = Record<RunStatus, number> & { total: number };

export interface Dashboard {
  generatedAt: string;
  runs: { last24h: StatusCounts; last7d: StatusCounts };
  topFailingWorkflows: { workflowId: string; workflowName: string | null; failedRuns: number }[];
  recentFailures: {
    runId: string;
    workflowId: string;
    workflowName: string;
    error: ErrorDescription | null;
    createdAt: string;
    completedAt: string | null;
  }[];
}

// ── Integrations (integrations.service.ts and the provider clients) ──────────

export interface IntegrationProvider {
  key: IntegrationProviderKey;
  /** False when this server has no credentials for the provider. */
  configured: boolean;
  connectionType: ConnectionType;
}

/** Metadata only; secrets never leave the backend. */
export interface Connection {
  id: string;
  provider: IntegrationProviderKey;
  status: ConnectionStatus;
  /** Set with NEEDS_ATTENTION; null otherwise. */
  statusReason: ConnectionStatusReason | null;
  externalAccountId: string;
  accountLabel: string | null;
  scopes: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface ConnectStart {
  url: string;
}

export interface GitHubRepository {
  fullName: string;
  private: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

export interface TodoList {
  id: string;
  displayName: string;
  isDefault: boolean;
}

/** Query string the backend appends when it sends the browser back after OAuth. */
export interface IntegrationCallbackParams {
  provider: string;
  status: 'connected' | 'error';
  connectionId?: string;
  reason?: string;
}

// ── HTTP connections (backend Part 24: http-connections.service.ts, http-auth.ts) ─

export type HttpAuthType = 'bearer' | 'basic' | 'apiKeyHeader' | 'apiKeyQuery' | 'customHeaders';

/** Write-only secrets, sent once in a request body; never returned. */
export type HttpCredentials =
  | { authType: 'bearer'; token: string }
  | { authType: 'basic'; username: string; password: string }
  | { authType: 'apiKeyHeader'; headerName: string; value: string }
  | { authType: 'apiKeyQuery'; paramName: string; value: string }
  | { authType: 'customHeaders'; headers: Record<string, string> };

export interface CreateHttpConnectionRequest {
  name: string;
  credentials: HttpCredentials;
  baseUrl?: string;
  allowedHosts?: string[];
}

export interface UpdateHttpConnectionRequest {
  name?: string;
  /** null removes it. */
  baseUrl?: string | null;
  /** null removes the restriction (credentials may then go to any host). */
  allowedHosts?: string[] | null;
}

/** Outcome only: never the response body or headers. */
export interface ConnectionTestResult {
  ok: boolean;
  status?: number;
  category?: ErrorCategory;
  message?: string;
  durationMs?: number;
}

// ── Generic webhooks (backend Part 24: hook-admin.service.ts) ────────────────

/** `GET …/workflows/:id/webhook`. A generated `secret` arrives once (first admin read). */
export interface WebhookDetails {
  provisioned: boolean;
  active?: boolean;
  url?: string;
  path?: string;
  verificationMode?: string;
  secretHint?: string | null;
  secret?: string;
  previousSecretExpiresAt?: string | null;
  previousUrlExpiresAt?: string | null;
  listening?: boolean;
}

export type DeliveryStatus = 'RECEIVED' | 'PROCESSED' | 'IGNORED' | 'FAILED' | 'REJECTED';

export interface WebhookDelivery {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  reason: string | null;
  receivedAt: string;
  sizeBytes: number | null;
  sourceIp: string | null;
  duplicateCount: number;
  lastDuplicateAt: string | null;
  run: { id: string; status: RunStatus } | null;
}

export interface WebhookCapture {
  listening: boolean;
  /** The captured request (method, kept headers, query, body), once one arrived. */
  event: {
    method?: string;
    headers?: Record<string, string>;
    query?: unknown;
    body?: unknown;
  } | null;
}

// ── HTTP poll state (backend Part 24: workflows.service.ts pollState) ─────────

/** `GET …/workflows/:id/poll`. Seen item ids and cursors stay internal. */
export interface PollStatus {
  schedule: { active: boolean; description: string; nextRunAt: string | null } | null;
  state: {
    status: 'OK' | 'FAILING';
    seeded: boolean;
    lastPolledAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    consecutiveFailures: number;
    nextAttemptAt: string | null;
    itemsFired: number;
  } | null;
}
