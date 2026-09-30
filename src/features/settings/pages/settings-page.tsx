import { EmptyState } from '@/components/feedback/empty-state';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';

export function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader title="Settings" description="Your profile, workspace and sessions." />
      <EmptyState
        title="Nothing to change yet"
        description="Profile and workspace settings will live here."
      />
    </PageContainer>
  );
}
