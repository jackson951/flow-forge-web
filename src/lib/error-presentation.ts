import { isApiError } from './api-client';

/**
 * How any API error is shown (Part 12, FR-12.2), in one place:
 * network → connection problem; 400 → the field messages; 401 → session ended; 403 → not
 * allowed; 404 → not found; 409 → the backend's conflict reason; 422 → the validation
 * messages; 429 → when to try again; 5xx and anything unexpected → a generic message with the
 * request id. Never a stack trace or a JSON dump.
 */
export interface PresentedError {
  title: string;
  message: string;
  requestId?: string;
  /** Trying again may help (network, 429, 5xx). */
  retryable: boolean;
}

export function presentError(error: unknown, fallbackTitle = 'Couldn’t load this'): PresentedError {
  if (!isApiError(error)) {
    return {
      title: fallbackTitle,
      message: 'Something went wrong. Please try again.',
      retryable: true,
    };
  }
  const requestId = error.requestId;
  const joined = error.messages.join(' ');
  switch (true) {
    case error.status === 0:
      return {
        title: 'Can’t reach FlowForge',
        message: 'Check your connection; we will keep your work on this page. Then try again.',
        retryable: true,
      };
    case error.status === 400:
      return { title: 'Some details are not valid', message: joined, requestId, retryable: false };
    case error.status === 401:
      return {
        title: 'Your session has ended',
        message: 'Sign in again to continue.',
        requestId,
        retryable: false,
      };
    case error.status === 403:
      return {
        title: 'Not allowed',
        message: 'Your role in this workspace does not allow this. Ask an owner or admin.',
        requestId,
        retryable: false,
      };
    case error.status === 404:
      return {
        title: 'Not found',
        message: 'It does not exist, was deleted, or belongs to another workspace.',
        requestId,
        retryable: false,
      };
    case error.status === 409:
      return {
        title: 'This conflicts with the current state',
        message: joined,
        requestId,
        retryable: false,
      };
    case error.status === 422:
      return { title: 'This cannot be done yet', message: joined, requestId, retryable: false };
    case error.status === 429:
      return {
        title: 'Too many requests',
        message: `Please wait ${error.retryAfterSeconds ?? 60} seconds and try again.`,
        requestId,
        retryable: true,
      };
    default:
      return {
        title: fallbackTitle,
        message:
          'Something went wrong on our side. Try again; if it keeps happening, share the request id with support.',
        requestId,
        retryable: true,
      };
  }
}
