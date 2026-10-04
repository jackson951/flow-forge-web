import { Filter, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Field, Input, Select } from '@/components/ui';
import { useConfigScope } from '../config-scope';
import { asCondition } from '../condition-model';
import type { ConditionGroup } from '../schemas';
import { HMAC_PRESETS, HOOK_METHODS, readHookConfig } from '../webhook-model';
import { ConditionBuilder } from './condition-builder';
import type { FormProps } from './node-forms';

type Verification = Record<string, unknown> & { mode: string };

/** `webhook.received` settings (Part 19, FR-19.1–19.2), mirroring the backend's hook config. */
export function WebhookTriggerForm({ config, set, error, errors }: FormProps) {
  const { readOnly } = useConfigScope();
  const c = readHookConfig(config);
  const v = c.verification as Verification;
  const setV = (next: Verification) => set('verification', next);
  const filterErrors = Object.fromEntries(
    Object.entries(errors)
      .filter(([p]) => p === 'filter' || p.startsWith('filter.'))
      .map(([p, m]) => [p.replace(/^filter\.?/, ''), m]),
  );

  return (
    <>
      <Field id="cfg-verify" label="Verification" error={error('verification', true)}>
        <Select
          id="cfg-verify"
          value={v.mode}
          disabled={readOnly}
          aria-describedby="cfg-verify-msg"
          onChange={(e) => {
            const mode = e.target.value;
            setV(
              mode === 'token'
                ? { mode, location: 'header', headerName: 'X-FlowForge-Token' }
                : mode === 'hmac'
                  ? {
                      mode,
                      algorithm: 'sha256',
                      headerName: 'X-FlowForge-Signature',
                      encoding: 'hex',
                      prefix: '',
                    }
                  : mode === 'basic'
                    ? { mode, username: 'flowforge' }
                    : { mode },
            );
          }}
        >
          <option value="token">Shared secret (recommended)</option>
          <option value="hmac">HMAC signature</option>
          <option value="basic">Basic auth</option>
          <option value="none">None — anyone with the URL</option>
        </Select>
      </Field>

      {v.mode === 'token' && (
        <div className="grid grid-cols-2 gap-2">
          <Field id="cfg-token-loc" label="Secret is sent">
            <Select
              id="cfg-token-loc"
              value={String(v.location ?? 'header')}
              disabled={readOnly}
              onChange={(e) => setV({ ...v, location: e.target.value })}
            >
              <option value="header">In a header</option>
              <option value="bearer">As Authorization: Bearer</option>
            </Select>
          </Field>
          {v.location !== 'bearer' && (
            <Field
              id="cfg-token-header"
              label="Header name"
              error={error('verification.headerName')}
            >
              <Input
                id="cfg-token-header"
                value={String(v.headerName ?? '')}
                disabled={readOnly}
                aria-describedby="cfg-token-header-msg"
                onChange={(e) => setV({ ...v, headerName: e.target.value })}
              />
            </Field>
          )}
        </div>
      )}

      {v.mode === 'hmac' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Presets:</span>
            {HMAC_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                disabled={readOnly}
                onClick={() => setV({ mode: 'hmac', ...p.verification })}
                className="border-line hover:bg-canvas rounded-md border px-2 py-0.5 text-xs font-medium"
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field
              id="cfg-hmac-header"
              label="Signature header"
              error={error('verification.headerName')}
            >
              <Input
                id="cfg-hmac-header"
                value={String(v.headerName ?? '')}
                disabled={readOnly}
                aria-describedby="cfg-hmac-header-msg"
                onChange={(e) => setV({ ...v, headerName: e.target.value })}
              />
            </Field>
            <Field id="cfg-hmac-prefix" label="Prefix (optional)" hint='e.g. "sha256="'>
              <Input
                id="cfg-hmac-prefix"
                value={String(v.prefix ?? '')}
                disabled={readOnly}
                aria-describedby="cfg-hmac-prefix-msg"
                onChange={(e) => setV({ ...v, prefix: e.target.value })}
              />
            </Field>
            <Field id="cfg-hmac-alg" label="Algorithm">
              <Select
                id="cfg-hmac-alg"
                value={String(v.algorithm ?? 'sha256')}
                disabled={readOnly}
                onChange={(e) => setV({ ...v, algorithm: e.target.value })}
              >
                <option>sha256</option>
                <option>sha1</option>
                <option>sha512</option>
              </Select>
            </Field>
            <Field id="cfg-hmac-enc" label="Encoding">
              <Select
                id="cfg-hmac-enc"
                value={String(v.encoding ?? 'hex')}
                disabled={readOnly}
                onChange={(e) => setV({ ...v, encoding: e.target.value })}
              >
                <option>hex</option>
                <option>base64</option>
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary size-4"
              disabled={readOnly}
              checked={!!v.timestamp}
              onChange={(e) =>
                setV({
                  ...v,
                  timestamp: e.target.checked
                    ? {
                        headerName: 'X-FlowForge-Timestamp',
                        toleranceSeconds: 300,
                        format: '{timestamp}.{body}',
                      }
                    : undefined,
                })
              }
            />
            Timestamped signature (replay protection)
          </label>
          {!!v.timestamp && (
            <TimestampFields
              value={v.timestamp as Record<string, unknown>}
              onChange={(timestamp) => setV({ ...v, timestamp })}
              error={error}
            />
          )}
        </div>
      )}

      {v.mode === 'basic' && (
        <Field
          id="cfg-basic-user"
          label="Username"
          error={error('verification.username')}
          hint="The password is generated by FlowForge and shown once after publishing."
        >
          <Input
            id="cfg-basic-user"
            value={String(v.username ?? '')}
            disabled={readOnly}
            aria-describedby="cfg-basic-user-msg"
            onChange={(e) => setV({ ...v, username: e.target.value })}
          />
        </Field>
      )}

      {v.mode === 'none' && (
        <div className="space-y-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="flex items-start gap-1.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Anyone who learns the URL can start this workflow. Prefer a shared secret or a
            signature.
          </p>
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              className="accent-primary size-4"
              disabled={readOnly}
              checked={v.acknowledgeUnverified === true}
              onChange={(e) =>
                setV({ mode: 'none', ...(e.target.checked && { acknowledgeUnverified: true }) })
              }
            />
            Anyone with the URL can start this workflow
          </label>
          {error('verification.acknowledgeUnverified') && (
            <p role="alert" className="text-status-failed">
              {error('verification.acknowledgeUnverified')}
            </p>
          )}
        </div>
      )}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Accepted methods</legend>
        <div className="flex flex-wrap gap-3">
          {HOOK_METHODS.map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                className="accent-primary size-4"
                disabled={readOnly}
                checked={c.methods.includes(m)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...c.methods, m]
                    : c.methods.filter((x) => x !== m);
                  set(
                    'methods',
                    next.length ? HOOK_METHODS.filter((x) => next.includes(x)) : undefined,
                  );
                }}
              />
              {m}
            </label>
          ))}
        </div>
        {error('methods') && (
          <p role="alert" className="text-status-failed text-sm">
            {error('methods')}
          </p>
        )}
      </fieldset>

      <section aria-label="Filter" className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="accent-primary size-4"
            disabled={readOnly}
            checked={!!config.filter}
            onChange={(e) => set('filter', e.target.checked ? asCondition({}) : undefined)}
          />
          <Filter className="text-muted size-4" aria-hidden />
          Start a run only for some deliveries
        </label>
        {!!config.filter && (
          <>
            <p className="text-muted text-xs">
              Deliveries that do not match are stored as “Ignored” and start no run. Compare fields
              such as <code className="font-mono">trigger.body.action</code>.
            </p>
            <ConditionBuilder
              value={asCondition(config.filter as Record<string, unknown>)}
              onChange={(next: ConditionGroup) => set('filter', next)}
              errors={filterErrors}
            />
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Field id="cfg-dedup" label="Duplicate detection" error={error('deduplication')}>
          <Select
            id="cfg-dedup"
            value={c.deduplication.source}
            disabled={readOnly}
            aria-describedby="cfg-dedup-msg"
            onChange={(e) => {
              const source = e.target.value;
              set(
                'deduplication',
                source === 'header'
                  ? { source, header: 'X-Event-Id' }
                  : source === 'body'
                    ? { source, path: 'id' }
                    : undefined,
              );
            }}
          >
            <option value="none">None</option>
            <option value="header">By a header</option>
            <option value="body">By a body field</option>
          </Select>
        </Field>
        {c.deduplication.source !== 'none' && (
          <Field
            id="cfg-dedup-key"
            label={c.deduplication.source === 'header' ? 'Header name' : 'Body field (dot path)'}
            error={error(
              c.deduplication.source === 'header' ? 'deduplication.header' : 'deduplication.path',
            )}
          >
            <Input
              id="cfg-dedup-key"
              disabled={readOnly}
              value={String(
                c.deduplication.source === 'header' ? c.deduplication.header : c.deduplication.path,
              )}
              aria-describedby="cfg-dedup-key-msg"
              onChange={(e) =>
                set(
                  'deduplication',
                  c.deduplication.source === 'header'
                    ? { source: 'header', header: e.target.value }
                    : { source: 'body', path: e.target.value },
                )
              }
            />
          </Field>
        )}
        <Field id="cfg-status" label="Response status">
          <Select
            id="cfg-status"
            value={String(c.response.status)}
            disabled={readOnly}
            onChange={(e) =>
              set(
                'response',
                Number(e.target.value) === 202 ? undefined : { status: Number(e.target.value) },
              )
            }
          >
            <option value="202">202 Accepted</option>
            <option value="200">200 OK</option>
            <option value="204">204 No Content</option>
          </Select>
        </Field>
        <Field id="cfg-rate" label="Rate limit per minute" error={error('rateLimitPerMinute')}>
          <Input
            id="cfg-rate"
            type="number"
            min={1}
            max={600}
            disabled={readOnly}
            value={c.rateLimitPerMinute}
            aria-describedby="cfg-rate-msg"
            onChange={(e) => {
              const n = Math.min(600, Math.max(1, Math.round(Number(e.target.value) || 120)));
              set('rateLimitPerMinute', n === 120 ? undefined : n);
            }}
          />
        </Field>
      </div>

      <Field
        id="cfg-ips"
        label="IP allow list (optional)"
        error={error('ipAllowList')}
        hint="IPs or CIDR ranges, comma-separated. Empty: any address."
      >
        <Input
          id="cfg-ips"
          disabled={readOnly}
          defaultValue={c.ipAllowList.join(', ')}
          placeholder="203.0.113.0/24"
          aria-describedby="cfg-ips-msg"
          onBlur={(e) => {
            const list = e.target.value.split(/[\s,]+/).filter(Boolean);
            set('ipAllowList', list.length ? list : undefined);
          }}
        />
      </Field>
      <Field
        id="cfg-headers-keep"
        label="Extra headers to keep (optional)"
        error={error('includeHeaders')}
        hint="Kept in the trigger data in addition to the defaults. Credentials and signatures are always dropped."
      >
        <Input
          id="cfg-headers-keep"
          disabled={readOnly}
          defaultValue={c.includeHeaders.join(', ')}
          placeholder="X-Event-Type"
          aria-describedby="cfg-headers-keep-msg"
          onBlur={(e) => {
            const list = e.target.value.split(/[\s,]+/).filter(Boolean);
            set('includeHeaders', list.length ? list : undefined);
          }}
        />
      </Field>
      <Field
        id="cfg-challenge"
        label="URL validation query parameter (optional)"
        error={error('challenge')}
        hint="For senders that verify the URL with a GET: ?<parameter>=x is answered with x."
      >
        <Input
          id="cfg-challenge"
          disabled={readOnly}
          value={String(
            (config.challenge as { queryParam?: string } | undefined)?.queryParam ?? '',
          )}
          placeholder="challenge"
          aria-describedby="cfg-challenge-msg"
          onChange={(e) =>
            set('challenge', e.target.value ? { queryParam: e.target.value } : undefined)
          }
        />
      </Field>

      <p className="text-muted flex items-start gap-1.5 text-xs">
        {v.mode === 'none' ? (
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        ) : (
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        )}
        Publishing creates the URL; the secret is shown once in the Webhook bar above the canvas.
        Later steps can use <code className="font-mono">{'{{ trigger.body.… }}'}</code>.
      </p>
    </>
  );
}

function TimestampFields({
  value,
  onChange,
  error,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  error: FormProps['error'];
}) {
  const { readOnly } = useConfigScope();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field
        id="cfg-ts-header"
        label="Timestamp header"
        error={error('verification.timestamp.headerName')}
      >
        <Input
          id="cfg-ts-header"
          value={String(value.headerName ?? '')}
          disabled={readOnly}
          aria-describedby="cfg-ts-header-msg"
          onChange={(e) => onChange({ ...value, headerName: e.target.value })}
        />
      </Field>
      <Field
        id="cfg-ts-tol"
        label="Tolerance (seconds)"
        error={error('verification.timestamp.toleranceSeconds')}
      >
        <Input
          id="cfg-ts-tol"
          type="number"
          min={30}
          max={3600}
          value={Number(value.toleranceSeconds ?? 300)}
          disabled={readOnly}
          aria-describedby="cfg-ts-tol-msg"
          onChange={(e) =>
            onChange({
              ...value,
              toleranceSeconds: Math.min(3600, Math.max(30, Number(e.target.value) || 300)),
            })
          }
        />
      </Field>
      <Field id="cfg-ts-format" label="Signed payload">
        <Select
          id="cfg-ts-format"
          value={String(value.format ?? '{timestamp}.{body}')}
          disabled={readOnly}
          onChange={(e) => onChange({ ...value, format: e.target.value })}
        >
          <option value="{timestamp}.{body}">{'{timestamp}.{body}'}</option>
          <option value="v0:{timestamp}:{body}">{'v0:{timestamp}:{body}'}</option>
        </Select>
      </Field>
    </div>
  );
}
