import { env } from '@/config/env';

/** Mirrors the backend's sanitized error body. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;

  constructor(body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join(', ') : body.message);
    this.status = body.statusCode;
    this.requestId = body.requestId;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({
      statusCode: res.status,
      message: res.statusText,
    }))) as ApiErrorBody;
    throw new ApiError(errorBody);
  }

  // TODO: on 401, attempt a single token refresh then retry
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
