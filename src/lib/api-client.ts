import { env } from '@/config/env';
import type { ErrorResponse } from '@/types/api';
import { accessToken } from './access-token';

/**
 * Every backend error, in the backend's single envelope (AllExceptionsFilter):
 * `{ statusCode, error, message, details?, requestId, path, timestamp }`.
 * Network failures use status 0.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  /** All messages (validation errors come as a list). */
  readonly messages: string[];
  /** Machine-readable context, e.g. `{ code: 'UNCERTAIN_OUTCOME', nodeKeys: [...] }`. */
  readonly details?: unknown;
  readonly requestId?: string;
  /** From the `Retry-After` header on 429 responses. */
  readonly retryAfterSeconds?: number;

  constructor(init: {
    status: number;
    error: string;
    message: string | string[];
    details?: unknown;
    requestId?: string;
    retryAfterSeconds?: number;
  }) {
    const messages = Array.isArray(init.message) ? init.message : [init.message];
    super(messages.join(', '));
    this.name = 'ApiError';
    this.status = init.status;
    this.error = init.error;
    this.messages = messages;
    this.details = init.details;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** `details.code` when the backend sent one (e.g. `QUEUE_BACKPRESSURE`, `PAYLOADS_TRIMMED`). */
  get code(): string | undefined {
    const code = (this.details as { code?: unknown } | undefined)?.code;
    return typeof code === 'string' ? code : undefined;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
export const isNotFound = (e: unknown) => isApiError(e) && e.status === 404;
export const isConflict = (e: unknown) => isApiError(e) && e.status === 409;
export const isRateLimited = (e: unknown) => isApiError(e) && e.status === 429;
/** 400 (DTO validation) or 422 (definition validation). */
export const isValidation = (e: unknown) => isApiError(e) && (e.status === 400 || e.status === 422);

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  /** Sent as `Idempotency-Key` (manual runs, retries). */
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Query parameters; undefined values are left out. */
  query?: Record<string, string | number | boolean | undefined>;
}

const isErrorEnvelope = (body: unknown): body is ErrorResponse =>
  typeof body === 'object' &&
  body !== null &&
  typeof (body as ErrorResponse).statusCode === 'number' &&
  'message' in body;

function retryAfter(res: Response): number | undefined {
  const value = Number(res.headers.get('Retry-After'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  // Absolute against the page origin (same-origin API); also what Node's fetch needs in tests.
  const url = new URL(`${env.VITE_API_BASE_URL}${path}`, globalThis.location?.origin);
  return `${url.href}${qs ? `?${qs}` : ''}`;
}

async function toApiError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => undefined);
  if (isErrorEnvelope(body)) {
    return new ApiError({
      status: body.statusCode,
      error: body.error,
      message: body.message,
      details: body.details,
      requestId: body.requestId ?? res.headers.get('x-request-id') ?? undefined,
      retryAfterSeconds: retryAfter(res),
    });
  }
  return new ApiError({
    status: res.status,
    error: res.statusText || 'Error',
    message: res.statusText || `Request failed with status ${res.status}`,
    requestId: res.headers.get('x-request-id') ?? undefined,
    retryAfterSeconds: retryAfter(res),
  });
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = accessToken.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      // Same origin (dev proxy / nginx): sends the httpOnly refresh cookie on /auth routes.
      credentials: 'include',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError({
      status: 0,
      error: 'Network Error',
      message: 'Could not reach the FlowForge API. Check your connection and try again.',
    });
  }

  // Part 02 adds the single-flight refresh on 401 around this call.
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};
