import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';

export function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  return (
    <PageContainer>
      <Link to="/runs" className="text-muted hover:text-ink text-sm">
        Back to runs
      </Link>
      <PageHeader title="Run" description={runId} />
      {/* TODO: useRun(runId) → summary + <StepTimeline steps={run.steps} /> + retry */}
      <EmptyState
        title="Run details"
        description="Step-by-step results for this run will show here."
      />
    </PageContainer>
  );
}
