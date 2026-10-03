import { CircleAlert, Clock, Play } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Dialog } from '@/components/ui';
import { useRetryCountdown } from '@/features/auth/hooks/use-retry-countdown';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { isRateLimited } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import { useStartRun } from '../api/runs.api';
import { jsonBytes, MAX_MANUAL_INPUT_BYTES } from '../run-helpers';

interface RunNowDialogProps {
  workflowId: string;
  workflowName: string;
  open: boolean;
  onClose: () => void;
}

/** Validates the JSON input: empty means `{}`; otherwise an object of at most 64 KB. */
function parseInput(text: string): { value: Record<string, unknown> } | { error: string } {
  if (!text.trim()) return { value: {} };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    return { error: `Not valid JSON: ${(e as Error).message}` };
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'The input must be a JSON object, e.g. { "name": "Ada" }' };
  }
  if (jsonBytes(value) > MAX_MANUAL_INPUT_BYTES)
    return { error: 'The input must be at most 64 KB' };
  return { value: value as Record<string, unknown> };
}

/**
 * "Run now" (Part 08, FR-08.1/08.2): optional JSON input, one Idempotency-Key per dialog
 * opening — a double click or a retried request creates one run — then opens the run.
 */
export function RunNowDialog(props: RunNowDialogProps) {
  // Remount per opening: a fresh idempotency key and an empty form each time.
  if (!props.open) return null;
  return <RunNowForm {...props} />;
}

function RunNowForm({ workflowId, workflowName, onClose }: RunNowDialogProps) {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const start = useStartRun(workspace.id, workflowId);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [text, setText] = useState('');
  const parsed = parseInput(text);
  const wait = useRetryCountdown(start.error);

  const submit = () => {
    if ('error' in parsed || start.isPending || wait) return;
    start.mutate(
      { input: { input: parsed.value }, idempotencyKey },
      { onSuccess: (run) => void navigate(paths.run(workspace.id, run.runId)) },
    );
  };

  // 409s carry a clear reason (archived, not published, started by its trigger).
  const serverError = start.error && !isRateLimited(start.error) ? start.error.message : null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Run “${workflowName}”`}
      description="Runs the active (published) version now."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        <label htmlFor="run-input" className="block text-sm font-medium">
          Input (optional JSON)
        </label>
        <textarea
          id="run-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          spellCheck={false}
          placeholder={'{\n  "name": "Ada"\n}'}
          aria-invalid={'error' in parsed || undefined}
          aria-describedby="run-input-msg"
          className={cn(
            'border-line bg-surface w-full rounded-md border px-3 py-2 font-mono text-xs',
            'error' in parsed && 'border-status-failed',
          )}
        />
        <p
          id="run-input-msg"
          className={cn('text-sm', 'error' in parsed ? 'text-status-failed' : 'text-muted')}
        >
          {'error' in parsed
            ? parsed.error
            : 'Later steps read it as {{ trigger.<field> }}. Leave empty to run without input.'}
        </p>
        {wait > 0 && (
          <p role="alert" className="text-status-warning flex items-center gap-1.5 text-sm">
            <Clock className="size-4 shrink-0" aria-hidden />
            FlowForge is busy — try again in {wait} s.
          </p>
        )}
        {serverError && (
          <p role="alert" className="text-status-failed flex items-start gap-1.5 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {serverError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={'error' in parsed || start.isPending || wait > 0}>
            <Play className="size-4" aria-hidden />
            {start.isPending ? 'Starting…' : 'Run'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
