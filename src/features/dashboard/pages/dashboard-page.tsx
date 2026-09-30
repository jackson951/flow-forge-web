import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonClasses } from '@/components/ui';

export function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="How your workflows are running across this workspace."
      />
      {/* TODO: metrics strip, recent runs and recent failures from useDashboardSummary() */}
      <EmptyState
        title="No workflows yet"
        description="Create a workflow to start automating. Runs and failures will show up here once it’s published and triggered."
        action={
          <Link to="/workflows" className={buttonClasses()}>
            Go to workflows
          </Link>
        }
      />
    </PageContainer>
  );
}
