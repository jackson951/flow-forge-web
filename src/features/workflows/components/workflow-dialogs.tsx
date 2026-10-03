import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button, Dialog, Field, Input } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { isConflict } from '@/lib/api-client';
import { paths } from '@/lib/routes';
import type { WorkflowSummary } from '@/types/api';
import {
  useArchiveWorkflow,
  useCreateWorkflow,
  useDeleteWorkflow,
  useUpdateWorkflow,
} from '../api/workflows.api';
import { workflowDetailsSchema, type WorkflowDetailsInput } from '../schemas';

function DetailsForm({
  defaults,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  defaults: WorkflowDetailsInput;
  submitLabel: string;
  pending: boolean;
  error: Error | null;
  onSubmit: (values: WorkflowDetailsInput) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkflowDetailsInput>({
    resolver: zodResolver(workflowDetailsSchema),
    defaultValues: defaults,
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Field id="workflow-name" label="Name" error={errors.name?.message}>
        <Input
          id="workflow-name"
          autoComplete="off"
          placeholder="e.g. Triage new GitHub issues"
          aria-invalid={!!errors.name}
          aria-describedby="workflow-name-msg"
          {...register('name')}
        />
      </Field>
      <Field
        id="workflow-description"
        label="Description (optional)"
        error={errors.description?.message}
      >
        <textarea
          id="workflow-description"
          rows={3}
          aria-invalid={!!errors.description}
          aria-describedby="workflow-description-msg"
          className="border-line bg-surface aria-[invalid=true]:border-status-failed w-full rounded-md border px-3 py-2 text-sm"
          {...register('description')}
        />
      </Field>
      {error && (
        <p role="alert" className="text-status-failed text-sm">
          {error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** New workflow → straight into the editor (Part 04, FR-04.3). */
export function CreateWorkflowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const create = useCreateWorkflow(workspace.id);
  const close = () => {
    create.reset();
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create a workflow"
      description="It starts as a draft. You add its trigger and steps in the editor."
    >
      <DetailsForm
        defaults={{ name: '', description: '' }}
        submitLabel={create.isPending ? 'Creating…' : 'Create and open editor'}
        pending={create.isPending}
        error={create.error}
        onCancel={close}
        onSubmit={({ name, description }) =>
          create.mutate(
            { name, ...(description && { description }) },
            { onSuccess: (wf) => navigate(paths.workflow(workspace.id, wf.id)) },
          )
        }
      />
    </Dialog>
  );
}

export function EditWorkflowDialog({
  workflow,
  onClose,
}: {
  workflow: WorkflowSummary | null;
  onClose: () => void;
}) {
  const workspace = useWorkspace();
  const update = useUpdateWorkflow(workspace.id);
  const close = () => {
    update.reset();
    onClose();
  };
  return (
    <Dialog open={!!workflow} onClose={close} title="Edit workflow details">
      {workflow && (
        <DetailsForm
          key={workflow.id}
          defaults={{ name: workflow.name, description: workflow.description ?? '' }}
          submitLabel={update.isPending ? 'Saving…' : 'Save'}
          pending={update.isPending}
          error={update.error}
          onCancel={close}
          onSubmit={({ name, description }) =>
            // Optimistic: the list shows the new name at once and rolls back on failure.
            update.mutate({ id: workflow.id, name, description }, { onSuccess: close })
          }
        />
      )}
    </Dialog>
  );
}

export function ArchiveWorkflowDialog({
  workflow,
  onClose,
}: {
  workflow: WorkflowSummary | null;
  onClose: () => void;
}) {
  const workspace = useWorkspace();
  const archive = useArchiveWorkflow(workspace.id);
  const close = () => {
    archive.reset();
    onClose();
  };
  return (
    <Dialog
      open={!!workflow}
      onClose={close}
      title={`Archive “${workflow?.name ?? ''}”?`}
      description="Its trigger stops: no new runs start. Its versions and run history are kept, and you can unarchive it later."
    >
      {archive.error && (
        <p role="alert" className="text-status-failed mb-4 text-sm">
          {archive.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button
          disabled={archive.isPending}
          onClick={() => workflow && archive.mutate(workflow.id, { onSuccess: close })}
        >
          {archive.isPending ? 'Archiving…' : 'Archive workflow'}
        </Button>
      </div>
    </Dialog>
  );
}

export function DeleteWorkflowDialog({
  workflow,
  onClose,
  onArchiveInstead,
}: {
  workflow: WorkflowSummary | null;
  onClose: () => void;
  onArchiveInstead: (workflow: WorkflowSummary) => void;
}) {
  const workspace = useWorkspace();
  const remove = useDeleteWorkflow(workspace.id);
  const close = () => {
    remove.reset();
    onClose();
  };
  // 409: it has run history — deleting would erase it, so the backend asks to archive instead.
  const hasRuns = isConflict(remove.error);
  return (
    <Dialog
      open={!!workflow}
      onClose={close}
      title={`Delete “${workflow?.name ?? ''}”?`}
      description="Only workflows that have never run can be deleted. This cannot be undone."
    >
      {remove.error && (
        <p role="alert" className="text-status-failed mb-4 text-sm">
          {remove.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={close}>
          Cancel
        </Button>
        {hasRuns && workflow ? (
          <Button
            onClick={() => {
              close();
              onArchiveInstead(workflow);
            }}
          >
            Archive instead
          </Button>
        ) : (
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={() => workflow && remove.mutate(workflow.id, { onSuccess: close })}
          >
            {remove.isPending ? 'Deleting…' : 'Delete workflow'}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
