import {
  Archive,
  ArchiveRestore,
  CircleCheckBig,
  Clock,
  Copy,
  FilePenLine,
  Layers,
  Pencil,
  PencilLine,
  Plus,
  Rocket,
  SearchX,
  SquarePen,
  Trash2,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { ActionMenu, Button, Skeleton, type ActionMenuItem } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { policy } from '@/features/workspaces/policy';
import { isApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';
import { paths } from '@/lib/routes';
import type { WorkflowStatus, WorkflowSummary } from '@/types/api';
import { useDuplicateWorkflow, useUnarchiveWorkflow, useWorkflowList } from '../api/workflows.api';
import {
  ArchiveWorkflowDialog,
  CreateWorkflowDialog,
  DeleteWorkflowDialog,
  EditWorkflowDialog,
} from '../components/workflow-dialogs';
import { WorkflowStatusBadge } from '../components/workflow-status-badge';

/** Filter tabs; "All" is everything except archived (the backend default). */
const FILTERS: { label: string; icon: LucideIcon; status?: WorkflowStatus }[] = [
  { label: 'All', icon: Layers },
  { label: 'Drafts', icon: PencilLine, status: 'DRAFT' },
  { label: 'Published', icon: CircleCheckBig, status: 'PUBLISHED' },
  { label: 'Archived', icon: Archive, status: 'ARCHIVED' },
];
const isStatus = (v: string | null): v is WorkflowStatus =>
  v === 'DRAFT' || v === 'PUBLISHED' || v === 'ARCHIVED';

type Dialog =
  { kind: 'create' } | { kind: 'edit' | 'archive' | 'delete'; workflow: WorkflowSummary } | null;

export function WorkflowsListPage() {
  const workspace = useWorkspace();
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status = isStatus(statusParam) ? statusParam : undefined;
  const list = useWorkflowList(workspace.id, { status });
  const [dialog, setDialog] = useState<Dialog>(null);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const setStatus = (next?: WorkflowStatus) =>
    setParams(next ? { status: next } : {}, { replace: true });

  return (
    <PageContainer>
      <PageHeader
        title="Workflows"
        icon={Workflow}
        description="Each workflow starts from one trigger and runs its steps in order."
        actions={
          <Button onClick={() => setDialog({ kind: 'create' })}>
            <Plus className="size-4" aria-hidden />
            Create workflow
          </Button>
        }
      />

      <nav aria-label="Filter workflows" className="border-line flex gap-1 border-b">
        {FILTERS.map((f) => {
          const active = f.status === status;
          return (
            <button
              key={f.label}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => setStatus(f.status)}
              className={cn(
                '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm',
                active
                  ? 'border-primary text-primary font-medium'
                  : 'text-muted hover:text-ink border-transparent',
              )}
            >
              <f.icon className="size-4" aria-hidden />
              {f.label}
            </button>
          );
        })}
      </nav>

      {list.isPending && (
        <div className="space-y-3" aria-label="Loading workflows">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      )}

      {list.isError && (
        <ErrorState
          message={list.error.message}
          requestId={isApiError(list.error) ? list.error.requestId : undefined}
          onRetry={() => void list.refetch()}
        />
      )}

      {list.isSuccess && items.length === 0 && (
        <EmptyState
          icon={status ? SearchX : FilePenLine}
          title={
            status
              ? `No ${FILTERS.find((f) => f.status === status)!.label.toLowerCase()} workflows`
              : 'No workflows yet'
          }
          description={
            status
              ? 'Nothing matches this filter.'
              : 'Start with a trigger, like a new GitHub issue, then add the steps that should follow.'
          }
          action={
            status ? (
              <Button variant="secondary" size="sm" onClick={() => setStatus(undefined)}>
                Show all workflows
              </Button>
            ) : (
              <Button size="sm" onClick={() => setDialog({ kind: 'create' })}>
                <Plus className="size-4" aria-hidden />
                Create your first workflow
              </Button>
            )
          }
        />
      )}

      {items.length > 0 && (
        <div className="border-line bg-surface overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-canvas/60 text-muted text-left text-xs">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">
                  Active version
                </th>
                <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">
                  Last edited
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {items.map((workflow) => (
                <WorkflowRow
                  key={workflow.id}
                  workflow={workflow}
                  onDialog={(kind) => setDialog({ kind, workflow })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => void list.fetchNextPage()}
            disabled={list.isFetchingNextPage}
          >
            {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
      {list.isFetchNextPageError && (
        <p role="alert" className="text-status-failed text-center text-sm">
          Could not load more workflows. {list.error?.message}
        </p>
      )}

      <CreateWorkflowDialog open={dialog?.kind === 'create'} onClose={() => setDialog(null)} />
      <EditWorkflowDialog
        workflow={dialog?.kind === 'edit' ? dialog.workflow : null}
        onClose={() => setDialog(null)}
      />
      <ArchiveWorkflowDialog
        workflow={dialog?.kind === 'archive' ? dialog.workflow : null}
        onClose={() => setDialog(null)}
      />
      <DeleteWorkflowDialog
        workflow={dialog?.kind === 'delete' ? dialog.workflow : null}
        onClose={() => setDialog(null)}
        onArchiveInstead={(workflow) => setDialog({ kind: 'archive', workflow })}
      />
    </PageContainer>
  );
}

function WorkflowRow({
  workflow,
  onDialog,
}: {
  workflow: WorkflowSummary;
  onDialog: (kind: 'edit' | 'archive' | 'delete') => void;
}) {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const duplicate = useDuplicateWorkflow(workspace.id);
  const unarchive = useUnarchiveWorkflow(workspace.id);
  const canManage = policy.canManage(workspace.role);
  const archived = workflow.status === 'ARCHIVED';
  const href = paths.workflow(workspace.id, workflow.id);
  const error = duplicate.error ?? unarchive.error;

  const items: ActionMenuItem[] = [
    {
      label: archived ? 'View' : 'Open editor',
      icon: <SquarePen className="size-4" aria-hidden />,
      onSelect: () => navigate(href),
    },
    ...(!archived
      ? [
          {
            label: 'Edit details',
            icon: <Pencil className="size-4" aria-hidden />,
            onSelect: () => onDialog('edit'),
          },
        ]
      : []),
    {
      label: 'Duplicate',
      icon: <Copy className="size-4" aria-hidden />,
      disabled: duplicate.isPending,
      onSelect: () =>
        duplicate.mutate(workflow.id, {
          onSuccess: (copy) => navigate(paths.workflow(workspace.id, copy.id)),
        }),
    },
    ...(canManage
      ? archived
        ? [
            {
              label: 'Unarchive',
              icon: <ArchiveRestore className="size-4" aria-hidden />,
              disabled: unarchive.isPending,
              onSelect: () => unarchive.mutate(workflow.id),
            },
          ]
        : [
            {
              label: 'Archive',
              icon: <Archive className="size-4" aria-hidden />,
              onSelect: () => onDialog('archive'),
            },
          ]
      : []),
    ...(canManage
      ? [
          {
            label: 'Delete',
            icon: <Trash2 className="size-4" aria-hidden />,
            danger: true,
            onSelect: () => onDialog('delete'),
          },
        ]
      : []),
  ];

  return (
    <tr className="hover:bg-canvas/40">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-lg"
          >
            <Workflow className="size-4" />
          </span>
          <div className="min-w-0">
            <Link to={href} className="hover:text-primary font-medium">
              {workflow.name}
            </Link>
            {workflow.description && (
              <p className="text-muted line-clamp-1 text-xs">{workflow.description}</p>
            )}
            {error && (
              <p role="alert" className="text-status-failed mt-1 text-xs">
                {error.message}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <WorkflowStatusBadge status={workflow.status} />
      </td>
      <td className="text-muted hidden px-5 py-3 md:table-cell">
        {workflow.activeVersion ? (
          <span
            className="inline-flex items-center gap-1.5"
            title={formatDateTime(workflow.activeVersion.publishedAt)}
          >
            <Rocket className="size-3.5" aria-hidden />v{workflow.activeVersion.version} · published{' '}
            {formatRelative(workflow.activeVersion.publishedAt)}
          </span>
        ) : (
          'Not published'
        )}
      </td>
      <td className="text-muted hidden px-5 py-3 sm:table-cell">
        <time
          dateTime={workflow.updatedAt}
          title={formatDateTime(workflow.updatedAt)}
          className="inline-flex items-center gap-1.5"
        >
          <Clock className="size-3.5" aria-hidden />
          {formatRelative(workflow.updatedAt)}
        </time>
      </td>
      <td className="px-5 py-3 text-right">
        <ActionMenu label={`Actions for ${workflow.name}`} items={items} />
      </td>
    </tr>
  );
}
