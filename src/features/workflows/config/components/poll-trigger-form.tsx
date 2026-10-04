import { CalendarPlus, ClipboardCheck, Info, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Button, Field, Input, Select } from '@/components/ui';
import { useConfigScope } from '../config-scope';
import { urlWarning } from '../http-request-model';
import { checkSample } from '../poll-model';
import { defaultSpec, readSpec } from '../schedule-model';
import { ConnectionSelect } from './connection-select';
import { KeyValueEditor } from './key-value-editor';
import type { FormProps } from './node-forms';
import { SchedulePicker } from './schedule-picker';

type Request = {
  method?: string;
  url?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: { type: 'none' } | { type: 'json'; value: unknown };
  timeoutMs?: number;
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const path = (v: unknown) => str((v as { path?: unknown } | undefined)?.path);

/** `http.poll` settings (Part 20, FR-20.1–20.7), mirroring the backend config schema. */
export function PollTriggerForm({ config, set, error }: FormProps) {
  const { readOnly } = useConfigScope();
  const request = (config.request as Request | undefined) ?? {};
  const setRequest = (patch: Partial<Request>) => set('request', { ...request, ...patch });
  const method = request.method === 'POST' ? 'POST' : 'GET';
  const url = str(request.url);
  const templated = /\{\{/.test(url);
  const warning = templated ? null : urlWarning(url);
  const spec = readSpec(config.schedule);
  const cursor = config.cursor as { responsePath?: string; queryParam?: string } | undefined;
  const max = typeof config.maxItemsPerPoll === 'number' ? config.maxItemsPerPoll : 50;
  const connectionId = str(config.connectionId) || undefined;

  return (
    <>
      <h3 className="text-sm font-semibold">Request</h3>
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
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <Field id="cfg-method" label="Method">
          <Select
            id="cfg-method"
            value={method}
            disabled={readOnly}
            onChange={(e) =>
              setRequest(
                e.target.value === 'GET'
                  ? { method: undefined, body: undefined }
                  : { method: 'POST' },
              )
            }
          >
            <option>GET</option>
            <option>POST</option>
          </Select>
        </Field>
        <Field
          id="cfg-url"
          label="URL"
          error={
            templated
              ? 'Templates are not available here: a poll has no earlier data.'
              : error('request.url')
          }
          hint={
            connectionId
              ? 'Absolute, or relative to the connection’s base URL.'
              : 'An absolute https:// URL.'
          }
        >
          <Input
            id="cfg-url"
            value={url}
            disabled={readOnly}
            placeholder="https://api.example.com/orders"
            aria-invalid={templated || !!error('request.url') || undefined}
            aria-describedby="cfg-url-msg"
            onChange={(e) => setRequest({ url: e.target.value })}
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
        plain
        value={request.query ?? {}}
        onChange={(v) => setRequest({ query: Object.keys(v).length ? v : undefined })}
        error={error('request.query')}
      />
      <KeyValueEditor
        id="cfg-headers"
        legend="Headers"
        plain
        value={request.headers ?? {}}
        onChange={(v) => setRequest({ headers: Object.keys(v).length ? v : undefined })}
        error={error('request.headers')}
      />
      {method === 'POST' && (
        <JsonBody
          value={request.body?.type === 'json' ? request.body.value : undefined}
          onChange={(value) =>
            setRequest({ body: value === undefined ? undefined : { type: 'json', value } })
          }
          error={error('request.body')}
        />
      )}

      <h3 className="pt-1 text-sm font-semibold">Schedule</h3>
      {spec ? (
        <SchedulePicker
          value={spec}
          onChange={(next) => set('schedule', next)}
          fieldError={(field) => (field ? error(`schedule.${field}`) : error('schedule', true))}
        />
      ) : (
        <div className="space-y-2">
          {error('schedule') && (
            <p role="alert" className="text-status-failed text-sm">
              {error('schedule')}
            </p>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled={readOnly}
            onClick={() => set('schedule', defaultSpec('interval'))}
          >
            <CalendarPlus className="size-4" aria-hidden />
            Set up the schedule
          </Button>
        </div>
      )}

      <h3 className="pt-1 text-sm font-semibold">Items</h3>
      <Field
        id="cfg-items"
        label="Where the items are (dot path, optional)"
        error={error('items')}
        hint="The list in the response, e.g. data.items. Empty: the whole response is one item."
      >
        <Input
          id="cfg-items"
          value={path(config.items)}
          disabled={readOnly}
          placeholder="data.items"
          aria-describedby="cfg-items-msg"
          onChange={(e) => set('items', e.target.value ? { path: e.target.value } : undefined)}
        />
      </Field>
      <Field
        id="cfg-identity"
        label="Item id (dot path, optional)"
        error={error('identity')}
        hint="How items are told apart, e.g. id. Empty: the item's content — an edited item then counts as new."
      >
        <Input
          id="cfg-identity"
          value={path(config.identity)}
          disabled={readOnly}
          placeholder="id"
          aria-describedby="cfg-identity-msg"
          onChange={(e) => set('identity', e.target.value ? { path: e.target.value } : undefined)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field
          id="cfg-cursor-path"
          label="Cursor in the response (optional)"
          error={error('cursor.responsePath')}
        >
          <Input
            id="cfg-cursor-path"
            value={str(cursor?.responsePath)}
            disabled={readOnly}
            placeholder="meta.next"
            aria-describedby="cfg-cursor-path-msg"
            onChange={(e) =>
              set(
                'cursor',
                e.target.value || cursor?.queryParam
                  ? { responsePath: e.target.value, queryParam: str(cursor?.queryParam) }
                  : undefined,
              )
            }
          />
        </Field>
        <Field id="cfg-cursor-param" label="Sent next time as" error={error('cursor.queryParam')}>
          <Input
            id="cfg-cursor-param"
            value={str(cursor?.queryParam)}
            disabled={readOnly}
            placeholder="since"
            aria-describedby="cfg-cursor-param-msg"
            onChange={(e) =>
              set(
                'cursor',
                e.target.value || cursor?.responsePath
                  ? { responsePath: str(cursor?.responsePath), queryParam: e.target.value }
                  : undefined,
              )
            }
          />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-primary mt-0.5 size-4"
          disabled={readOnly}
          checked={config.seedOnFirstPoll !== false}
          onChange={(e) => set('seedOnFirstPoll', e.target.checked ? undefined : false)}
        />
        <span>
          First poll records existing items without starting runs (recommended)
          <span className="text-muted block text-xs">
            Off: the first poll starts a run for every item it finds.
          </span>
        </span>
      </label>
      <Field
        id="cfg-max"
        label="Max new items per poll"
        error={error('maxItemsPerPoll')}
        hint="More new items than this are picked up by the next poll."
      >
        <Input
          id="cfg-max"
          type="number"
          min={1}
          max={100}
          value={max}
          disabled={readOnly}
          aria-describedby="cfg-max-msg"
          onChange={(e) => {
            const n = Math.min(100, Math.max(1, Math.round(Number(e.target.value) || 50)));
            set('maxItemsPerPoll', n === 50 ? undefined : n);
          }}
        />
      </Field>

      <SampleChecker
        items={path(config.items)}
        identity={path(config.identity)}
        cursor={str(cursor?.responsePath)}
      />

      <p className="text-muted flex items-start gap-1.5 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Each new item starts one run. Later steps can use{' '}
        <code className="font-mono">{'{{ trigger.item.… }}'}</code> and{' '}
        <code className="font-mono">{'{{ trigger.itemId }}'}</code>.
      </p>
    </>
  );
}

function JsonBody({
  value,
  onChange,
  error,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const { readOnly } = useConfigScope();
  const [text, setText] = useState(() =>
    value === undefined ? '' : JSON.stringify(value, null, 2),
  );
  const [syntax, setSyntax] = useState<string | null>(null);
  return (
    <Field id="cfg-body" label="JSON body (optional)" error={syntax ?? error}>
      <textarea
        id="cfg-body"
        rows={4}
        value={text}
        disabled={readOnly}
        spellCheck={false}
        aria-describedby="cfg-body-msg"
        className="border-line bg-surface w-full rounded-md border px-3 py-2 font-mono text-xs"
        onChange={(e) => {
          setText(e.target.value);
          if (!e.target.value.trim()) {
            setSyntax(null);
            return onChange(undefined);
          }
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

/** FR-20.6: try the paths on a pasted sample response, locally only. */
function SampleChecker({
  items,
  identity,
  cursor,
}: {
  items: string;
  identity: string;
  cursor: string;
}) {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState('');
  const result = sample.trim() ? checkSample(sample, { items, identity, cursor }) : null;
  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <ClipboardCheck className="size-4" aria-hidden />
        Check the paths against a sample response
      </Button>
    );
  }
  return (
    <section
      aria-label="Sample response check"
      className="bg-canvas space-y-2 rounded-lg p-3 text-sm"
    >
      <Field
        id="cfg-sample"
        label="Sample response (JSON)"
        hint="Paste a response from the API. It stays in this browser tab and is never saved or sent."
      >
        <textarea
          id="cfg-sample"
          rows={5}
          value={sample}
          spellCheck={false}
          aria-describedby="cfg-sample-msg"
          className="border-line bg-surface w-full rounded-md border px-3 py-2 font-mono text-xs"
          onChange={(e) => setSample(e.target.value)}
        />
      </Field>
      {result?.error && (
        <p role="alert" className="text-status-failed">
          {result.error}
        </p>
      )}
      {result && !result.error && (
        <ul role="status" className="space-y-0.5">
          <li>
            <strong>{result.itemCount}</strong> item{result.itemCount === 1 ? '' : 's'} found
          </li>
          {result.ids.length > 0 && <li>Ids: {result.ids.join(', ')}</li>}
          {result.missingIds > 0 && (
            <li className="text-status-failed">
              {result.missingIds} item{result.missingIds === 1 ? ' has' : 's have'} no usable id at
              “{identity}” — the poll would fail.
            </li>
          )}
          {cursor && <li>Cursor: {result.cursor ?? 'not found in the sample'}</li>}
          {result.itemKeys.length > 0 && (
            <li className="text-muted">
              Item fields: {result.itemKeys.map((k) => `trigger.item.${k}`).join(', ')}
            </li>
          )}
        </ul>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setSample('');
          setOpen(false);
        }}
      >
        Close and clear
      </Button>
    </section>
  );
}
