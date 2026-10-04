import {
  CircleAlert,
  CircleCheckBig,
  CircleDashed,
  Clock,
  FlaskConical,
  Info,
  KeyRound,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
  Unplug,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ProviderIcon } from '@/components/brand/provider-icons';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { Connection, ConnectionStatus, ConnectionType } from '@/types/api';
import { statusReasonMessage } from '../status-reasons';
import type { ProviderInfo } from '../provider-catalog';

const STATUS: Record<ConnectionStatus, { label: string; icon: LucideIcon; className: string }> = {
  CONNECTED: { label: 'Connected', icon: CircleCheckBig, className: 'text-status-succeeded' },
  NEEDS_ATTENTION: {
    label: 'Needs attention',
    icon: CircleAlert,
    className: 'text-status-warning',
  },
  DISCONNECTED: { label: 'Disconnected', icon: CircleDashed, className: 'text-muted' },
};

interface ProviderCardProps {
  info: ProviderInfo;
  configured: boolean;
  /** OAUTH: redirect to the provider. CREDENTIALS: a form (HTTP, Part 18). */
  connectionType: ConnectionType;
  connections: Connection[];
  canManage: boolean;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: (connection: Connection) => void;
  /** The connection just added by the callback, highlighted. */
  highlightId?: string;
  /** Credential connections (HTTP): test, edit and replace-credentials actions. */
  onTest?: (connection: Connection) => void;
  onEdit?: (connection: Connection) => void;
  onReplaceCredentials?: (connection: Connection) => void;
}

/** One provider with all of its connections in this workspace (Part 10, FR-10.1/10.2/10.5). */
export function ProviderCard({
  info,
  configured,
  connectionType,
  connections,
  canManage,
  connecting,
  onConnect,
  onDisconnect,
  highlightId,
  onTest,
  onEdit,
  onReplaceCredentials,
}: ProviderCardProps) {
  return (
    <section aria-label={info.name} className="border-line bg-surface rounded-xl border">
      <div className="flex flex-wrap items-start gap-4 p-5">
        <span className="border-line bg-surface flex size-12 shrink-0 items-center justify-center rounded-xl border">
          <ProviderIcon provider={info.key} className="size-7" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="font-semibold">{info.name}</h2>
          <p className="text-muted text-sm">{info.summary}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {info.trigger && (
              <span className="bg-primary-soft text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium">
                <Zap className="size-3" aria-hidden />
                Trigger: {info.trigger}
              </span>
            )}
            {info.actions.map((a) => (
              <span
                key={a}
                className="bg-canvas text-ink inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
              >
                <Plug className="size-3" aria-hidden />
                Action: {a}
              </span>
            ))}
          </p>
        </div>
        {configured ? (
          canManage && (
            <Button
              variant={connections.length ? 'secondary' : 'primary'}
              size="sm"
              onClick={onConnect}
              disabled={connecting}
            >
              {connections.length ? (
                <Plus className="size-4" aria-hidden />
              ) : (
                <Plug className="size-4" aria-hidden />
              )}
              {connecting ? 'Opening…' : connections.length ? 'Add another' : info.connectLabel}
            </Button>
          )
        ) : (
          <span className="text-muted inline-flex items-center gap-1.5 text-sm">
            <CircleDashed className="size-4" aria-hidden />
            Not available on this server
          </span>
        )}
      </div>

      {!configured && (
        <p className="text-muted border-line flex items-start gap-1.5 border-t px-5 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          The server operator has not configured {info.name} (its app credentials are missing), so
          it cannot be connected yet.
        </p>
      )}
      {configured && !canManage && !connections.length && (
        <p className="text-muted border-line flex items-start gap-1.5 border-t px-5 py-3 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Not connected. Owners and admins can connect {info.name}.
        </p>
      )}

      {connections.length > 0 && (
        <ul
          className="divide-line border-line divide-y border-t"
          aria-label={`${info.name} connections`}
        >
          {connections.map((c) => (
            <ConnectionItem
              key={c.id}
              connection={c}
              canManage={canManage}
              canReconnect={connectionType === 'OAUTH'}
              highlighted={c.id === highlightId}
              onReconnect={onConnect}
              onDisconnect={() => onDisconnect(c)}
              connecting={connecting}
              credentialActions={
                connectionType === 'CREDENTIALS'
                  ? {
                      test: () => onTest?.(c),
                      edit: () => onEdit?.(c),
                      replace: () => onReplaceCredentials?.(c),
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}

      {configured && (
        <ul className="text-muted border-line space-y-1 border-t px-5 py-3 text-xs">
          {info.notes.map((n) => (
            <li key={n} className="flex items-start gap-1.5">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              {n}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ConnectionItem({
  connection: c,
  canManage,
  canReconnect,
  highlighted,
  onReconnect,
  onDisconnect,
  connecting,
  credentialActions,
}: {
  credentialActions?: { test: () => void; edit: () => void; replace: () => void };
  connection: Connection;
  canManage: boolean;
  canReconnect: boolean;
  highlighted: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
}) {
  const s = STATUS[c.status];
  const details = connectionDetails(c);
  return (
    <li className={cn('px-5 py-3', highlighted && 'bg-status-succeeded/5')}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="min-w-0 flex-1 basis-48">
          <span className="block font-medium">{c.accountLabel ?? c.externalAccountId}</span>
          {details && <span className="text-muted block text-xs">{details}</span>}
        </span>
        <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', s.className)}>
          <s.icon className="size-4" aria-hidden />
          {s.label}
        </span>
        <span
          className="text-muted inline-flex items-center gap-1 text-xs"
          title={formatDateTime(c.createdAt)}
        >
          <Clock className="size-3.5" aria-hidden />
          Connected {formatRelative(c.createdAt)}
          {c.lastUsedAt && <> · last used {formatRelative(c.lastUsedAt)}</>}
        </span>
        {canManage && (
          <span className="flex gap-1.5">
            {credentialActions && (
              <>
                <Button size="sm" variant="ghost" onClick={credentialActions.test}>
                  <FlaskConical className="size-4" aria-hidden />
                  Test
                </Button>
                <Button size="sm" variant="ghost" onClick={credentialActions.edit}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant={c.status === 'CONNECTED' ? 'ghost' : 'secondary'}
                  onClick={credentialActions.replace}
                >
                  <KeyRound className="size-4" aria-hidden />
                  Replace credentials
                </Button>
              </>
            )}
            {c.status !== 'CONNECTED' && canReconnect && (
              <Button size="sm" variant="secondary" onClick={onReconnect} disabled={connecting}>
                <RefreshCw className="size-4" aria-hidden />
                Reconnect
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onDisconnect}
              aria-label={`Disconnect ${c.accountLabel ?? c.externalAccountId}`}
            >
              <Unplug className="size-4" aria-hidden />
              Disconnect
            </Button>
          </span>
        )}
      </div>
      {c.status === 'NEEDS_ATTENTION' && (
        <p className="text-status-warning mt-1.5 flex items-start gap-1.5 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {statusReasonMessage(c)}
        </p>
      )}
      {c.scopes.length > 0 && (
        <p className="text-muted mt-1 text-xs">
          Permissions: <span className="font-mono">{c.scopes.join(', ')}</span>
        </p>
      )}
    </li>
  );
}

const HTTP_AUTH: Record<string, string> = {
  none: 'No authentication',
  bearer: 'Bearer token',
  basic: 'Basic auth',
  apiKeyHeader: 'API key (header)',
  apiKeyQuery: 'API key (query)',
  customHeaders: 'Custom headers',
};

/** Safe, useful metadata the backend returns (never tokens). */
function connectionDetails(c: Connection): string | null {
  const m = (c.metadata ?? {}) as Record<string, unknown>;
  if (c.provider === 'GITHUB') {
    const type =
      m.accountType === 'Organization'
        ? 'Organization'
        : m.accountType === 'User'
          ? 'Personal account'
          : null;
    const repos =
      m.repositorySelection === 'all'
        ? 'all repositories'
        : m.repositorySelection === 'selected'
          ? 'selected repositories'
          : null;
    return [type, repos].filter(Boolean).join(' · ') || null;
  }
  if (c.provider === 'MICROSOFT' && typeof m.displayName === 'string') return m.displayName;
  if (c.provider === 'SLACK') return 'Slack workspace';
  if (c.provider === 'GMAIL') return 'Mailbox';
  if (c.provider === 'HTTP') {
    const auth = typeof m.authType === 'string' ? (HTTP_AUTH[m.authType] ?? m.authType) : null;
    const hint = typeof m.secretHint === 'string' && m.authType !== 'none' ? m.secretHint : null;
    const base = typeof m.baseUrl === 'string' ? m.baseUrl : null;
    return [auth, hint, base].filter(Boolean).join(' · ') || null;
  }
  return null;
}
