import { accessToken } from '@/lib/access-token';
import { api, configureAuth, isApiError } from '@/lib/api-client';
import type { AuthResponse, PublicUser, TokenResponse } from '@/types/api';

/**
 * Session (Part 02). The access token lives in memory (`accessToken`); the refresh token is
 * the backend's httpOnly `ff_refresh` cookie (SameSite=Strict, path /api/v1/auth) — the
 * `refreshToken` field in responses is ignored on purpose. Nothing is written to web storage.
 *
 * Refresh rules:
 * - one refresh in flight per tab (concurrent callers share it);
 * - one refresh at a time across tabs (Web Locks): the backend rotates the refresh token, and a
 *   refresh that loses a race gets 401 *and clears the cookie*, which would log out the tab
 *   that won. Serialised, the second tab sends the cookie the first one just received;
 * - proactive refresh one minute before the access token expires; reactive refresh on a 401
 *   (api-client retries the request once);
 * - a failed refresh ends the session.
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';
export type EndReason = 'logout' | 'expired' | 'other-tab';

export interface SessionState {
  status: SessionStatus;
  user: PublicUser | null;
  /** Why the last session ended, for a message on the login page. Cleared on login. */
  endReason: EndReason | null;
}

const REFRESH_EARLY_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 10_000;
const LOCK_NAME = 'flowforge-auth-refresh';
const CHANNEL_NAME = 'flowforge-auth';

let state: SessionState = { status: 'unknown', user: null, endReason: null };
const listeners = new Set<() => void>();
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<string | null> | null = null;
let restoring: Promise<void> | null = null;
const onEndCallbacks = new Set<(reason: EndReason) => void>();

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
channel?.addEventListener('message', (event: MessageEvent<{ type?: string }>) => {
  if (event.data?.type === 'logout' && state.status === 'authenticated') end('other-tab', false);
});

function set(next: Partial<SessionState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function schedule(expiresInSeconds: number): void {
  clearTimeout(refreshTimer);
  const delay = Math.max(expiresInSeconds * 1000 - REFRESH_EARLY_MS, MIN_REFRESH_DELAY_MS);
  refreshTimer = setTimeout(() => void refresh(), delay);
}

function applyTokens(tokens: TokenResponse): void {
  accessToken.set(tokens.accessToken);
  schedule(tokens.expiresIn);
}

/** Runs `task` under a cross-tab lock where the browser supports it. */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  // request() resolves with the task's result once the lock is released.
  return locks ? (locks.request(LOCK_NAME, task) as Promise<T>) : task();
}

function end(reason: EndReason, broadcast = true): void {
  clearTimeout(refreshTimer);
  accessToken.clear();
  set({ status: 'anonymous', user: null, endReason: reason });
  if (broadcast) channel?.postMessage({ type: 'logout' });
  onEndCallbacks.forEach((cb) => cb(reason));
}

/**
 * New access token from the refresh cookie, or null (session over). Shared by every caller
 * while it runs. Never throws.
 */
export function refresh(): Promise<string | null> {
  inFlight ??= withRefreshLock(async () => {
    try {
      const tokens = await api.post<TokenResponse>('/auth/refresh', undefined, { skipAuth: true });
      applyTokens(tokens);
      return tokens.accessToken;
    } catch (err) {
      // 401: no valid refresh cookie (expired, logged out, reuse detected). Anything else
      // (network, 5xx) also ends the session — there is no usable access token left.
      // Only a session that existed can "end": a first visit without a cookie is simply
      // signed out, with no "your session has ended" message (restore() sets that state).
      if (state.status === 'authenticated') end('expired');
      if (!isApiError(err) || err.status !== 401) console.warn('Session refresh failed', err);
      return null;
    }
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export const session = {
  getState: (): SessionState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Called with the reason whenever a session ends (the app clears its caches). */
  onEnd(callback: (reason: EndReason) => void): () => void {
    onEndCallbacks.add(callback);
    return () => onEndCallbacks.delete(callback);
  },

  /** After login or register. */
  start(response: AuthResponse): void {
    applyTokens(response);
    set({ status: 'authenticated', user: response.user, endReason: null });
  },

  /** On app load: refresh cookie → access token → user. Resolves either way. */
  restore(): Promise<void> {
    restoring ??= (async () => {
      const token = await refresh();
      if (!token) {
        set({ status: 'anonymous', user: null });
        return;
      }
      try {
        const user = await api.get<PublicUser>('/auth/me');
        set({ status: 'authenticated', user, endReason: null });
      } catch {
        end('expired');
      }
    })().finally(() => {
      restoring = null;
    });
    return restoring;
  },

  /** Ends this session on the server (best effort) and everywhere in this browser. */
  async logout(): Promise<void> {
    await api.post('/auth/logout', undefined, { skipAuth: true }).catch(() => undefined);
    end('logout');
  },

  /** Revokes every session of the user on every device. */
  async logoutAll(): Promise<void> {
    await api.post('/auth/logout-all');
    end('logout');
  },
};

configureAuth({ refresh, onUnauthorized: () => end('expired') });

/** Test helper: back to the initial state. */
export function resetSessionForTests(): void {
  clearTimeout(refreshTimer);
  inFlight = null;
  restoring = null;
  accessToken.clear();
  state = { status: 'unknown', user: null, endReason: null };
}
