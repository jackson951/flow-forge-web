import { useEffect, useState } from 'react';
import { isRateLimited } from '@/lib/api-client';

/**
 * Seconds left before a rate-limited form may be submitted again, from the error's
 * `Retry-After` (429). 0 when not limited. A new error starts a new countdown.
 */
export function useRetryCountdown(error: unknown): number {
  const seconds = isRateLimited(error) ? (error.retryAfterSeconds ?? 60) : 0;
  const [tick, setTick] = useState<{ error: unknown; elapsed: number }>({ error, elapsed: 0 });
  // Elapsed time only counts for the error it was measured for.
  const elapsed = tick.error === error ? tick.elapsed : 0;

  useEffect(() => {
    if (!seconds) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const next = Math.floor((Date.now() - started) / 1000);
      setTick({ error, elapsed: next });
      if (next >= seconds) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [error, seconds]);

  return Math.max(0, seconds - elapsed);
}
