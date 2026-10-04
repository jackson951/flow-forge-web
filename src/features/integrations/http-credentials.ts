import type { HttpAuthType, HttpCredentials } from '@/types/api';

/** HTTP connection form helpers (Part 18): the credential draft and its backend shape. */

export const AUTH_LABELS: Record<HttpAuthType, string> = {
  bearer: 'Bearer token',
  basic: 'Basic (username + password)',
  apiKeyHeader: 'API key in a header',
  apiKeyQuery: 'API key in the query string',
  customHeaders: 'Custom headers',
};

export interface CredentialDraft {
  authType: HttpAuthType;
  token: string;
  username: string;
  password: string;
  headerName: string;
  paramName: string;
  value: string;
  headers: { name: string; value: string }[];
}

export const emptyDraft = (): CredentialDraft => ({
  authType: 'bearer',
  token: '',
  username: '',
  password: '',
  headerName: 'X-API-Key',
  paramName: 'api_key',
  value: '',
  headers: [{ name: '', value: '' }],
});

/** The draft as the backend's credentials object, or the first missing field. */
export function toCredentials(d: CredentialDraft): HttpCredentials | string {
  switch (d.authType) {
    case 'bearer':
      return d.token ? { authType: 'bearer', token: d.token } : 'Enter the token';
    case 'basic':
      if (!d.username) return 'Enter the username';
      if (d.username.includes(':')) return 'The username cannot contain ":"';
      return d.password
        ? { authType: 'basic', username: d.username, password: d.password }
        : 'Enter the password';
    case 'apiKeyHeader':
      if (!d.headerName) return 'Enter the header name';
      return d.value
        ? { authType: 'apiKeyHeader', headerName: d.headerName, value: d.value }
        : 'Enter the API key';
    case 'apiKeyQuery':
      if (!d.paramName) return 'Enter the parameter name';
      return d.value
        ? { authType: 'apiKeyQuery', paramName: d.paramName, value: d.value }
        : 'Enter the API key';
    case 'customHeaders': {
      const rows = d.headers.filter((h) => h.name || h.value);
      if (!rows.length) return 'Add at least one header';
      if (rows.some((h) => !h.name || !h.value)) return 'Each header needs a name and a value';
      const names = rows.map((h) => h.name.toLowerCase());
      if (new Set(names).size !== names.length) return 'Header names must be unique';
      if (rows.length > 10) return 'At most 10 headers';
      return {
        authType: 'customHeaders',
        headers: Object.fromEntries(rows.map((h) => [h.name, h.value])),
      };
    }
  }
}

/** Host names a base URL implies, for the allowed-hosts default. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export const parseHosts = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
