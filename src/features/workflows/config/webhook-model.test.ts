import { HMAC_PRESETS, readHookConfig, samplePaths } from './webhook-model';

describe('webhook config model (Part 19)', () => {
  it('reads an empty config with the backend defaults', () => {
    expect(readHookConfig({})).toEqual({
      methods: ['POST'],
      verification: { mode: 'token', location: 'header', headerName: 'X-FlowForge-Token' },
      ipAllowList: [],
      deduplication: { source: 'none' },
      response: { status: 202 },
      includeHeaders: [],
      rateLimitPerMinute: 120,
    });
  });

  it('keeps known values and drops unknown methods', () => {
    const c = readHookConfig({
      methods: ['GET', 'DELETE', 'POST'],
      deduplication: { source: 'body', path: 'event.id' },
      response: { status: 204 },
      rateLimitPerMinute: 30,
    });
    expect(c.methods).toEqual(['GET', 'POST']);
    expect(c.deduplication).toEqual({ source: 'body', path: 'event.id' });
    expect(c.response.status).toBe(204);
    expect(c.rateLimitPerMinute).toBe(30);
  });

  it('offers only presets the backend can verify (no Stripe)', () => {
    expect(HMAC_PRESETS.map((p) => p.name)).toEqual(['GitHub-style', 'Slack-style']);
    expect(HMAC_PRESETS[1].verification).toMatchObject({
      prefix: 'v0=',
      timestamp: { format: 'v0:{timestamp}:{body}' },
    });
  });

  it('lists sample paths of a captured body, skipping names references cannot use', () => {
    expect(samplePaths({ order: { id: 7, items: [1] }, 'x-weird': 1, total: 3 }, 'body')).toEqual([
      'body.order',
      'body.order.id',
      'body.order.items',
      'body.total',
    ]);
    expect(samplePaths('text body', 'body')).toEqual([]);
  });
});
