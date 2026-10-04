import { emptyDraft, hostOf, parseHosts, toCredentials } from './http-credentials';

describe('HTTP connection credentials (Part 18)', () => {
  const draft = emptyDraft();

  it('builds the backend shape for every auth type', () => {
    expect(toCredentials({ ...draft, authType: 'bearer', token: 't0k' })).toEqual({
      authType: 'bearer',
      token: 't0k',
    });
    expect(toCredentials({ ...draft, authType: 'basic', username: 'u', password: 'p' })).toEqual({
      authType: 'basic',
      username: 'u',
      password: 'p',
    });
    expect(
      toCredentials({ ...draft, authType: 'apiKeyHeader', headerName: 'X-Key', value: 'v' }),
    ).toEqual({ authType: 'apiKeyHeader', headerName: 'X-Key', value: 'v' });
    expect(
      toCredentials({ ...draft, authType: 'apiKeyQuery', paramName: 'key', value: 'v' }),
    ).toEqual({ authType: 'apiKeyQuery', paramName: 'key', value: 'v' });
    expect(
      toCredentials({
        ...draft,
        authType: 'customHeaders',
        headers: [
          { name: 'X-A', value: '1' },
          { name: '', value: '' },
        ],
      }),
    ).toEqual({ authType: 'customHeaders', headers: { 'X-A': '1' } });
  });

  it('names the first missing or invalid field', () => {
    expect(toCredentials({ ...draft, authType: 'bearer' })).toBe('Enter the token');
    expect(toCredentials({ ...draft, authType: 'basic', username: 'a:b', password: 'p' })).toMatch(
      /cannot contain ":"/,
    );
    expect(toCredentials({ ...draft, authType: 'apiKeyQuery', value: '' })).toBe(
      'Enter the API key',
    );
    expect(
      toCredentials({
        ...draft,
        authType: 'customHeaders',
        headers: [
          { name: 'X-A', value: '1' },
          { name: 'x-a', value: '2' },
        ],
      }),
    ).toBe('Header names must be unique');
    expect(
      toCredentials({ ...draft, authType: 'customHeaders', headers: [{ name: 'X', value: '' }] }),
    ).toMatch(/name and a value/);
  });

  it('derives hosts from a base URL and parses a host list', () => {
    expect(hostOf('https://api.example.com/v1')).toBe('api.example.com');
    expect(hostOf('not a url')).toBeNull();
    expect(parseHosts(' API.example.com, *.example.org  other.io ')).toEqual([
      'api.example.com',
      '*.example.org',
      'other.io',
    ]);
  });
});
