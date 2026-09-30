/** Shared contract types — mirror the backend Prisma enums and DTOs. */

export type RunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type StepStatus = 'PENDING' | 'RUNNING' | 'RETRYING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type IntegrationProviderKey = 'GITHUB' | 'MICROSOFT' | 'SLACK';
export type ConnectionStatus = 'CONNECTED' | 'NEEDS_ATTENTION' | 'DISCONNECTED';

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface User {
  userId: string;
  email: string;
  workspaceId: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  updatedAt: string;
  lastRunAt: string | null;
}

export interface RunSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  queuedAt: string;
  finishedAt: string | null;
}

export interface StepRun {
  id: string;
  nodeKey: string;
  sequence: number;
  status: StepStatus;
  attempt: number;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface RunDetail extends RunSummary {
  steps: StepRun[];
  errorMessage: string | null;
}

export interface IntegrationConnection {
  id: string;
  provider: IntegrationProviderKey;
  status: ConnectionStatus;
  scopes: string[];
}

export interface DashboardSummary {
  workflowCount: number;
  activeWorkflowCount: number;
  runsSucceeded: number;
  runsFailed: number;
  recentRuns: RunSummary[];
  recentFailures: RunSummary[];
}
