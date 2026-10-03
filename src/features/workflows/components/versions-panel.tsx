import { BadgeCheck, Eye, RotateCcw, Tag, User } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Button, Skeleton } from '@/components/ui';
import { formatDateTime, formatRelative } from '@/lib/format';
import { paths } from '@/lib/routes';
import { useVersions } from '../api/workflows.api';

interface VersionsPanelProps {
  workspaceId: string;
  workflowId: string;
  /** Absent when the draft cannot be edited (archived). */
  onRestore?: (version: number) => void;
}

/** Published versions, newest first (Part 07, FR-07.5). Versions are immutable. */
export function VersionsPanel({ workspaceId, workflowId, onRestore }: VersionsPanelProps) {
  const versions = useVersions(workspaceId, workflowId);
  const items = versions.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section aria-label="Versions" className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-3">
        {versions.isPending && (
          <div className="space-y-2" aria-label="Loading versions">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}
        {versions.isError && (
          <ErrorState error={versions.error} onRetry={() => void versions.refetch()} />
        )}
        {versions.isSuccess && !items.length && (
          <EmptyState
            icon={Tag}
            title="Not published yet"
            description="Publishing freezes the saved draft as version 1; runs and triggers use the active version."
          />
        )}
        <ul className="space-y-2">
          {items.map((v) => (
            <li key={v.id} className="border-line rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Tag className="text-muted size-4" aria-hidden />
                <span className="font-semibold">v{v.version}</span>
                {v.isActive && (
                  <span className="bg-status-succeeded/10 text-status-succeeded inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    Active
                  </span>
                )}
              </div>
              <p className="text-muted mt-1 text-xs" title={formatDateTime(v.publishedAt)}>
                Published {formatRelative(v.publishedAt)}
              </p>
              <p className="text-muted flex items-center gap-1 text-xs">
                <User className="size-3" aria-hidden />
                {v.publishedBy?.name ?? 'Former member'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to={paths.workflowVersion(workspaceId, workflowId, v.version)}
                  className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  aria-label={`Open version ${v.version}`}
                >
                  <Eye className="size-4" aria-hidden />
                  Open
                </Link>
                {onRestore && (
                  <button
                    type="button"
                    onClick={() => onRestore(v.version)}
                    className="text-muted hover:text-ink inline-flex items-center gap-1 text-sm"
                    aria-label={`Restore version ${v.version} into the draft`}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    Restore into draft
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {versions.hasNextPage && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            onClick={() => void versions.fetchNextPage()}
            disabled={versions.isFetchingNextPage}
          >
            {versions.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </div>
    </section>
  );
}
