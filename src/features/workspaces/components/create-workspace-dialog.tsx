import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button, Dialog, Field, Input } from '@/components/ui';
import { paths } from '@/lib/routes';
import { useCreateWorkspace } from '../api/workspaces.api';
import { workspaceNameSchema, type WorkspaceNameInput } from '../schemas';

export function CreateWorkspaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreateWorkspace();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkspaceNameInput>({ resolver: zodResolver(workspaceNameSchema) });

  const close = () => {
    reset();
    create.reset();
    onClose();
  };

  const onSubmit = handleSubmit(({ name }) =>
    create.mutate(
      { name },
      {
        onSuccess: (workspace) => {
          close();
          navigate(paths.workspace(workspace.id));
        },
      },
    ),
  );

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create a workspace"
      description="Workflows, runs and integrations belong to a workspace. You will be its owner."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field id="workspace-name" label="Name" error={errors.name?.message}>
          <Input
            id="workspace-name"
            autoComplete="off"
            placeholder="e.g. Platform team"
            aria-invalid={!!errors.name}
            aria-describedby="workspace-name-msg"
            {...register('name')}
          />
        </Field>
        {create.error && (
          <p role="alert" className="text-status-failed text-sm">
            {create.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create workspace'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
