import { act, renderHook } from '@testing-library/react';
import { ApiError } from '@/lib/api-client';
import { useRetryCountdown } from './use-retry-countdown';

const limited = (seconds?: number) =>
  new ApiError({
    status: 429,
    error: 'Too Many Requests',
    message: 'slow down',
    retryAfterSeconds: seconds,
  });

describe('useRetryCountdown', () => {
  afterEach(() => vi.useRealTimers());

  it('counts down from Retry-After to 0', () => {
    vi.useFakeTimers();
    const { result } = renderHook(({ e }) => useRetryCountdown(e), {
      initialProps: { e: limited(3) as unknown },
    });
    expect(result.current).toBe(3);
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe(2);
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current).toBe(0);
  });

  it('is 0 for other errors and restarts for a new 429', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ e }) => useRetryCountdown(e), {
      initialProps: {
        e: new ApiError({ status: 401, error: 'Unauthorized', message: 'no' }) as unknown,
      },
    });
    expect(result.current).toBe(0);
    rerender({ e: limited(5) });
    expect(result.current).toBe(5);
    act(() => vi.advanceTimersByTime(2_000));
    rerender({ e: limited(5) });
    expect(result.current).toBe(5);
  });

  it('defaults to 60 s when Retry-After is missing', () => {
    const { result } = renderHook(() => useRetryCountdown(limited()));
    expect(result.current).toBe(60);
  });
});
