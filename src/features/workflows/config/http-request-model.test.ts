import { credentialHeaderWarning, maskUrl, urlWarning } from './http-request-model';

describe('http.request helpers (Part 18)', () => {
  it.each([
    ['https://api.example.com/items', null],
    ['https://api.example.com/{{ trigger.id }}', null],
    ['/relative/path', null],
    ['', null],
    ['http://api.example.com', /Only https/],
    ['https://localhost:3000/x', /Private and local hosts/],
    ['https://10.0.0.1/x', /IP addresses/],
    ['https://user:pw@api.example.com', /credentials in the URL/],
  ])('warns about %s', (url, expected) => {
    const w = urlWarning(url);
    if (expected === null) expect(w).toBeNull();
    else expect(w).toMatch(expected);
  });

  it.each([
    ['Authorization', true],
    ['X-API-Key', true],
    ['x-auth-token', true],
    ['X-Client-Secret', true],
    ['Accept', false],
    ['Content-Type', false],
    ['', false],
  ])('header %s looks like a credential: %s', (name, warns) => {
    expect(!!credentialHeaderWarning(name)).toBe(warns);
  });

  it('masks secret-looking query values for display', () => {
    expect(maskUrl('https://api.example.com/x?api_key=SECRET&page=2')).toBe(
      'https://api.example.com/x?api_key=…&page=2',
    );
    expect(maskUrl('https://api.example.com/x?token=a&sig=b')).toBe(
      'https://api.example.com/x?token=…&sig=…',
    );
    expect(maskUrl('not a url')).toBe('not a url');
  });
});
