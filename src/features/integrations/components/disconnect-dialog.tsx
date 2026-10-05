import { CircleAlert, LoaderCircle, Unplug, Workflow } from 'lucide-react';
import { Link } from 'react-router';
import { Button, Dialog } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { paths } from '@/lib/routes';
import type { Connection } from '@/types/api';
import { useConnectionUsage, useDisconnect, USAGE_SCAN_LIMIT } from '../api/integrations.api';
import { providerInfo } from '../provider-catalog';

/**
 * Disconnect with consequences spelled out (Part 10, FR-10.6): the workflows whose draft uses
 * this connection (best effort) and what happens to their steps.
 */
export function DisconnectDialog({
  connection,
  onClose,
}: {
  connection: Connection | null;
  onClose: () => void;
}) {
  const workspace = useWorkspace();
  const usage = useConnectionUsage(workspace.id, connection?.id ?? null);
  const disconnect = useDisconnect(workspace.id);
  if (!connection) return null;
  const name = providerInfo(connection.provider)?.name ?? connection.provider;
  const label = connection.accountLabel ?? connection.externalAccountId;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Disconnect ${name}: ${label}?`}
      description="FlowForge deletes its stored access and, where the provider supports it, revokes it there too."
    >
      <div className="space-y-3 text-sm">
        {usage.isPending && (
          <p className="text-muted flex items-center gap-1.5">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Checking which workflows use it…
          </p>
        )}
        {usage.data && usage.data.workflows.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
            <p className="flex items-center gap-1.5 font-medium">
              <CircleAlert className="size-4" aria-hidden />
              Used by {usage.data.workflows.length} workflow
              {usage.data.workflows.length === 1 ? '' : 's'}:
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {usage.data.workflows.map((w) => (
                <li key={w.id}>
                  <Link
                    to={paths.workflow(workspace.id, w.id)}
                    className="inline-flex items-center gap-1 underline"
                  >
                    <Workflow className="size-3.5" aria-hidden />
                    {w.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-1.5">
              Their steps that use it will fail until you connect {name} again and pick the new
              connection.
            </p>
          </div>
        )}
        {usage.data && usage.data.workflows.length === 0 && (
          <p className="text-muted">No workflow draft uses this connection.</p>
        )}
        {connection.provider === 'JIRA' && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
            Disconnecting removes FlowForge's Jira webhooks for this connection. Published Jira
            triggers in the affected workflows stop receiving events.
          </p>
        )}
        {connection.provider === 'GMAIL' && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
            Disconnecting stops this mailbox watch. Published Gmail triggers in the affected
            workflows stop receiving email notifications.
          </p>
        )}
        <p className="text-muted text-xs">
          Checked the saved drafts of{' '}
          {usage.data?.partial ? `the ${USAGE_SCAN_LIMIT} most recent` : 'all'} workflows; published
          versions are not checked.
        </p>
        {disconnect.error && (
          <p role="alert" className="text-status-failed">
            {disconnect.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="danger"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate(connection.id, { onSuccess: onClose })}
          >
            <Unplug className="size-4" aria-hidden />
            {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
