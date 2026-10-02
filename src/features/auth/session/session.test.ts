import { http, HttpResponse } from 'msw';
import { accessToken } from '@/lib/access-token';
import { api, ApiError } from '@/lib/api-client';
import { authResponse, user } from '@/test/msw/fixtures';
import { API, apiError } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { refresh, session } from './session';

/** /probe answers only to the refreshed token, like an API call made with an expired token. */
function probeAndRefresh(
  refreshResponse: () => Response = () =>
    HttpResponse.json({ accessToken: 'refreshed-token', refreshToken: 'x', expiresIn: 900 }),
) {
  const counts = { refresh: 0, probe: 0 };
  server.use(
    http.post(`${API}/auth/refresh`, () => {
      counts.refresh++;
      return refreshResponse();
    }),
    http.get(`${API}/probe`, ({ request }) => {
      counts.probe++;
      return request.headers.get('authorization') === 'Bearer refreshed-token'
        ? HttpResponse.json({ ok: true })
        : apiError(401, 'Invalid or missing access token');
    }),
  );
  return counts;
}

describe('session (Part 02)', () => {
  afterEach(() => vi.useRealTimers());

  it('five concurrent 401s cause exactly one refresh, then all requests succeed (AC-02.3)', async () => {
    session.start({ ...authResponse, accessToken: 'expired-token' });
    const counts = probeAndRefresh();

    const results = await Promise.all(Array.from({ length: 5 }, () => api.get('/probe')));

    expect(results).toEqual(Array(5).fill({ ok: true }));
    expect(counts.refresh).toBe(1);
    expect(counts.probe).toBe(10); // 5 rejected + 5 retried
    expect(accessToken.get()).toBe('refreshed-token');
    expect(session.getState().status).toBe('authenticated');
  });

  it('a failed refresh ends the session once — no loop, no retry storm (AC-02.4)', async () => {
    session.start({ ...authResponse, accessToken: 'expired-token' });
    const counts = probeAndRefresh(() => apiError(401, 'Invalid or expired refresh token'));
    const ended: string[] = [];
    session.onEnd((reason) => ended.push(reason));

    const errors = await Promise.all(
      Array.from({ length: 3 }, () => api.get('/probe').catch((e: unknown) => e)),
    );

    expect(errors.every((e) => e instanceof ApiError && e.status === 401)).toBe(true);
    expect(counts.refresh).toBe(1);
    expect(session.getState()).toMatchObject({
      status: 'anonymous',
      user: null,
      endReason: 'expired',
    });
    expect(accessToken.get()).toBeNull();
    expect(ended).toEqual(['expired']);
  });

  it('a 401 even after a successful refresh ends the session', async () => {
    session.start({ ...authResponse, accessToken: 'expired-token' });
    server.use(
      http.post(`${API}/auth/refresh`, () =>
        HttpResponse.json({ accessToken: 'still-bad', refreshToken: 'x', expiresIn: 900 }),
      ),
      http.get(`${API}/probe`, () => apiError(401, 'Invalid or missing access token')),
    );
    await expect(api.get('/probe')).rejects.toMatchObject({ status: 401 });
    expect(session.getState().status).toBe('anonymous');
  });

  it('login, refresh and logout calls never trigger a refresh themselves', async () => {
    const counts = probeAndRefresh();
    server.use(http.post(`${API}/auth/login`, () => apiError(401, 'Invalid email or password')));
    await expect(
      api.post('/auth/login', { email: 'a@b.c', password: 'x' }, { skipAuth: true }),
    ).rejects.toMatchObject({ status: 401 });
    expect(counts.refresh).toBe(0);
  });

  describe('restore on page load', () => {
    it('refresh cookie → access token → user', async () => {
      await session.restore();
      expect(session.getState()).toMatchObject({ status: 'authenticated', user });
      expect(accessToken.get()).toBe('refreshed-token');
    });

    it('no valid cookie → signed out quietly (no error, no end reason)', async () => {
      server.use(
        http.post(`${API}/auth/refresh`, () => apiError(401, 'Invalid or expired refresh token')),
      );
      await session.restore();
      expect(session.getState()).toMatchObject({ status: 'anonymous', user: null });
      expect(accessToken.get()).toBeNull();
    });

    it('concurrent restores share one refresh', async () => {
      const counts = probeAndRefresh();
      await Promise.all([session.restore(), session.restore(), refresh()]);
      expect(counts.refresh).toBe(1);
    });
  });

  it('refreshes proactively one minute before the access token expires', async () => {
    vi.useFakeTimers();
    const counts = probeAndRefresh();
    session.start({ ...authResponse, expiresIn: 900 });

    await vi.advanceTimersByTimeAsync(839_000);
    expect(counts.refresh).toBe(0);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(counts.refresh).toBe(1);
    expect(accessToken.get()).toBe('refreshed-token');
  });

  it('serialises refreshes across tabs with the Web Locks API when available', async () => {
    const request = vi.fn((_name: string, task: () => Promise<unknown>) => task());
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    try {
      await refresh();
      expect(request).toHaveBeenCalledWith('flowforge-auth-refresh', expect.any(Function));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  describe('logout', () => {
    it('clears the token, ends the session and tells other tabs', async () => {
      const otherTab = new BroadcastChannel('flowforge-auth');
      const messages: unknown[] = [];
      otherTab.onmessage = (e) => messages.push(e.data);
      session.start(authResponse);

      await session.logout();

      expect(accessToken.get()).toBeNull();
      expect(session.getState()).toMatchObject({ status: 'anonymous', endReason: 'logout' });
      await vi.waitFor(() => expect(messages).toEqual([{ type: 'logout' }]));
      otherTab.close();
    });

    it('a logout in another tab signs this tab out', async () => {
      session.start(authResponse);
      const otherTab = new BroadcastChannel('flowforge-auth');
      otherTab.postMessage({ type: 'logout' });
      await vi.waitFor(() =>
        expect(session.getState()).toMatchObject({ status: 'anonymous', endReason: 'other-tab' }),
      );
      otherTab.close();
    });

    it('still signs out locally when the server cannot be reached', async () => {
      server.use(http.post(`${API}/auth/logout`, () => HttpResponse.error()));
      session.start(authResponse);
      await session.logout();
      expect(session.getState().status).toBe('anonymous');
    });
  });

  it('keeps no auth data in web storage (AC-02.2)', async () => {
    session.start(authResponse);
    await refresh();
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(stored).not.toContain('token');
    expect(stored).not.toContain(authResponse.accessToken);
    expect(document.cookie).toBe('');
  });
});
