import { NavLink, Outlet } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';

/** Settings layout with tabs; each tab is its own route (deep-linkable). */
export function SettingsPage() {
  const workspace = useWorkspace();
  const tabs = [
    { to: paths.settings(workspace.id), label: 'General', end: true },
    { to: paths.settingsMembers(workspace.id), label: 'Members', end: false },
  ];
  return (
    <PageContainer>
      <PageHeader title="Settings" description={`Workspace settings for ${workspace.name}.`} />
      <nav aria-label="Settings sections" className="border-line mt-6 flex gap-1 border-b">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-3 py-2 text-sm',
                isActive
                  ? 'border-primary text-primary font-medium'
                  : 'text-muted hover:text-ink border-transparent',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </PageContainer>
  );
}
