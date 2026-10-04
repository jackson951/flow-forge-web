/**
 * `http.request` helpers (Part 18). The backend's egress guard is the authority; these only warn
 * early in the form and mask values in run detail.
 */

const TEMPLATE = /\{\{[^{}]*\}\}/;

/** Obvious problems with a static URL, in the egress policy's words; null when fine/unknown. */
export function urlWarning(url: string): string | null {
  const value = url.trim();
  if (!value || TEMPLATE.test(value) || !/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'This is not a valid URL.';
  }
  if (parsed.protocol !== 'https:') return 'Only https:// URLs are allowed.';
  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return 'Private and local hosts are blocked by the egress policy.';
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    return 'Use a host name; IP addresses are usually blocked by the egress policy.';
  }
  if (parsed.username || parsed.password) {
    return 'Do not put credentials in the URL; use a connection.';
  }
  return null;
}

const CREDENTIAL_HEADER =
  /^(authorization|cookie|proxy-authorization|x-api-key|api-key|x-auth-token)$|token|secret|apikey|api_key/i;

/** Warns when a hand-typed header looks like it carries a credential (FR-18.9). */
export function credentialHeaderWarning(name: string): string | null {
  return name && CREDENTIAL_HEADER.test(name.trim())
    ? `“${name.trim()}” looks like a credential. Store secrets in an HTTP connection instead of the step.`
    : null;
}

/** Query parameter names whose values are masked (the backend's redaction list). */
const SECRET_PARAM =
  /^(code|state|token|access_token|refresh_token|id_token|client_secret|secret|password|signature|sig|api_key|apikey|key)$/i;

/** URL for display with secret-looking query values replaced by "…". */
export function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const k of [...parsed.searchParams.keys()]) {
      if (SECRET_PARAM.test(k)) parsed.searchParams.set(k, '…');
    }
    return parsed.toString().replace(/%E2%80%A6/g, '…');
  } catch {
    return url;
  }
}
