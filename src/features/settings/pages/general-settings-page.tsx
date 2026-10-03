import { zodResolver } from '@hookform/resolvers/zod';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button, Dialog, Field, Input, Panel } from '@/components/ui';
import { useSession } from '@/features/auth/session/use-session';
import {
  useDeleteWorkspace,
  useRemoveMember,
  useRenameWorkspace,
} from '@/features/workspaces/api/workspaces.api';
import { workspaceNameSchema } from '@/features/workspaces/schemas';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { policy, ROLE_LABEL } from '@/features/workspaces/policy';
import { paths } from '@/lib/routes';

export function GeneralSettingsPage() {
  const workspace = useWorkspace();
  return (
    <div className="space-y-6">
      <WorkspaceDetails key={workspace.id} />
      <DangerZone />
    </div>
  );
}

function WorkspaceDetails() {
  const workspace = useWorkspace();
  const rename = useRenameWorkspace(workspace.id);
  const canRename = policy.canRename(workspace.role);
  const [copied, setCopied] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<{ name: string }>({
    resolver: zodResolver(workspaceNameSchema),
    defaultValues: { name: workspace.name },
  });

  const onSubmit = handleSubmit(({ name }) =>
    rename.mutate(name, { onSuccess: (updated) => reset({ name: updated.name }) }),
  );

  const copyId = () =>
    void navigator.clipboard?.writeText(workspace.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    });

  return (
    <Panel className="p-6">
      <h2 className="text-base font-semibold">Workspace</h2>
      <form onSubmit={onSubmit} noValidate className="mt-4 max-w-md space-y-4">
        <Field
          id="workspace-name"
          label="Name"
          error={errors.name?.message}
          hint={canRename ? undefined : 'Only admins and owners can rename the workspace.'}
        >
          <Input
            id="workspace-name"
            disabled={!canRename}
            aria-invalid={!!errors.name}
            aria-describedby="workspace-name-msg"
            {...register('name')}
          />
        </Field>
        {rename.error && (
          <p role="alert" className="text-status-failed text-sm">
            {rename.error.message}
          </p>
        )}
        {rename.isSuccess && !isDirty && (
          <p role="status" className="text-status-succeeded text-sm">
            Saved.
          </p>
        )}
        {canRename && (
          <Button type="submit" size="sm" disabled={!isDirty || rename.isPending}>
            {rename.isPending ? 'Saving…' : 'Save name'}
          </Button>
        )}
      </form>
      <dl className="mt-6 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted">Your role</dt>
        <dd>{ROLE_LABEL[workspace.role]}</dd>
        <dt className="text-muted">Workspace id</dt>
        <dd className="flex items-center gap-2">
          <code className="font-mono text-xs">{workspace.id}</code>
          <button
            type="button"
            onClick={copyId}
            className="text-muted hover:text-ink rounded p-1"
            aria-label="Copy workspace id"
          >
            <Copy className="size-3.5" aria-hidden />
          </button>
          {copied && <span className="text-muted text-xs">Copied</span>}
        </dd>
      </dl>
    </Panel>
  );
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
      <h2 className="text-base font-semibold">Danger zone</h2>
      <div className="divide-line mt-4 divide-y">
        <div className="flex flex-wrap items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-medium">Leave this workspace</p>
            <p className="text-muted text-sm">You lose access until an admin adds you again.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDialog('leave')}>
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
