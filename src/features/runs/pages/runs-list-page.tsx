import { EmptyState } from '@/components/feedback/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export function RunsListPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Runs"
        description="Every time a workflow ran, what happened at each step and how long it took."
      />
      {/* TODO: filters (workflow, status, date) bound to URL search params + table from useRuns() */}
      <EmptyState
        title="No runs yet"
        description="Runs appear here as soon as a published workflow is triggered."
      />
    </PageContainer>
  );
}
