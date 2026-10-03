import { DoorOpen, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Dialog, Field, Input, Panel } from '@/components/ui';
import { useSession } from '@/features/auth/session/use-session';
import { useDeleteWorkspace, useRemoveMember } from '@/features/workspaces/api/workspaces.api';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { policy } from '@/features/workspaces/policy';
import { paths } from '@/lib/routes';

/** Leave the workspace; delete it (OWNER) with the name typed (Part 11, FR-11.4). */
export function DangerZonePage() {
  return <DangerZone />;
}

function DangerZone() {
  const workspace = useWorkspace();
  const { user } = useSession();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'leave' | 'delete' | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const leave = useRemoveMember(workspace.id, user?.id);
  const remove = useDeleteWorkspace(workspace.id);
  const done = () => navigate(paths.home, { replace: true });
  const close = () => {
    setDialog(null);
    setConfirmName('');
    leave.reset();
    remove.reset();
  };

  return (
    <Panel className="border-status-failed/30 p-6">
      <h2 className="text-status-failed flex items-center gap-1.5 text-base font-semibold">
        <TriangleAlert className="size-4" aria-hidden />
        Danger zone
      </h2>
      <div className="divide-line mt-4 divide-y">
        <div className="flex flex-wrap items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium">Leave this workspace</p>
            <p className="text-muted text-sm">You lose access until an admin adds you again.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDialog('leave')}>
            <DoorOpen className="size-4" aria-hidden />
            Leave workspace
          </Button>
        </div>
        {policy.canDelete(workspace.role) && (
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Delete this workspace</p>
              <p className="text-muted text-sm">
                Deletes every workflow, version, run and integration in it. This cannot be undone.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setDialog('delete')}>
              <Trash2 className="size-4" aria-hidden />
              Delete workspace
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={dialog === 'leave'}
        onClose={close}
        title={`Leave ${workspace.name}?`}
        description="You will no longer see its workflows and runs."
      >
        {leave.error && (
          <p role="alert" className="text-status-failed mb-4 text-sm">
            {leave.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={leave.isPending || !user}
            onClick={() => user && leave.mutate(user.id, { onSuccess: done })}
          >
            {leave.isPending ? 'Leaving…' : 'Leave workspace'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={dialog === 'delete'}
        onClose={close}
        title={`Delete ${workspace.name}?`}
        description="Every workflow, version, run, integration connection and member link in this workspace is deleted permanently."
      >
        <Field id="confirm-name" label={`Type “${workspace.name}” to confirm`}>
          <Input
            id="confirm-name"
            autoComplete="off"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
        </Field>
        {remove.error && (
          <p role="alert" className="text-status-failed mt-4 text-sm">
            {remove.error.message}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={confirmName !== workspace.name || remove.isPending}
            onClick={() => remove.mutate(undefined, { onSuccess: done })}
          >
            {remove.isPending ? 'Deleting…' : 'Delete workspace'}
          </Button>
        </div>
      </Dialog>
    </Panel>
  );
}
