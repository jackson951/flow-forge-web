import type { IntegrationCallbackParams, IntegrationProviderKey } from '@/types/api';

/**
 * The OAuth / app-installation round trip (Part 10, FR-10.3/10.4).
 *
 * Before the browser leaves for the provider we remember the workspace and where the user came
 * from (e.g. the editor with a step selected). The backend's callback sends the browser to
 * `/integrations?provider=&status=&connectionId=&reason=` — no workspace in the URL and never
 * any secret — and the landing route uses what we remembered to go back.
 */

const STORAGE_KEY = 'flowforge.integrations.return';

export interface ConnectReturn {
  workspaceId: string;
  /** In-app path to return to; defaults to the workspace's Integrations page. */
  returnTo?: string;
  /** Step to reselect in the editor after returning. */
  stepKey?: string;
  provider: IntegrationProviderKey;
}

/** Router state handed to the page we return to. */
export interface IntegrationReturnState {
  integrationResult?: IntegrationCallbackParams;
  selectStep?: string;
}

/** sessionStorage: survives the provider round trip in this tab only. */
export function rememberReturn(target: ConnectReturn) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(target));
  } catch {
    // Storage blocked: the landing page falls back to the last-used workspace.
  }
}

/** Reads the remembered return target (cleared with `clearReturn` once used). */
export function peekReturn(): ConnectReturn | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ConnectReturn>;
    if (typeof value.workspaceId !== 'string') return null;
    // Only same-origin app paths, never a full URL.
    const returnTo =
      typeof value.returnTo === 'string' &&
      value.returnTo.startsWith('/') &&
      !value.returnTo.startsWith('//')
        ? value.returnTo
        : undefined;
    return { ...(value as ConnectReturn), returnTo };
  } catch {
    return null;
  }
}

export function clearReturn() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const SLUGS: Record<string, IntegrationProviderKey> = {
  github: 'GITHUB',
  slack: 'SLACK',
  microsoft: 'MICROSOFT',
};

/** The callback's query string, or null when this is not a callback. */
export function parseCallback(search: string): IntegrationCallbackParams | null {
  const q = new URLSearchParams(search);
  const status = q.get('status');
  if (status !== 'connected' && status !== 'error') return null;
  return {
    provider: q.get('provider') ?? '',
    status,
    connectionId: q.get('connectionId') ?? undefined,
    reason: q.get('reason') ?? undefined,
  };
}

export const providerFromSlug = (slug: string): IntegrationProviderKey | undefined =>
  SLUGS[slug.toLowerCase()];

/** A specific, actionable message per backend `reason` (AC-10.2). */
export function callbackErrorMessage(reason: string | undefined, providerName: string): string {
  switch (reason) {
    case 'denied':
      return `${providerName} access was not granted (cancelled or declined on ${providerName}). Start again and approve the request to connect.`;
    case 'not_authorized':
      return `${providerName} did not give FlowForge everything it needs, or you are no longer allowed to manage integrations here. For GitHub, install the app on an account you can access; for Microsoft, approve Tasks access (ask your tenant admin if it is blocked). Owners and admins can connect integrations.`;
    case 'invalid_state':
      return `The connection request expired or was already used (it is valid for one attempt, for a few minutes). Start the connection again from this page.`;
    case 'unknown_provider':
      return `${providerName} is not available on this FlowForge server. Ask the server operator to configure it.`;
    case 'provider_error':
      return `${providerName} returned an error while finishing the connection. Try again in a moment; if it keeps failing, check ${providerName}'s status.`;
    default:
      return `Connecting ${providerName} failed. Try again.`;
  }
}

/** Follows the provider URL only if it really is one (comes from the backend, https). */
export function isSafeProviderUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' && parsed.hostname === 'localhost')
    );
  } catch {
    return false;
  }
}

/** Leaves the app for the provider (an object so tests can replace it). */
export const browser = {
  assign: (url: string) => window.location.assign(url),
};
