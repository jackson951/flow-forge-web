import { ChevronDown, Info, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Field, Input, Select } from '@/components/ui';
import { useConfigScope } from '../config-scope';
import { credentialHeaderWarning, urlWarning } from '../http-request-model';
import type { FormProps } from './node-forms';
import { ConnectionSelect } from './connection-select';
import { KeyValueEditor } from './key-value-editor';
import { TemplateInput } from './template-input';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;
type BodyType = 'none' | 'json' | 'text' | 'form';

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const record = (v: unknown): Record<string, string> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(
        Object.entries(v as Record<string, unknown>).map(([k, x]) => [
          k,
          typeof x === 'string' ? x : String(x),
        ]),
      )
    : {};

/** `http.request` settings (Part 18, FR-18.7–18.10), mirroring the backend config schema. */
export function HttpRequestForm({ config, set, setMany, error, touch }: FormProps) {
  const { readOnly } = useConfigScope();
  const method = (METHODS as readonly string[]).includes(str(config.method))
    ? str(config.method)
    : 'GET';
  const body = (config.body as { type?: BodyType; value?: unknown } | undefined) ?? {
    type: 'none',
  };
  const bodyType: BodyType = body.type ?? 'none';
  const noBody = method === 'GET' || method === 'HEAD';
  const connectionId = str(config.connectionId) || undefined;
  const url = str(config.url);
  const warning = urlWarning(url);
  const [advanced, setAdvanced] = useState(false);

  return (
    <>
      <Field id="cfg-connection" label="Connection (optional)" error={error('connectionId')}>
        <ConnectionSelect
          id="cfg-connection"
          provider="HTTP"
          optional
          value={connectionId}
          invalid={!!error('connectionId')}
          onChange={(id) => set('connectionId', id)}
        />
      </Field>
      <div className="grid grid-cols-[7rem_1fr] gap-2">
        <Field id="cfg-method" label="Method" error={error('method')}>
          <Select
            id="cfg-method"
            value={method}
            disabled={readOnly}
            onChange={(e) => {
              const next = e.target.value;
              // GET and HEAD cannot have a body; idempotency only applies to POST / PATCH.
              const patch: Record<string, unknown> = { method: next };
              if ((next === 'GET' || next === 'HEAD') && bodyType !== 'none')
                patch.body = undefined;
              if (next !== 'POST' && next !== 'PATCH') patch.idempotent = undefined;
              setMany(patch, 'method');
            }}
          >
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field
          id="cfg-url"
          label="URL"
          error={error('url')}
          hint={
            connectionId
              ? 'Absolute, or relative to the connection’s base URL.'
              : 'An absolute https:// URL.'
          }
        >
          <TemplateInput
            id="cfg-url"
            value={url}
            onChange={(v) => set('url', v)}
            onBlur={() => touch('url')}
            maxLength={2048}
            invalid={!!error('url')}
            placeholder="https://api.example.com/items/{{ trigger.id }}"
          />
        </Field>
      </div>
      {warning && (
        <p className="flex items-start gap-1.5 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {warning}
        </p>
      )}

      <KeyValueEditor
        id="cfg-query"
        legend="Query parameters"
        value={record(config.query)}
        onChange={(v) => set('query', Object.keys(v).length ? v : undefined)}
        error={error('query')}
      />
      <KeyValueEditor
        id="cfg-headers"
        legend="Headers"
        value={record(config.headers)}
        onChange={(v) => set('headers', Object.keys(v).length ? v : undefined)}
        error={error('headers')}
        warnFor={credentialHeaderWarning}
      />

      <Field
        id="cfg-body-type"
        label="Body"
        error={error('body', true)}
        hint={noBody ? `${method} requests have no body.` : undefined}
      >
        <Select
          id="cfg-body-type"
          value={noBody ? 'none' : bodyType}
          disabled={readOnly || noBody}
          aria-describedby="cfg-body-type-msg"
          onChange={(e) => {
            const t = e.target.value as BodyType;
            set(
              'body',
              t === 'none'
                ? undefined
                : t === 'json'
                  ? { type: 'json', value: {} }
                  : t === 'form'
                    ? { type: 'form', value: {} }
                    : { type: 'text', value: '' },
            );
          }}
        >
          <option value="none">None</option>
          <option value="json">JSON</option>
          <option value="text">Text</option>
          <option value="form">Form fields</option>
        </Select>
      </Field>
      {!noBody && bodyType === 'json' && (
        <JsonBodyEditor
          value={body.value}
          onChange={(value) => set('body', { type: 'json', value })}
          error={error('body.value')}
        />
      )}
      {!noBody && bodyType === 'text' && (
        <Field id="cfg-body-text" label="Text body" error={error('body.value')}>
          <TemplateInput
            id="cfg-body-text"
            multiline
            value={str(body.value)}
            onChange={(v) => set('body', { type: 'text', value: v })}
            maxLength={65_536}
          />
        </Field>
      )}
      {!noBody && bodyType === 'form' && (
        <KeyValueEditor
          id="cfg-body-form"
          legend="Form fields"
          value={record(body.value)}
          onChange={(v) => set('body', { type: 'form', value: v })}
          error={error('body.value')}
        />
      )}

      <Field id="cfg-timeout" label="Timeout (seconds)" error={error('timeoutMs')}>
        <Input
          id="cfg-timeout"
          type="number"
          min={1}
          max={30}
          disabled={readOnly}
          value={typeof config.timeoutMs === 'number' ? config.timeoutMs / 1000 : 10}
          onChange={(e) => {
            const s = Math.min(30, Math.max(1, Math.round(Number(e.target.value) || 10)));
            set('timeoutMs', s === 10 ? undefined : s * 1000);
          }}
        />
      </Field>

      <button
        type="button"
        aria-expanded={advanced}
        onClick={() => setAdvanced((a) => !a)}
        className="text-muted hover:text-ink flex items-center gap-1 text-sm font-medium"
      >
        <ChevronDown className={advanced ? 'size-4 rotate-180' : 'size-4'} aria-hidden />
        Advanced
      </button>
      {advanced && (
        <div className="border-line space-y-3 border-l-2 pl-3">
          <Check
            id="cfg-redirects"
            checked={config.followRedirects !== false}
            onChange={(on) => set('followRedirects', on ? undefined : false)}
            label="Follow redirects"
          />
          <Field id="cfg-response" label="Response type">
            <Select
              id="cfg-response"
              value={str(config.responseType) || 'auto'}
              disabled={readOnly}
              onChange={(e) =>
                set('responseType', e.target.value === 'auto' ? undefined : e.target.value)
              }
            >
              <option value="auto">Auto (by Content-Type)</option>
              <option value="json">JSON</option>
              <option value="text">Text</option>
            </Select>
          </Field>
          <Check
            id="cfg-fail4xx"
            checked={config.failOn4xx !== false}
            onChange={(on) => set('failOn4xx', on ? undefined : false)}
            label="Fail the step on 4xx responses"
            hint="Off: a 4xx response becomes the step output, so a condition can check its status."
          />
          {(method === 'POST' || method === 'PATCH') && (
            <Check
              id="cfg-idempotent"
              checked={config.idempotent === true}
              onChange={(on) => set('idempotent', on ? true : undefined)}
              label="The API de-duplicates retries"
              hint="FlowForge then sends a stable Idempotency-Key and may retry automatically. Otherwise a failed write is not retried and may be reported as an uncertain outcome."
            />
          )}
          <Field id="cfg-large" label="Large responses">
            <Select
              id="cfg-large"
              value={str(config.onLargeResponse) || 'truncate'}
              disabled={readOnly}
              onChange={(e) =>
                set('onLargeResponse', e.target.value === 'truncate' ? undefined : e.target.value)
              }
            >
              <option value="truncate">Keep the start (truncate)</option>
              <option value="error">Fail the step</option>
            </Select>
          </Field>
        </div>
      )}
      <p className="text-muted flex items-start gap-1.5 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Later steps can use <code className="font-mono">
          {'{{ steps.<key>.output.status }}'}
        </code>{' '}
        and <code className="font-mono">{'{{ steps.<key>.output.body.… }}'}</code>.
      </p>
    </>
  );
}

function Check({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  hint?: string;
}) {
  const { readOnly } = useConfigScope();
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-primary size-4"
        />
        {label}
      </label>
      {hint && <p className="text-muted mt-0.5 pl-6 text-xs">{hint}</p>}
    </div>
  );
}

/** JSON body with `{{ }}` templates inside strings; invalid JSON is kept locally, not saved. */
function JsonBodyEditor({
  value,
  onChange,
  error,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const { readOnly } = useConfigScope();
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [syntax, setSyntax] = useState<string | null>(null);
  return (
    <Field
      id="cfg-body-json"
      label="JSON body"
      error={syntax ?? error}
      hint='Templates go inside strings, e.g. { "title": "{{ trigger.issue.title }}" }.'
    >
      <textarea
        id="cfg-body-json"
        value={text}
        disabled={readOnly}
        rows={6}
        spellCheck={false}
        aria-invalid={!!(syntax ?? error) || undefined}
        aria-describedby="cfg-body-json-msg"
        className="border-line bg-surface aria-[invalid=true]:border-status-failed w-full rounded-md border px-3 py-2 font-mono text-xs"
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setSyntax(null);
          } catch {
            setSyntax('Not valid JSON yet — the last valid body is kept.');
          }
        }}
      />
    </Field>
  );
}
