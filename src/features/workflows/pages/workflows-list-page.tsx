import { Plus } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui';

export function WorkflowsListPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Workflows"
        description="Each workflow starts from one trigger and runs its steps in order."
        actions={
          <Button>
            <Plus className="size-4" aria-hidden />
            New workflow
          </Button>
        }
      />
      {/* TODO: table (name, status, last run, updated) from useWorkflows() */}
      <EmptyState
        title="No workflows yet"
        description="Start with a trigger, like a new GitHub issue, then add the steps that should follow."
      />
    </PageContainer>
  );
}
