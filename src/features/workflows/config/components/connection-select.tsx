import { CircleAlert, Plug, TriangleAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { ProviderIcon } from '@/components/brand/provider-icons';
import { PROVIDER_NAMES } from '@/components/brand/providers';
import { Button, Select, Skeleton } from '@/components/ui';
import { useConnections, useStartConnect } from '@/features/integrations/api/integrations.api';
import { policy } from '@/features/workspaces/policy';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { paths } from '@/lib/routes';
import type { Connection, IntegrationProviderKey } from '@/types/api';
import { useConfigScope } from '../config-scope';

interface ConnectionSelectProps {
  id: string;
  provider: IntegrationProviderKey;
  value: string | undefined;
  onChange: (connectionId: string | undefined) => void;
  invalid?: boolean;
}

/**
 * Which of the workspace's connections this step uses (credentials stay in the connection).
 * No connection yet → a link to Integrations (Part 10). Needs-attention connections warn.
 */
export function ConnectionSelect({
  id,
  provider,
  value,
  onChange,
  invalid,
}: ConnectionSelectProps) {
  const workspace = useWorkspace();
  const { readOnly, nodeKey } = useConfigScope();
  const connections = useConnections(workspace.id);
  const start = useStartConnect(workspace.id);
  const location = useLocation();
  const canManage = policy.canManage(workspace.role);
  const name = PROVIDER_NAMES[provider];

  if (connections.isPending) return <Skeleton className="h-10" />;
  if (connections.isError) {
    return (
      <p role="alert" className="text-status-failed flex items-center gap-1.5 text-sm">
        <CircleAlert className="size-4" aria-hidden />
        Could not load connections. {connections.error.message}
      </p>
    );
  }

  const mine = connections.data.filter((c) => c.provider === provider);
  const selected = mine.find((c) => c.id === value);
  const connectHere = () =>
    start.mutate({ provider, returnTo: location.pathname, stepKey: nodeKey });

  if (!mine.length) {
    return (
      <div className="border-line bg-canvas space-y-2 rounded-lg border border-dashed p-3">
        <div className="flex items-center gap-3">
          <ProviderIcon provider={provider} className="size-5 shrink-0" />
          <p className="text-muted flex-1 text-sm">No {name} connection in this workspace yet.</p>
          {canManage ? (
            <Button size="sm" onClick={connectHere} disabled={start.isPending || readOnly}>
              <Plug className="size-4" aria-hidden />
              {start.isPending ? 'Opening…' : `Connect ${name}`}
            </Button>
          ) : (
            <Link
              to={paths.integrations(workspace.id)}
              className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              <Plug className="size-4" aria-hidden />
              Integrations
            </Link>
          )}
        </div>
        {canManage ? (
          <p className="text-muted text-xs">
            You come back to this step after connecting. Wait until the draft shows “Saved” first so
            no change is lost.
          </p>
        ) : (
          <p className="text-muted text-xs">Ask an owner or admin to connect {name}.</p>
        )}
        {start.error && (
          <p role="alert" className="text-status-failed text-xs">
            Could not start the connection: {start.error.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          <ProviderIcon provider={provider} className="size-4" />
        </span>
        <Select
          id={id}
          value={selected ? selected.id : ''}
          disabled={readOnly}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-msg`}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="pl-9"
        >
          <option value="">Choose a {name} connection…</option>
          {mine.map((c) => (
            <option key={c.id} value={c.id}>
              {label(c)}
              {c.status !== 'CONNECTED' ? ' — needs attention' : ''}
            </option>
          ))}
        </Select>
      </div>
      {value && !selected && (
        <p className="text-status-failed flex items-center gap-1.5 text-sm">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          The connection this step used no longer exists. Choose another.
        </p>
      )}
      {selected && selected.status !== 'CONNECTED' && (
        <p className="text-status-warning flex items-center gap-1.5 text-sm">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          This connection needs attention (access was revoked or expired). Reconnect it in{' '}
          <Link to={paths.integrations(workspace.id)} className="underline">
            Integrations
          </Link>
          .
        </p>
      )}
    </div>
  );
}

const label = (c: Connection) => c.accountLabel ?? c.externalAccountId;
