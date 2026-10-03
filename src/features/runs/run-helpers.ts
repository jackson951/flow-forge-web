import {
  Ban,
  Bug,
  CircleHelp,
  CircleSlash,
  FileWarning,
  Gauge,
  Hand,
  KeyRound,
  Lock,
  RotateCcw,
  ServerCrash,
  Timer,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import type { ErrorCategory, IntegrationProviderKey, StepRun, TriggerSource } from '@/types/api';
import type { WorkflowDefinition } from '@/features/workflows/types/workflow-definition';

/** "850 ms", "4.2 s", "3 min 5 s", "2 h 4 min". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1_000) return `${ms} ms`;
  const s = ms / 1_000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${Math.round(s % 60)} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export interface CategoryInfo {
  label: string;
  icon: LucideIcon;
  /** What the user can do about it. */
  next: string;
}

/** Error categories (backend error-categories.ts) with an icon and the next step (FR-08.8). */
export const ERROR_CATEGORIES: Record<ErrorCategory, CategoryInfo> = {
  VALIDATION: {
    label: 'Invalid data',
    icon: FileWarning,
    next: 'Check the step’s settings and the data it received, then retry.',
  },
  AUTHORIZATION: {
    label: 'Not allowed',
    icon: Lock,
    next: 'The workflow is not allowed to do this; check the workspace and connection permissions.',
  },
  PROVIDER_AUTH: {
    label: 'Connection rejected',
    icon: KeyRound,
    next: 'The provider rejected the connection’s credentials. Reconnect it, then retry.',
  },
  PROVIDER_RATE_LIMIT: {
    label: 'Rate limited',
    icon: Gauge,
    next: 'The provider asked to slow down. Retry in a few minutes.',
  },
  PROVIDER_TIMEOUT: {
    label: 'Provider timed out',
    icon: Timer,
    next: 'The provider did not answer in time. Retry; if it keeps happening, check the provider’s status.',
  },
  TRANSIENT_INFRASTRUCTURE: {
    label: 'Temporary problem',
    icon: ServerCrash,
    next: 'A temporary problem on our side. Retrying usually works.',
  },
  PERMANENT_PROVIDER_ERROR: {
    label: 'Provider refused',
    icon: Ban,
    next: 'The provider refused the request (for example a missing channel or list). Fix the step’s settings before retrying.',
  },
  UNCERTAIN_OUTCOME: {
    label: 'Outcome unknown',
    icon: CircleHelp,
    next: 'The step may already have acted. Check in the provider before retrying, or it may happen twice.',
  },
  CANCELLED: { label: 'Cancelled', icon: CircleSlash, next: 'The run was cancelled.' },
  INTERNAL: {
    label: 'Internal error',
    icon: Bug,
    next: 'An unexpected error. Retry; if it persists, report it with the run’s correlation id.',
  },
};

/** The integration a node type uses (for "Reconnect <provider>"), if any. */
export function providerOfNodeType(type: string): IntegrationProviderKey | undefined {
  const prefix = type.split('.', 1)[0];
  return prefix === 'github'
    ? 'GITHUB'
    : prefix === 'slack'
      ? 'SLACK'
      : prefix === 'microsoft'
        ? 'MICROSOFT'
        : undefined;
}

/** 409/429 bodies of the run endpoints (`details.code`, `details.nodeKeys`). */
export function errorDetails(error: unknown): {
  status?: number;
  code?: string;
  nodeKeys: string[];
} {
  const e = error as { status?: number; details?: { code?: unknown; nodeKeys?: unknown } } | null;
  const code = typeof e?.details?.code === 'string' ? e.details.code : undefined;
  const nodeKeys = Array.isArray(e?.details?.nodeKeys) ? (e.details.nodeKeys as string[]) : [];
  return { status: e?.status, code, nodeKeys };
}

/**
 * Why a step was SKIPPED (the backend does not store a reason): it is on a condition branch
 * that was not taken, or it would have run after the run stopped (failure or cancellation).
 */
export function skipReasons(
  definition: WorkflowDefinition | undefined,
  steps: StepRun[],
): Map<string, string> {
  const reasons = new Map<string, string>();
  const byKey = new Map(steps.map((s) => [s.nodeKey, s]));
  if (definition) {
    // Walk down from each finished condition into the branch it did not take.
    const children = (key: string) => definition.edges.filter((e) => e.from === key);
    const mark = (key: string, reason: string) => {
      if (reasons.has(key) || byKey.get(key)?.status !== 'SKIPPED') return;
      reasons.set(key, reason);
      children(key).forEach((e) => mark(e.to, reason));
    };
    for (const step of steps) {
      if (step.nodeType !== 'condition' || step.status !== 'SUCCEEDED') continue;
      const result = (step.output as { result?: unknown } | null)?.result;
      if (typeof result !== 'boolean') continue;
      const notTaken = result ? 'false' : 'true';
      for (const e of children(step.nodeKey)) {
        if (e.branch === notTaken) {
          mark(e.to, `Branch not taken: ${step.nodeKey} was ${String(result)}`);
        }
      }
    }
  }
  for (const step of steps) {
    if (step.status === 'SKIPPED' && !reasons.has(step.nodeKey)) {
      reasons.set(step.nodeKey, 'Not run: the run stopped before reaching this step');
    }
  }
  return reasons;
}

/** Bytes of a value as JSON (UTF-8), for the 64 KB manual input limit. */
export const jsonBytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

export const MAX_MANUAL_INPUT_BYTES = 64 * 1024;

export const TRIGGER_SOURCES: Record<TriggerSource, { label: string; icon: LucideIcon }> = {
  MANUAL: { label: 'Manual', icon: Hand },
  WEBHOOK: { label: 'Webhook', icon: Webhook },
  RETRY: { label: 'Retry', icon: RotateCcw },
};
