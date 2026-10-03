import { Activity, History } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export function RunsListPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Runs"
        icon={Activity}
        description="Every time a workflow ran, what happened at each step and how long it took."
      />
      {/* Part 08: filters bound to URL search params + table from useRuns() */}
      <EmptyState
        icon={History}
        title="No runs yet"
        description="Runs appear here as soon as a published workflow is triggered."
      />
    </PageContainer>
  );
}
