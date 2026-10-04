/**
 * `webhook.received` config (Part 19), read with the backend's defaults
 * (flowforge-api `src/modules/hooks/hook-config.ts`).
 */

export const HOOK_METHODS = ['POST', 'PUT', 'PATCH', 'GET'] as const;
export type HookMethod = (typeof HOOK_METHODS)[number];

type Dedup =
  { source: 'none' } | { source: 'header'; header: string } | { source: 'body'; path: string };

export interface HookConfigView {
  methods: HookMethod[];
  verification: Record<string, unknown> & { mode: string };
  ipAllowList: string[];
  deduplication: Dedup;
  response: { status: number };
  includeHeaders: string[];
  rateLimitPerMinute: number;
}

const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

export function readHookConfig(config: Record<string, unknown>): HookConfigView {
  const methods = strings(config.methods).filter((m): m is HookMethod =>
    (HOOK_METHODS as readonly string[]).includes(m),
  );
  const verification =
    config.verification && typeof config.verification === 'object' && 'mode' in config.verification
      ? (config.verification as HookConfigView['verification'])
      : { mode: 'token', location: 'header', headerName: 'X-FlowForge-Token' };
  const d = config.deduplication as
    Partial<{ source: string; header: string; path: string }> | undefined;
  const deduplication: Dedup =
    d?.source === 'header'
      ? { source: 'header', header: d.header ?? '' }
      : d?.source === 'body'
        ? { source: 'body', path: d.path ?? '' }
        : { source: 'none' };
  const status = (config.response as { status?: unknown } | undefined)?.status;
  return {
    methods: methods.length ? methods : ['POST'],
    verification,
    ipAllowList: strings(config.ipAllowList),
    deduplication,
    response: { status: status === 200 || status === 204 ? status : 202 },
    includeHeaders: strings(config.includeHeaders),
    rateLimitPerMinute:
      typeof config.rateLimitPerMinute === 'number' ? config.rateLimitPerMinute : 120,
  };
}

/**
 * HMAC presets matching senders whose scheme the backend supports exactly. Stripe is not
 * offered: its `Stripe-Signature: t=…,v1=…` header packs timestamp and signature into one
 * value, which the backend's HMAC mode does not parse.
 */
export const HMAC_PRESETS: { name: string; verification: Record<string, unknown> }[] = [
  {
    name: 'GitHub-style',
    verification: {
      algorithm: 'sha256',
      headerName: 'X-Hub-Signature-256',
      encoding: 'hex',
      prefix: 'sha256=',
    },
  },
  {
    name: 'Slack-style',
    verification: {
      algorithm: 'sha256',
      headerName: 'X-Slack-Signature',
      encoding: 'hex',
      prefix: 'v0=',
      timestamp: {
        headerName: 'X-Slack-Request-Timestamp',
        toleranceSeconds: 300,
        format: 'v0:{timestamp}:{body}',
      },
    },
  },
];

/** Dot paths of a captured value (`body.order.id`, …), depth-limited, for suggestions. */
export function samplePaths(
  value: unknown,
  prefix: string,
  depth = 3,
  out: string[] = [],
): string[] {
  if (out.length >= 40) return out;
  if (value && typeof value === 'object' && !Array.isArray(value) && depth > 0) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(k)) continue;
      const path = `${prefix}.${k}`;
      out.push(path);
      samplePaths(v, path, depth - 1, out);
    }
  }
  return out;
}
