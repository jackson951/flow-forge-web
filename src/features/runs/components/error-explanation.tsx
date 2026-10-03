import { ArrowRight, Plug } from 'lucide-react';
import { Link } from 'react-router';
import { PROVIDER_NAMES } from '@/components/brand/providers';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import type { ErrorDescription } from '@/types/api';
import { ERROR_CATEGORIES, providerOfNodeType } from '../run-helpers';

/**
 * An error with its category icon, the backend's human description, the raw message and the
 * next step (Part 08, FR-08.8) — e.g. a rejected connection links to Integrations.
 */
export function ErrorExplanation({
  error,
  nodeType,
  compact = false,
}: {
  error: ErrorDescription;
  nodeType?: string;
  compact?: boolean;
}) {
  const workspace = useWorkspace();
  const info = ERROR_CATEGORIES[error.category];
  const Icon = info.icon;
  const provider = nodeType ? providerOfNodeType(nodeType) : undefined;
  const warning = error.category === 'UNCERTAIN_OUTCOME';
  return (
    <div
      className={cn(
        'rounded-lg border text-sm',
        compact ? 'px-3 py-2' : 'p-4',
        warning
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : 'border-status-failed/20 bg-status-failed/5',
      )}
    >
      <p
        className={cn(
          'flex items-center gap-1.5 font-semibold',
          warning ? 'text-amber-900' : 'text-status-failed',
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {info.label}
        <span className="text-muted font-mono text-[10px] font-normal uppercase">
          {error.category}
        </span>
      </p>
      <p className="mt-1">{error.description}</p>
      {error.message && (
        <p className="text-muted mt-0.5 font-mono text-xs break-words">{error.message}</p>
      )}
      <p className="text-muted mt-1.5 flex items-start gap-1.5">
        <ArrowRight className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          {info.next}
          {error.category === 'PROVIDER_AUTH' && provider && (
            <>
              {' '}
              <Link
                to={paths.integrations(workspace.id)}
                className="text-primary inline-flex items-center gap-1 font-medium hover:underline"
              >
                <Plug className="size-3.5" aria-hidden />
                Reconnect {PROVIDER_NAMES[provider]}
              </Link>
            </>
          )}
        </span>
      </p>
    </div>
  );
}
