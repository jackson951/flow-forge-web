import { ExternalLink, Info, Repeat, Timer } from 'lucide-react';
import { NodeTypeIcon } from '@/components/brand/node-type-icon';
import { StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { StepRun } from '@/types/api';
import { formatDuration } from '../run-helpers';
import { ErrorExplanation } from './error-explanation';
import { isGmailMessage } from './gmail-message';
import { GmailMessageResult } from './gmail-message-result';
import { HttpStepResult } from './http-step-result';
import { JsonView } from './json-view';

interface StepTimelineProps {
  steps: StepRun[];
  labelFor: (type: string) => string;
  /** Why skipped steps did not run (branch not taken / run stopped). */
  skipReasons: Map<string, string>;
  /** Retention removed stored inputs/outputs. */
  payloadsTrimmed: boolean;
}

/** Steps in execution order (Part 08, FR-08.4). A real sequence, so it's an <ol>. */
export function StepTimeline({ steps, labelFor, skipReasons, payloadsTrimmed }: StepTimelineProps) {
  const ordered = [...steps].sort((a, b) => a.sequence - b.sequence);
  return (
    <ol
      aria-label="Execution timeline"
      className="divide-line border-line bg-surface divide-y rounded-xl border"
    >
      {ordered.map((step) => {
        const skipped = step.status === 'SKIPPED';
        const jiraLink = jiraIssueLink(step);
        const gmailOutput =
          step.nodeType.startsWith('gmail.') && isGmailMessage(step.output) ? step.output : null;
        return (
          <li key={step.id} className={cn('space-y-2 px-4 py-3', skipped && 'bg-canvas/50')}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-muted w-6 text-right font-mono text-xs tabular-nums">
                {step.sequence}
              </span>
              <NodeTypeIcon type={step.nodeType} size="sm" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{labelFor(step.nodeType)}</span>
                <span className="text-muted block font-mono text-xs">{step.nodeKey}</span>
              </span>
              <StatusBadge status={step.status} />
              {step.attemptCount > 1 && (
                <span
                  className="text-muted inline-flex items-center gap-1 text-xs"
                  title="Attempts"
                >
                  <Repeat className="size-3.5" aria-hidden />
                  {step.attemptCount} attempts
                </span>
              )}
              <span className="text-muted ml-auto inline-flex items-center gap-1 text-sm tabular-nums">
                <Timer className="size-3.5" aria-hidden />
                {formatDuration(step.durationMs)}
              </span>
            </div>
            {skipped && skipReasons.get(step.nodeKey) && (
              <p className="text-muted flex items-center gap-1.5 pl-9 text-sm">
                <Info className="size-4 shrink-0" aria-hidden />
                {skipReasons.get(step.nodeKey)}
              </p>
            )}
            {step.error && (
              <div className="pl-9">
                <ErrorExplanation error={step.error} nodeType={step.nodeType} compact />
              </div>
            )}
            {step.externalRef && (
              <p className="text-muted flex items-center gap-1.5 pl-9 text-xs">
                <ExternalLink className="size-3.5" aria-hidden />
                Provider reference{' '}
                {jiraLink ? (
                  <a
                    href={jiraLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-mono hover:underline"
                  >
                    {jiraLink.key}
                  </a>
                ) : (
                  <span className="font-mono">{step.externalRef}</span>
                )}
              </p>
            )}
            {!skipped && step.nodeType === 'http.request' && (
              <div className="pl-9">
                <HttpStepResult input={step.input} output={step.output} />
              </div>
            )}
            {!skipped && (
              <div className="grid gap-2 pl-9 md:grid-cols-2">
                <JsonView
                  label="Input"
                  value={step.input}
                  defaultOpen={step.status === 'FAILED'}
                  empty={payloadsTrimmed ? 'removed by retention' : 'nothing recorded'}
                />
                {gmailOutput ? (
                  <GmailMessageResult value={gmailOutput} label="Email output" />
                ) : (
                  <JsonView
                    label="Output"
                    value={step.output}
                    empty={payloadsTrimmed ? 'removed by retention' : 'nothing recorded'}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function jiraIssueLink(step: StepRun): { key: string; url: string } | null {
  if (!step.nodeType.startsWith('jira.') || !step.output || typeof step.output !== 'object')
    return null;
  const output = step.output as Record<string, unknown>;
  const key =
    typeof output.key === 'string'
      ? output.key
      : typeof output.issueKey === 'string'
        ? output.issueKey
        : step.externalRef;
  if (!key || !/^[A-Z][A-Z0-9_]{1,9}-\d{1,9}$/.test(key)) return null;
  if (typeof output.url !== 'string') return null;
  try {
    const url = new URL(output.url);
    return url.protocol === 'https:' ? { key, url: url.toString() } : null;
  } catch {
    return null;
  }
}
