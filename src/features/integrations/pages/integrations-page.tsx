import { CircleAlert, CircleCheckBig, Plug, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ErrorState } from '@/components/feedback/error-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { policy } from '@/features/workspaces/policy';
import { cn } from '@/lib/cn';
import type { Connection, IntegrationCallbackParams, IntegrationProviderKey } from '@/types/api';
import { useConnections, useProviders, useStartConnect } from '../api/integrations.api';
import { DisconnectDialog } from '../components/disconnect-dialog';
import { ProviderCard } from '../components/provider-card';
import {
  callbackErrorMessage,
  providerFromSlug,
  type IntegrationReturnState,
} from '../connect-flow';
import { PROVIDER_CATALOG, providerInfo } from '../provider-catalog';

/** Connect, inspect and disconnect the workspace's integrations (Part 10). */
export function IntegrationsPage() {
  const workspace = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const providers = useProviders();
  const connections = useConnections(workspace.id);
  const start = useStartConnect(workspace.id);
  const canManage = policy.canManage(workspace.role);
  const [disconnecting, setDisconnecting] = useState<Connection | null>(null);
  const [connectingKey, setConnectingKey] = useState<IntegrationProviderKey | null>(null);
  // The result of a provider round trip arrives once in router state; keep it, then clear it
  // so a reload does not show it again.
  const [result, setResult] = useState<IntegrationCallbackParams | null>(
    () => (location.state as IntegrationReturnState | null)?.integrationResult ?? null,
  );
  useEffect(() => {
    if ((location.state as IntegrationReturnState | null)?.integrationResult) {
      void navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const connect = (provider: IntegrationProviderKey) => {
    setConnectingKey(provider);
    start.mutate({ provider }, { onError: () => setConnectingKey(null) });
  };

  const loadError = providers.error ?? connections.error;
  const configured = new Map((providers.data ?? []).map((p) => [p.key, p.configured]));
  const connectionTypes = new Map((providers.data ?? []).map((p) => [p.key, p.connectionType]));
  const known = PROVIDER_CATALOG.filter((p) => configured.has(p.key));

  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        icon={Plug}
        description="Connect the tools your workflows read from and act in. Access tokens are stored encrypted and are never shown."
      />

      {result && (
        <ResultBanner
          result={result}
          connections={connections.data ?? []}
          onClose={() => setResult(null)}
        />
      )}
      {start.error && (
        <p
          role="alert"
          className="border-status-failed/20 bg-status-failed/5 text-status-failed mb-4 flex items-start gap-1.5 rounded-lg border px-4 py-2.5 text-sm"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Could not start the connection: {start.error.message}
        </p>
      )}

      {(providers.isPending || connections.isPending) && (
        <div className="space-y-3" aria-label="Loading integrations">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}
      {loadError && (
        <ErrorState
          error={loadError}
          onRetry={() => {
            void providers.refetch();
            void connections.refetch();
          }}
        />
      )}
      {providers.data && connections.data && (
        <div className="space-y-4">
          {known.map((info) => (
            <ProviderCard
              key={info.key}
              info={info}
              configured={configured.get(info.key) ?? false}
              connectionType={connectionTypes.get(info.key) ?? 'OAUTH'}
              connections={connections.data.filter((c) => c.provider === info.key)}
              canManage={canManage}
              connecting={connectingKey === info.key && !start.isError}
              onConnect={() => connect(info.key)}
              onDisconnect={setDisconnecting}
              highlightId={result?.status === 'connected' ? result.connectionId : undefined}
            />
          ))}
        </div>
      )}
      <DisconnectDialog connection={disconnecting} onClose={() => setDisconnecting(null)} />
    </PageContainer>
  );
}

function ResultBanner({
  result,
  connections,
  onClose,
}: {
  result: IntegrationCallbackParams;
  connections: Connection[];
  onClose: () => void;
}) {
  const key = providerFromSlug(result.provider);
  const name = (key && providerInfo(key)?.name) ?? 'The integration';
  const ok = result.status === 'connected';
  const connection = connections.find((c) => c.id === result.connectionId);
  const text = ok
    ? `${name} connected${connection ? `: ${connection.accountLabel ?? connection.externalAccountId}` : ''}.`
    : callbackErrorMessage(result.reason, name);
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={cn(
        'mb-4 flex items-start gap-2 rounded-lg border px-4 py-2.5 text-sm',
        ok
          ? 'border-status-succeeded/20 bg-status-succeeded/5'
          : 'border-status-failed/20 bg-status-failed/5 text-status-failed',
      )}
    >
      {ok ? (
        <CircleCheckBig className="text-status-succeeded mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <span className="flex-1">{text}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="text-muted hover:text-ink rounded p-0.5"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
