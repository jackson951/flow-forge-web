import type { ValidationIssue } from '@/types/api';

/** Errors block publishing; warnings do not. */
export const countErrors = (issues: ValidationIssue[]) =>
  issues.filter((i) => i.severity === 'error').length;

/** The issues list in a 422 publish response (`details` is the issue array). */
export function issuesFromError(error: unknown): ValidationIssue[] | null {
  const e = error as { status?: number; details?: unknown } | null;
  if (e?.status !== 422 || !Array.isArray(e.details)) return null;
  return e.details as ValidationIssue[];
}
