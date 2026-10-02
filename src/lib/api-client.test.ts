import { http, HttpResponse } from 'msw';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { accessToken } from './access-token';
import { api, ApiError, isConflict, isNotFound, isRateLimited, isValidation } from './api-client';

/** Records the requests the client sent; a fresh response per request (bodies are single-use). */
function capture(
  method: 'get' | 'post',
  path: string,
  response: () => Response = () => HttpResponse.json({ ok: true }),
) {
  const seen: Request[] = [];
  server.use(
    http[method](`${API}${path}`, ({ request }) => {
      seen.push(request.clone());
      return response();
    }),
  );
  return seen;
}

describe('api client (Part 01)', () => {
  it('calls /api/v1 on the page origin with JSON and credentials', async () => {
    const seen = capture('post', '/echo');
    await expect(api.post('/echo', { a: 1 })).resolves.toEqual({ ok: true });

    const req = seen[0];
    expect(new URL(req.url).pathname).toBe('/api/v1/echo');
    expect(new URL(req.url).origin).toBe(window.location.origin);
    expect(req.credentials).toBe('include');
    expect(req.headers.get('content-type')).toBe('application/json');
    expect(await req.json()).toEqual({ a: 1 });
  });

  it('sends the in-memory access token as a bearer token, and none without one', async () => {
    const seen = capture('get', '/me-check');
    await api.get('/me-check');
    expect(seen[0].headers.get('authorization')).toBeNull();

    accessToken.set('abc.def.ghi');
    await api.get('/me-check');
    expect(seen[1].headers.get('authorization')).toBe('Bearer abc.def.ghi');
  });

  it('forwards an Idempotency-Key and drops undefined query values', async () => {
    const seen = capture('post', '/runs-check');
    await api.post(
      '/runs-check',
      {},
      { idempotencyKey: 'key-1', query: { a: 'x', b: undefined, n: 2 } },
    );
    expect(seen[0].headers.get('idempotency-key')).toBe('key-1');
    expect(new URL(seen[0].url).search).toBe('?a=x&n=2');
  });

  it('returns undefined for 204 responses', async () => {
    capture('post', '/nothing', () => new HttpResponse(null, { status: 204 }));
    await expect(api.post('/nothing')).resolves.toBeUndefined();
  });

  it('parses the backend error envelope, including details and Retry-After', async () => {
    server.use(
      http.post(`${API}/busy`, () =>
        apiError(429, 'Too many runs are waiting', {
          error: 'Too Many Requests',
          details: { code: 'QUEUE_BACKPRESSURE', retryAfterSeconds: 30 },
          headers: { 'Retry-After': '30' },
        }),
      ),
    );
    const err = await api.post('/busy').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 429,
      error: 'Too Many Requests',
      message: 'Too many runs are waiting',
      requestId: 'req-test-0001',
      retryAfterSeconds: 30,
      code: 'QUEUE_BACKPRESSURE',
    });
    expect(isRateLimited(err)).toBe(true);
  });

  it('keeps every validation message', async () => {
    server.use(
      http.post(`${API}/invalid`, () =>
        apiError(400, ['email must be an email', 'password is too short']),
      ),
    );
    const err = (await api.post('/invalid').catch((e: unknown) => e)) as ApiError;
    expect(err.messages).toEqual(['email must be an email', 'password is too short']);
    expect(isValidation(err)).toBe(true);
  });

  it('classifies 404 and 409', async () => {
    server.use(
      http.get(`${API}/missing`, () => apiError(404, 'Workflow not found')),
      http.get(`${API}/stale`, () => apiError(409, 'Draft changed')),
    );
    expect(isNotFound(await api.get('/missing').catch((e: unknown) => e))).toBe(true);
    expect(isConflict(await api.get('/stale').catch((e: unknown) => e))).toBe(true);
  });

  it('handles non-JSON error bodies (e.g. a proxy error page)', async () => {
    server.use(
      http.get(
        `${API}/gateway`,
        () =>
          new HttpResponse('<html>Bad Gateway</html>', {
            status: 502,
            statusText: 'Bad Gateway',
            headers: { 'x-request-id': 'from-header' },
          }),
      ),
    );
    const err = (await api.get('/gateway').catch((e: unknown) => e)) as ApiError;
    expect(err).toMatchObject({ status: 502, error: 'Bad Gateway', requestId: 'from-header' });
  });

  it('turns network failures into status 0 errors', async () => {
    server.use(http.get(`${API}/offline`, () => HttpResponse.error()));
    const err = (await api.get('/offline').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
  });

  it('lets aborts through as aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    capture('get', '/slow');
    await expect(api.get('/slow', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
