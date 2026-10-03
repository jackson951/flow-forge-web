import { Activity, ArrowLeft, ListChecks } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { paths } from '@/lib/routes';

export function RunDetailPage() {
  const workspace = useWorkspace();
  const { runId } = useParams<{ runId: string }>();
  return (
    <PageContainer>
      <Link
        to={paths.runs(workspace.id)}
        className="text-muted hover:text-ink inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to runs
      </Link>
      <PageHeader title="Run" icon={Activity} description={runId} />
      {/* Part 08: useRun(runId) → summary + <StepTimeline steps={...} /> + retry */}
      <EmptyState
        icon={ListChecks}
        title="Run details"
        description="Step-by-step results for this run will show here."
      />
    </PageContainer>
  );
}
