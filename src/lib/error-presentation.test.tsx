import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '@/components/feedback/error-state';
import { Toaster } from '@/components/feedback/toaster';
import { ApiError } from './api-client';
import { presentError } from './error-presentation';
import { toast, toastStore } from './toast';

const err = (
  status: number,
  message: string | string[] = 'backend says',
  extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {},
) => new ApiError({ status, error: 'E', message, requestId: 'req-1', ...extra });

describe('presentError: one mapping for every API error class (Part 12, FR-12.2, AC-12.3)', () => {
  it.each([
    [0, 'Can’t reach FlowForge', /Check your connection/, true],
    [400, 'Some details are not valid', /name must be shorter/, false],
    [401, 'Your session has ended', /Sign in again/, false],
    [403, 'Not allowed', /Ask an owner or admin/, false],
    [404, 'Not found', /belongs to another workspace/, false],
    [409, 'This conflicts with the current state', /backend says/, false],
    [422, 'This cannot be done yet', /backend says/, false],
    [429, 'Too many requests', /wait 30 seconds/, true],
    [500, 'Couldn’t load this', /share the request id/, true],
    [503, 'Couldn’t load this', /Something went wrong on our side/, true],
  ])('%s → %s', (status, title, message, retryable) => {
    const e =
      status === 400
        ? err(400, ['name must be shorter than or equal to 120 characters'])
        : status === 429
          ? err(429, 'slow down', { retryAfterSeconds: 30 })
          : err(status);
    const p = presentError(e);
    expect(p.title).toBe(title);
    expect(p.message).toMatch(message);
    expect(p.retryable).toBe(retryable);
    if (status !== 0) expect(p.requestId).toBe('req-1');
  });

  it('never shows raw details for unexpected errors', () => {
    expect(presentError(new TypeError('x is undefined at foo.js:1'))).toEqual({
      title: 'Couldn’t load this',
      message: 'Something went wrong. Please try again.',
      retryable: true,
    });
    expect(presentError(err(500, 'Internal: stack at Prisma...')).message).not.toMatch(
      /Prisma|stack/,
    );
  });
});

describe('ErrorState', () => {
  it('shows the mapped message, the request id with copy, and retry', async () => {
    const retry = vi.fn();
    render(<ErrorState error={err(500)} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on our side');
    expect(screen.getByText(/Request req-1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy request id' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('explicit title/message win over the mapping', () => {
    render(<ErrorState error={err(404)} title="Run not found" message="Removed by retention." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Run not found');
    expect(screen.getByRole('alert')).toHaveTextContent('Removed by retention.');
  });
});

describe('toasts (Part 12, FR-12.3)', () => {
  it('shows success and error toasts that can be dismissed and expire', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Toaster />);
    act(() => {
      toast.success('Workflow archived');
      toast.error('Could not save the draft');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Workflow archived');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save the draft');
    act(() => vi.advanceTimersByTime(4_100));
    expect(screen.queryByText('Workflow archived')).not.toBeInTheDocument();
    expect(screen.getByText('Could not save the draft')).toBeInTheDocument(); // errors stay longer
    vi.useRealTimers();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(toastStore.getSnapshot()).toEqual([]);
  });
});
