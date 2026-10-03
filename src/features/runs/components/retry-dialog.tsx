import { CircleAlert, CircleHelp, RotateCcw, StepForward } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Dialog } from '@/components/ui';
import { useRetryCountdown } from '@/features/auth/hooks/use-retry-countdown';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { isRateLimited } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import type { RunDetail, StepRun } from '@/types/api';
import { useRetryRun } from '../api/runs.api';
import { errorDetails } from '../run-helpers';

interface RetryDialogProps {
  run: RunDetail;
  steps: StepRun[];
  open: boolean;
  onClose: () => void;
}

/**
 * Retry a failed run (Part 08, FR-08.7): from the start, or resume from the failed step
 * (succeeded steps are reused, so their side effects are not repeated). A step that ended with
 * UNCERTAIN_OUTCOME may already have acted: the user must confirm they checked before the
 * retry is sent with `acknowledgeUncertainOutcome`.
 */
export function RetryDialog(props: RetryDialogProps) {
  if (!props.open) return null;
  return <RetryForm {...props} />;
}

function RetryForm({ run, steps, onClose }: RetryDialogProps) {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const retry = useRetryRun(workspace.id, run.id);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const trimmedKnown = run.payloadsTrimmedAt !== null;
  const [trimmed, setTrimmed] = useState(trimmedKnown);
  const [mode, setMode] = useState<'resume' | 'start'>(trimmedKnown ? 'start' : 'resume');
  const [acknowledged, setAcknowledged] = useState(false);
  const wait = useRetryCountdown(retry.error);

  // Uncertain steps: known from the steps, or reported by the backend's 409.
  const fromSteps = steps
    .filter((s) => s.status === 'FAILED' && s.error?.category === 'UNCERTAIN_OUTCOME')
    .map((s) => s.nodeKey);
  const reported = errorDetails(retry.error);
  const uncertain = [
    ...new Set([...fromSteps, ...(reported.code === 'UNCERTAIN_OUTCOME' ? reported.nodeKeys : [])]),
  ];
  const reused = steps.filter((s) => s.status === 'SUCCEEDED').map((s) => s.nodeKey);

  const submit = () => {
    retry.mutate(
      {
        input: {
          resumeFromFailedStep: mode === 'resume',
          ...(acknowledged && { acknowledgeUncertainOutcome: true }),
        },
        idempotencyKey,
      },
      {
        onSuccess: (created) => {
          onClose();
          void navigate(paths.run(workspace.id, created.runId));
        },
        onError: (error) => {
          if (errorDetails(error).code === 'PAYLOADS_TRIMMED') {
            setTrimmed(true);
            setMode('start');
          }
        },
      },
    );
  };

  const blockedByUncertain = uncertain.length > 0 && !acknowledged;
  const message =
    retry.error && !isRateLimited(retry.error) && reported.code !== 'UNCERTAIN_OUTCOME'
      ? reported.code === 'PAYLOADS_TRIMMED'
        ? 'This run is too old to resume: retention removed its step outputs. Retry it from the start.'
        : retry.error.message
      : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Retry this run?"
      description="A new run is created; this one stays in the history."
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="sr-only">How to retry</legend>
          <Choice
            checked={mode === 'resume'}
            disabled={trimmed}
            onSelect={() => setMode('resume')}
            icon={<StepForward className="size-4" aria-hidden />}
            title="Resume from the failed step"
            text={
              trimmed
                ? 'Not available: retention removed this run’s step outputs.'
                : reused.length
                  ? `Reuses ${reused.length} step${reused.length === 1 ? '' : 's'} that already succeeded (${reused.join(', ')}) — their actions are not repeated.`
                  : 'No step succeeded, so this is the same as starting over.'
            }
          />
          <Choice
            checked={mode === 'start'}
            onSelect={() => setMode('start')}
            icon={<RotateCcw className="size-4" aria-hidden />}
            title="Run again from the start"
            text="Every step runs again, including ones that already acted (messages are sent again, tasks created again)."
          />
        </fieldset>

        {uncertain.length > 0 && (
          <div
            role="alert"
            className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p className="flex items-start gap-1.5 font-medium">
              <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden />
              The outcome of {uncertain.map((k) => `“${k}”`).join(', ')} is unknown.
            </p>
            <p>
              It may already have done its work (for example, posted the message) before the run
              stopped. Check in the provider first — retrying could do it a second time.
            </p>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="accent-primary mt-0.5 size-4"
              />
              I checked, and I accept that it may happen twice.
            </label>
          </div>
        )}

        {wait > 0 && (
          <p role="alert" className="text-status-warning text-sm">
            FlowForge is busy — try again in {wait} s.
          </p>
        )}
        {message && (
          <p role="alert" className="text-status-failed flex items-start gap-1.5 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={retry.isPending || blockedByUncertain || wait > 0}>
            <RotateCcw className="size-4" aria-hidden />
            {retry.isPending ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function Choice({
  checked,
  disabled,
  onSelect,
  icon,
  title,
  text,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 text-sm',
        checked ? 'border-primary bg-primary-soft' : 'border-line',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <input
        type="radio"
        name="retry-mode"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="accent-primary mt-0.5 size-4"
      />
      <span>
        <span className="flex items-center gap-1.5 font-medium">
          {icon}
          {title}
        </span>
        <span className="text-muted mt-0.5 block">{text}</span>
      </span>
    </label>
  );
}
