import {
  CircleAlert,
  CircleCheckBig,
  FlaskConical,
  KeyRound,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Dialog, Field, Input, Select } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import type { Connection, HttpAuthType } from '@/types/api';
import {
  useCreateHttpConnection,
  useRotateHttpCredentials,
  useTestHttpConnection,
  useUpdateHttpConnection,
} from '../api/integrations.api';
import {
  AUTH_LABELS,
  emptyDraft,
  hostOf,
  parseHosts,
  toCredentials,
  type CredentialDraft,
} from '../http-credentials';

/**
 * HTTP connections (Part 18, FR-18.2–18.4/18.6). Secrets live only in these dialogs' state:
 * cleared when the dialog closes (it unmounts), sent once in the request body, never shown again.
 */

/** Messages from a 422 `details: [{ path, message }]` by path. */
function detailMessages(error: unknown): Record<string, string> {
  const details = (error as { details?: unknown } | null)?.details;
  const out: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const d of details) {
      if (d && typeof d.path === 'string' && typeof d.message === 'string')
        out[d.path] ??= d.message;
    }
  }
  return out;
}

function CredentialFields({
  draft,
  onChange,
  errors,
}: {
  draft: CredentialDraft;
  onChange: (d: CredentialDraft) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<CredentialDraft>) => onChange({ ...draft, ...patch });
  const err = (field: string) => errors[`credentials.${field}`];
  const secret = (id: string, label: string, field: 'token' | 'password' | 'value') => (
    <Field id={id} label={label} error={err(field)}>
      <Input
        id={id}
        type="password"
        autoComplete="new-password"
        value={draft[field]}
        aria-describedby={`${id}-msg`}
        onChange={(e) => set({ [field]: e.target.value })}
      />
    </Field>
  );
  return (
    <div className="space-y-3">
      <Field id="http-auth" label="Authentication">
        <Select
          id="http-auth"
          value={draft.authType}
          onChange={(e) => set({ authType: e.target.value as HttpAuthType })}
        >
          {(Object.keys(AUTH_LABELS) as HttpAuthType[]).map((k) => (
            <option key={k} value={k}>
              {AUTH_LABELS[k]}
            </option>
          ))}
        </Select>
      </Field>
      {draft.authType === 'bearer' && secret('http-token', 'Token', 'token')}
      {draft.authType === 'basic' && (
        <>
          <Field id="http-user" label="Username" error={err('username')}>
            <Input
              id="http-user"
              autoComplete="off"
              value={draft.username}
              aria-describedby="http-user-msg"
              onChange={(e) => set({ username: e.target.value })}
            />
          </Field>
          {secret('http-password', 'Password', 'password')}
        </>
      )}
      {draft.authType === 'apiKeyHeader' && (
        <>
          <Field id="http-header-name" label="Header name" error={err('headerName')}>
            <Input
              id="http-header-name"
              value={draft.headerName}
              aria-describedby="http-header-name-msg"
              onChange={(e) => set({ headerName: e.target.value })}
            />
          </Field>
          {secret('http-key', 'API key', 'value')}
        </>
      )}
      {draft.authType === 'apiKeyQuery' && (
        <>
          <Field id="http-param" label="Query parameter name" error={err('paramName')}>
            <Input
              id="http-param"
              value={draft.paramName}
              aria-describedby="http-param-msg"
              onChange={(e) => set({ paramName: e.target.value })}
            />
          </Field>
          {secret('http-key', 'API key', 'value')}
        </>
      )}
      {draft.authType === 'customHeaders' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Headers (values are secret)</legend>
          {draft.headers.map((h, i) => (
            <div key={i} className="flex gap-2">
              <Input
                aria-label={`Header ${i + 1} name`}
                placeholder="X-Client-Id"
                value={h.name}
                onChange={(e) =>
                  set({
                    headers: draft.headers.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  })
                }
              />
              <Input
                aria-label={`Header ${i + 1} value`}
                type="password"
                autoComplete="new-password"
                value={h.value}
                onChange={(e) =>
                  set({
                    headers: draft.headers.map((x, j) =>
                      j === i ? { ...x, value: e.target.value } : x,
                    ),
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove header ${i + 1}`}
                disabled={draft.headers.length === 1}
                onClick={() => set({ headers: draft.headers.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          {draft.headers.length < 10 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => set({ headers: [...draft.headers, { name: '', value: '' }] })}
            >
              <Plus className="size-4" aria-hidden />
              Add header
            </Button>
          )}
          {err('headers') && <p className="text-status-failed text-sm">{err('headers')}</p>}
        </fieldset>
      )}
    </div>
  );
}

function HostsField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const empty = parseHosts(value).length === 0;
  return (
    <div className="space-y-1.5">
      <Field
        id="http-hosts"
        label="Allowed hosts"
        error={error}
        hint="Credentials are only sent to these hosts. Comma-separated; *.example.com covers subdomains."
      >
        <Input
          id="http-hosts"
          value={value}
          placeholder="api.example.com"
          aria-describedby="http-hosts-msg"
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      {empty && (
        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          With no allowed hosts, these credentials are sent to any host a step calls. Add the API’s
          host unless that is really what you want.
        </p>
      )}
    </div>
  );
}

function Failure({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-status-failed flex items-start gap-1.5 text-sm">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {error.message}
    </p>
  );
}

/** New HTTP connection (ADMIN). `onCreated` receives the new connection (e.g. to select it). */
export function CreateHttpConnectionDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (connection: Connection) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="New HTTP connection"
      description="Save an API’s credentials once; HTTP request and poll steps then refer to this connection."
    >
      {open && <CreateForm onClose={onClose} onCreated={onCreated} />}
    </Dialog>
  );
}

function CreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (connection: Connection) => void;
}) {
  const workspace = useWorkspace();
  const create = useCreateHttpConnection(workspace.id);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [hosts, setHosts] = useState('');
  const [hostsTouched, setHostsTouched] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [problem, setProblem] = useState<string | null>(null);
  const server = detailMessages(create.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setProblem('Enter a name');
    const credentials = toCredentials(draft);
    if (typeof credentials === 'string') return setProblem(credentials);
    setProblem(null);
    const allowedHosts = parseHosts(hosts);
    create.mutate(
      {
        name: name.trim(),
        credentials,
        ...(baseUrl.trim() && { baseUrl: baseUrl.trim() }),
        ...(allowedHosts.length && { allowedHosts }),
      },
      {
        onSuccess: (connection) => {
          create.reset();
          onCreated?.(connection);
          onClose();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <div className="space-y-4">
          <Field id="http-name" label="Name">
            <Input
              id="http-name"
              value={name}
              maxLength={100}
              placeholder="Billing API"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            id="http-base"
            label="Base URL (optional)"
            error={server.baseUrl}
            hint="Steps can then use relative URLs such as /invoices."
          >
            <Input
              id="http-base"
              value={baseUrl}
              placeholder="https://api.example.com/v1"
              aria-describedby="http-base-msg"
              onChange={(e) => {
                setBaseUrl(e.target.value);
                // Until the user edits the hosts, they follow the base URL's host.
                if (!hostsTouched) setHosts(hostOf(e.target.value) ?? '');
              }}
            />
          </Field>
          <HostsField
            value={hosts}
            onChange={(v) => {
              setHostsTouched(true);
              setHosts(v);
            }}
            error={
              server.allowedHosts ??
              Object.entries(server).find(([k]) => k.startsWith('allowedHosts'))?.[1]
            }
          />
        </div>
        <div className="md:border-line space-y-4 md:border-l md:pl-6">
          <CredentialFields draft={draft} onChange={setDraft} errors={server} />
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-status-failed text-sm">
          {problem}
        </p>
      )}
      <Failure error={create.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          <Save className="size-4" aria-hidden />
          {create.isPending ? 'Saving…' : 'Save connection'}
        </Button>
      </div>
    </form>
  );
}

const metadataOf = (c: Connection) => (c.metadata ?? {}) as Record<string, unknown>;

/** Rename / base URL / allowed hosts (ADMIN, FR-18.4). */
export function EditHttpConnectionDialog({
  connection,
  onClose,
}: {
  connection: Connection | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!connection} onClose={onClose} title="Edit HTTP connection">
      {connection && <EditForm connection={connection} onClose={onClose} />}
    </Dialog>
  );
}

function EditForm({ connection, onClose }: { connection: Connection; onClose: () => void }) {
  const workspace = useWorkspace();
  const update = useUpdateHttpConnection(workspace.id);
  const m = metadataOf(connection);
  const [name, setName] = useState(connection.accountLabel ?? '');
  const [baseUrl, setBaseUrl] = useState(typeof m.baseUrl === 'string' ? m.baseUrl : '');
  const [hosts, setHosts] = useState(
    Array.isArray(m.allowedHosts) ? m.allowedHosts.join(', ') : '',
  );
  const server = detailMessages(update.error);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const allowedHosts = parseHosts(hosts);
    update.mutate(
      {
        id: connection.id,
        body: {
          name: name.trim() || undefined,
          baseUrl: baseUrl.trim() || null,
          allowedHosts: allowedHosts.length ? allowedHosts : null,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="http-name" label="Name">
        <Input
          id="http-name"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field id="http-base" label="Base URL (optional)" error={server.baseUrl}>
        <Input
          id="http-base"
          value={baseUrl}
          aria-describedby="http-base-msg"
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </Field>
      <HostsField value={hosts} onChange={setHosts} error={server.allowedHosts} />
      <Failure error={update.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={update.isPending}>
          <Save className="size-4" aria-hidden />
          Save
        </Button>
      </div>
    </form>
  );
}

/** Replace the secrets (write-only; only the hint of the current one is shown). */
export function ReplaceCredentialsDialog({
  connection,
  onClose,
}: {
  connection: Connection | null;
  onClose: () => void;
}) {
  const hint = connection ? metadataOf(connection).secretHint : undefined;
  return (
    <Dialog
      open={!!connection}
      onClose={onClose}
      size="lg"
      title="Replace credentials"
      description={`The current secret (${typeof hint === 'string' ? hint : 'hidden'}) is never shown. Enter the new one; it replaces the old one immediately.`}
    >
      {connection && <ReplaceForm connection={connection} onClose={onClose} />}
    </Dialog>
  );
}

function ReplaceForm({ connection, onClose }: { connection: Connection; onClose: () => void }) {
  const workspace = useWorkspace();
  const rotate = useRotateHttpCredentials(workspace.id);
  const m = metadataOf(connection);
  const [draft, setDraft] = useState<CredentialDraft>(() => ({
    ...emptyDraft(),
    authType: (typeof m.authType === 'string' && m.authType in AUTH_LABELS
      ? m.authType
      : 'bearer') as HttpAuthType,
    headerName: typeof m.headerName === 'string' ? m.headerName : 'X-API-Key',
    paramName: typeof m.paramName === 'string' ? m.paramName : 'api_key',
  }));
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const credentials = toCredentials(draft);
    if (typeof credentials === 'string') return setProblem(credentials);
    setProblem(null);
    rotate.mutate(
      { id: connection.id, credentials },
      {
        onSuccess: () => {
          rotate.reset();
          onClose();
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <CredentialFields draft={draft} onChange={setDraft} errors={detailMessages(rotate.error)} />
      {problem && (
        <p role="alert" className="text-status-failed text-sm">
          {problem}
        </p>
      )}
      <Failure error={rotate.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={rotate.isPending}>
          <KeyRound className="size-4" aria-hidden />
          Replace
        </Button>
      </div>
    </form>
  );
}

/** One request with the saved credentials; shows the outcome only (FR-18.3). */
export function TestHttpConnectionDialog({
  connection,
  onClose,
}: {
  connection: Connection | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!connection}
      onClose={onClose}
      title="Test connection"
      description="Sends one request with the saved credentials. Only the outcome is shown — never the response."
    >
      {connection && <TestForm connection={connection} onClose={onClose} />}
    </Dialog>
  );
}

function TestForm({ connection, onClose }: { connection: Connection; onClose: () => void }) {
  const workspace = useWorkspace();
  const test = useTestHttpConnection(workspace.id);
  const base = metadataOf(connection).baseUrl;
  const [url, setUrl] = useState(typeof base === 'string' ? base : 'https://');
  const [method, setMethod] = useState<'GET' | 'HEAD'>('GET');
  const result = test.data;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        test.mutate({ id: connection.id, url: url.trim(), method });
      }}
    >
      <div className="flex gap-2">
        <Select
          aria-label="Method"
          value={method}
          onChange={(e) => setMethod(e.target.value as 'GET' | 'HEAD')}
          className="w-24"
        >
          <option>GET</option>
          <option>HEAD</option>
        </Select>
        <Input aria-label="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      {result && (
        <p
          role="status"
          className={
            result.ok
              ? 'text-status-succeeded flex items-start gap-1.5 text-sm'
              : 'text-status-failed flex items-start gap-1.5 text-sm'
          }
        >
          {result.ok ? (
            <CircleCheckBig className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          {result.ok
            ? `OK — HTTP ${result.status}${result.durationMs !== undefined ? ` in ${result.durationMs} ms` : ''}`
            : `Failed${result.status ? ` — HTTP ${result.status}` : ''}: ${result.message ?? result.category ?? 'unknown error'}`}
        </p>
      )}
      <Failure error={test.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Done
        </Button>
        <Button type="submit" disabled={test.isPending || !url.trim()}>
          <FlaskConical className="size-4" aria-hidden />
          {test.isPending ? 'Testing…' : 'Send test request'}
        </Button>
      </div>
    </form>
  );
}
