import { zodResolver } from '@hookform/resolvers/zod';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Field, Input, Panel } from '@/components/ui';
import { useRenameWorkspace } from '@/features/workspaces/api/workspaces.api';
import { workspaceNameSchema } from '@/features/workspaces/schemas';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { RoleBadge } from '@/features/workspaces/components/role-badge';
import { policy } from '@/features/workspaces/policy';

export function GeneralSettingsPage() {
  const workspace = useWorkspace();
  return (
    <div className="space-y-6">
      <WorkspaceDetails key={workspace.id} />
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
        <dd>
          <RoleBadge role={workspace.role} />
        </dd>
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
