import { LayoutDashboard, Workflow } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonClasses } from '@/components/ui';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { paths } from '@/lib/routes';

export function DashboardPage() {
  const workspace = useWorkspace();
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        icon={LayoutDashboard}
        description="How your workflows are running across this workspace."
      />
      {/* Part 09: run health, top failing workflows and recent failures from useDashboard() */}
      <EmptyState
        icon={Workflow}
        title="No workflows yet"
        description="Create a workflow to start automating. Runs and failures will show up here once it’s published and triggered."
        action={
          <Link to={paths.workflows(workspace.id)} className={buttonClasses()}>
            <Workflow className="size-4" aria-hidden />
            Go to workflows
          </Link>
        }
      />
    </PageContainer>
  );
}
