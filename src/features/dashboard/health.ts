import type { StatusCounts } from '@/types/api';

/**
 * Succeeded share of finished runs, one decimal (queued/running are not finished yet);
 * null when nothing finished, so the UI shows "—" rather than a made-up 0 % or 100 %.
 */
export function successRate(c: StatusCounts): number | null {
  const finished = c.SUCCEEDED + c.FAILED + c.CANCELLED;
  return finished ? Math.round((c.SUCCEEDED / finished) * 1000) / 10 : null;
}
