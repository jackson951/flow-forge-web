import {
  Ban,
  Check,
  CircleCheckBig,
  CircleDashed,
  Copy,
  Inbox,
  KeyRound,
  Link2,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button, Dialog, StatusBadge } from '@/components/ui';
import { JsonView } from '@/features/runs/components/json-view';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { policy } from '@/features/workspaces/policy';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';
import { paths } from '@/lib/routes';
import type { DeliveryStatus, WebhookDelivery } from '@/types/api';
import {
  useCapture,
  useListen,
  useReplayDelivery,
  useRotateWebhook,
  useWebhookDeliveries,
  useWebhookDetails,
} from '../api/webhook.api';

/** Default grace period of the backend (HOOK_ROTATION_GRACE_HOURS). */
const GRACE_HOURS = 24;

const MODES: Record<string, string> = {
  token: 'Shared secret',
  hmac: 'HMAC signature',
  basic: 'Basic auth',
  none: 'Unverified',
};

/**
 * The workflow's generic webhook (Part 19, FR-19.4–19.9): URL and copy, the secret shown once,
 * rotation with grace, test capture ("Listen") and the delivery log with replay.
 */
export function WebhookBar({ workflowId }: { workflowId: string }) {
  const workspace = useWorkspace();
  const admin = policy.canManage(workspace.role);
  // A generated secret arrives once; it lives only here, never in the query cache or storage.
  const [secret, setSecret] = useState<string | null>(null);
  const details = useWebhookDetails(workspace.id, workflowId, true, setSecret);
  const rotate = useRotateWebhook(workspace.id, workflowId);
  const [dialog, setDialog] = useState<'deliveries' | 'listen' | 'secret' | 'url' | null>(null);
  const d = details.data;

  return (
    <section
      aria-label="Webhook"
      className="space-y-2 border-b border-violet-100 bg-violet-50/60 px-4 py-2 text-sm text-violet-950"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Webhook className="size-4 shrink-0 text-violet-600" aria-hidden />
        <span className="font-medium">Webhook</span>
        {details.isPending && <span className="text-muted">Loading…</span>}
        {details.isError && (
          <span className="text-status-failed">
            Could not load the webhook. {details.error.message}
          </span>
        )}
        {d && !d.provisioned && (
          <span className="text-muted">
            Publish to create the URL, or listen for a test delivery first.
          </span>
        )}
        {d?.provisioned && d.url && (
          <>
            <CopyText label="Copy webhook URL" text={d.url} display={d.url} />
            <span className="inline-flex items-center gap-1 text-xs">
              {d.verificationMode === 'none' ? (
                <ShieldAlert className="size-3.5 text-amber-600" aria-hidden />
              ) : (
                <KeyRound className="size-3.5 text-violet-600" aria-hidden />
              )}
              {MODES[d.verificationMode ?? ''] ?? 'Verification'}
              {d.secretHint && <span className="text-muted font-mono">({d.secretHint})</span>}
            </span>
            {!d.active && (
              <span className="text-muted inline-flex items-center gap-1 text-xs">
                <CircleDashed className="size-3.5" aria-hidden />
                Inactive
              </span>
            )}
          </>
        )}
        <span className="ml-auto flex flex-wrap gap-1.5">
          {admin && (
            <Button size="sm" variant="ghost" onClick={() => setDialog('listen')}>
              <Radio className="size-4" aria-hidden />
              Listen for a test
            </Button>
          )}
          {d?.provisioned && (
            <Button size="sm" variant="ghost" onClick={() => setDialog('deliveries')}>
              <Inbox className="size-4" aria-hidden />
              Deliveries
            </Button>
          )}
          {admin && d?.provisioned && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setDialog('secret')}>
                <RefreshCw className="size-4" aria-hidden />
                Rotate secret
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDialog('url')}>
                <Link2 className="size-4" aria-hidden />
                Rotate URL
              </Button>
            </>
          )}
        </span>
      </div>
      {d?.previousSecretExpiresAt && (
        <p className="text-xs">
          The previous secret keeps working until {formatDateTime(d.previousSecretExpiresAt)}.
        </p>
      )}
      {d?.previousUrlExpiresAt && (
        <p className="text-xs">
          The previous URL keeps working until {formatDateTime(d.previousUrlExpiresAt)}.
        </p>
      )}
      {secret && <SecretOnce secret={secret} onDone={() => setSecret(null)} />}

      <Confirm
        open={dialog === 'secret'}
        title="Rotate the webhook secret?"
        body={`A new secret is generated and shown once. The current secret keeps working for ${GRACE_HOURS} hours so you can update the sender.`}
        action="Generate new secret"
        pending={rotate.secret.isPending}
        error={rotate.secret.error}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          rotate.secret.mutate(undefined, {
            onSuccess: (r) => {
              if (r.secret) setSecret(r.secret);
              rotate.secret.reset();
              setDialog(null);
            },
          })
        }
      />
      <Confirm
        open={dialog === 'url'}
        title="Rotate the webhook URL?"
        body={`A new URL is generated. The current URL keeps working for ${GRACE_HOURS} hours, then answers 404.`}
        action="Generate new URL"
        pending={rotate.url.isPending}
        error={rotate.url.error}
        onCancel={() => setDialog(null)}
        onConfirm={() => rotate.url.mutate(undefined, { onSuccess: () => setDialog(null) })}
      />
      <DeliveriesDialog
        workflowId={workflowId}
        open={dialog === 'deliveries'}
        admin={admin}
        onClose={() => setDialog(null)}
      />
      <ListenDialog
        workflowId={workflowId}
        open={dialog === 'listen'}
        onClose={() => setDialog(null)}
      />
    </section>
  );
}

function CopyText({ label, text, display }: { label: string; text: string; display: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {display && (
        <code className="max-w-[28rem] truncate rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">
          {display}
        </code>
      )}
      <button
        type="button"
        aria-label={label}
        title="Copy"
        onClick={() =>
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1_500);
          })
        }
        className="text-muted hover:text-ink rounded p-0.5"
      >
        {copied ? (
          <Check className="text-status-succeeded size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </button>
    </span>
  );
}

/** FR-19.5: the generated secret, once; afterwards only its hint. */
function SecretOnce({ secret, onDone }: { secret: string; onDone: () => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-950"
    >
      <KeyRound className="size-4 shrink-0" aria-hidden />
      <span className="font-medium">Webhook secret — shown only now.</span>
      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
        {shown ? secret : '•'.repeat(24)}
      </code>
      <Button size="sm" variant="ghost" onClick={() => setShown((s) => !s)}>
        {shown ? 'Hide' : 'Reveal'}
      </Button>
      <CopyText label="Copy webhook secret" text={secret} display="" />
      <Button size="sm" variant="secondary" onClick={onDone}>
        <CircleCheckBig className="size-4" aria-hidden />
        I’ve stored it
      </Button>
    </div>
  );
}

function Confirm({
  open,
  title,
  body,
  action,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  action: string;
  pending: boolean;
  error: Error | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} description={body}>
      {error && (
        <p role="alert" className="text-status-failed mb-3 text-sm">
          {error.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={pending}>
          <RefreshCw className="size-4" aria-hidden />
          {action}
        </Button>
      </div>
    </Dialog>
  );
}

const DELIVERY: Record<DeliveryStatus, { label: string; icon: LucideIcon; className: string }> = {
  RECEIVED: { label: 'Received', icon: Inbox, className: 'text-muted' },
  PROCESSED: { label: 'Processed', icon: CircleCheckBig, className: 'text-status-succeeded' },
  IGNORED: { label: 'Ignored', icon: CircleDashed, className: 'text-muted' },
  FAILED: { label: 'Failed', icon: ShieldAlert, className: 'text-status-failed' },
  REJECTED: { label: 'Rejected', icon: Ban, className: 'text-status-failed' },
};

function DeliveriesDialog({
  workflowId,
  open,
  admin,
  onClose,
}: {
  workflowId: string;
  open: boolean;
  admin: boolean;
  onClose: () => void;
}) {
  const workspace = useWorkspace();
  const deliveries = useWebhookDeliveries(workspace.id, workflowId, open);
  const replay = useReplayDelivery(workspace.id, workflowId);
  const [filter, setFilter] = useState<DeliveryStatus | ''>('');
  const [replayed, setReplayed] = useState<Record<string, string>>({});
  const items = (deliveries.data?.pages.flatMap((p) => p.items) ?? []).filter(
    (d) => !filter || d.status === filter,
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Webhook deliveries"
      description="Newest first. Repeats of the same delivery id are counted on its row, not listed again."
    >
      <div className="mb-3 flex items-center gap-2 text-sm">
        <label htmlFor="delivery-filter" className="text-muted">
          Status
        </label>
        <select
          id="delivery-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as DeliveryStatus | '')}
          className="border-line bg-surface h-8 rounded-md border px-2 text-sm"
        >
          <option value="">All</option>
          {(Object.keys(DELIVERY) as DeliveryStatus[]).map((s) => (
            <option key={s} value={s}>
              {DELIVERY[s].label}
            </option>
          ))}
        </select>
      </div>
      {deliveries.isPending && <p className="text-muted text-sm">Loading…</p>}
      {deliveries.isError && (
        <p role="alert" className="text-status-failed text-sm">
          Could not load deliveries. {deliveries.error.message}
        </p>
      )}
      {deliveries.isSuccess && !items.length && (
        <p className="text-muted flex items-center gap-1.5 text-sm">
          <Inbox className="size-4" aria-hidden />
          No deliveries yet.
        </p>
      )}
      {items.length > 0 && (
        <ul aria-label="Deliveries" className="divide-line border-line divide-y rounded-lg border">
          {items.map((d) => (
            <DeliveryRow
              key={d.id}
              delivery={d}
              admin={admin}
              replaying={replay.isPending && replay.variables === d.id}
              replayedRunId={replayed[d.id]}
              onReplay={() =>
                replay.mutate(d.id, {
                  onSuccess: (r) => setReplayed((m) => ({ ...m, [d.id]: r.runId })),
                })
              }
            />
          ))}
        </ul>
      )}
      {replay.error && (
        <p role="alert" className="text-status-failed mt-2 text-sm">
          Replay failed: {replay.error.message}
        </p>
      )}
      {deliveries.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => void deliveries.fetchNextPage()}
          disabled={deliveries.isFetchingNextPage}
        >
          Load more
        </Button>
      )}
    </Dialog>
  );
}

function DeliveryRow({
  delivery: d,
  admin,
  replaying,
  replayedRunId,
  onReplay,
}: {
  delivery: WebhookDelivery;
  admin: boolean;
  replaying: boolean;
  replayedRunId?: string;
  onReplay: () => void;
}) {
  const workspace = useWorkspace();
  const s = DELIVERY[d.status] ?? DELIVERY.RECEIVED;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
      <span className={cn('inline-flex w-24 items-center gap-1 font-medium', s.className)}>
        <s.icon className="size-4" aria-hidden />
        {s.label}
      </span>
      <span className="text-muted text-xs" title={formatDateTime(d.receivedAt)}>
        {formatRelative(d.receivedAt)}
      </span>
      {d.reason && <span className="text-xs">{d.reason}</span>}
      {d.duplicateCount > 0 && (
        <span className="text-muted text-xs">
          +{d.duplicateCount} duplicate{d.duplicateCount === 1 ? '' : 's'}
        </span>
      )}
      {d.sizeBytes !== null && <span className="text-muted text-xs">{d.sizeBytes} B</span>}
      {d.sourceIp && <span className="text-muted font-mono text-xs">{d.sourceIp}</span>}
      <span className="ml-auto flex items-center gap-2">
        {d.run && (
          <Link to={paths.run(workspace.id, d.run.id)} className="inline-flex items-center gap-1">
            <StatusBadge status={d.run.status} />
          </Link>
        )}
        {replayedRunId && (
          <Link
            to={paths.run(workspace.id, replayedRunId)}
            className="text-primary text-xs font-medium hover:underline"
          >
            New run
          </Link>
        )}
        {admin && d.status !== 'REJECTED' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReplay}
            disabled={replaying}
            title="Start a new run from this stored delivery"
          >
            <RotateCcw className="size-4" aria-hidden />
            Replay
          </Button>
        )}
      </span>
    </li>
  );
}

/** FR-19.7: capture the next delivery for 10 minutes, polling until it arrives. */
function ListenDialog({
  workflowId,
  open,
  onClose,
}: {
  workflowId: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Listen for a test delivery"
      description="The next request to the webhook URL in the next 10 minutes is captured instead of starting a run, so you can see its fields."
    >
      {open && <ListenBody workflowId={workflowId} onClose={onClose} />}
    </Dialog>
  );
}

function ListenBody({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
  const workspace = useWorkspace();
  const listen = useListen(workspace.id, workflowId);
  const expiresAt = listen.data?.expiresAt;
  const remaining = useCountdown(expiresAt);
  const capture = useCapture(workspace.id, workflowId, listen.isSuccess && remaining > 0);
  const event = capture.data?.event;
  const expired = !!expiresAt && remaining <= 0 && !event;

  useEffect(() => {
    listen.mutate();
    // Start once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3 text-sm">
      {listen.error && (
        <p role="alert" className="text-status-failed">
          Could not start listening: {listen.error.message}
        </p>
      )}
      {listen.data && (
        <div className="space-y-1">
          <p className="text-muted text-xs">Send a request to:</p>
          <CopyText label="Copy test URL" text={listen.data.url} display={listen.data.url} />
        </div>
      )}
      {listen.data && !event && !expired && (
        <p role="status" className="flex items-center gap-1.5">
          <Radio className="size-4 animate-pulse text-violet-600" aria-hidden />
          Waiting for a delivery… {Math.floor(remaining / 60)}:
          {String(remaining % 60).padStart(2, '0')} left
        </p>
      )}
      {expired && (
        <p role="status" className="text-muted">
          Nothing arrived in 10 minutes. Start listening again when the sender is ready.
        </p>
      )}
      {event && (
        <div className="space-y-2">
          <p role="status" className="text-status-succeeded flex items-center gap-1.5 font-medium">
            <CircleCheckBig className="size-4" aria-hidden />
            Captured a {event.method ?? ''} request. Its fields are now suggested in later steps.
          </p>
          <JsonView label="Captured request" value={event} defaultOpen />
        </div>
      )}
      <div className="flex justify-end gap-2">
        {(expired || event) && (
          <Button variant="ghost" onClick={() => listen.mutate()}>
            <Radio className="size-4" aria-hidden />
            Listen again
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

function useCountdown(until: string | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, [until]);
  return until ? Math.max(0, Math.round((Date.parse(until) - now) / 1_000)) : 0;
}
