import { Activity, LayoutDashboard, Plug, Settings, Workflow, X } from 'lucide-react';
import { NavLink } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';

/** Links stay inside the workspace being viewed. Only sections backed by the API. */
const navFor = (ws: string) => [
  { to: paths.workspace(ws), label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: paths.workflows(ws), label: 'Workflows', icon: Workflow },
  { to: paths.runs(ws), label: 'Runs', icon: Activity },
  { to: paths.integrations(ws), label: 'Integrations', icon: Plug },
  { to: paths.settings(ws), label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const nav = navFor(useWorkspaceId());
  return (
    <>
      {open && (
        <div aria-hidden className="bg-sidebar/50 fixed inset-0 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'bg-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button
            className="text-sidebar-text hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-soft font-medium text-white'
                    : 'text-sidebar-text hover:bg-sidebar-soft hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('size-4', isActive ? 'text-primary-light' : '')}
                    aria-hidden
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-sidebar-soft border-t p-3">
          <WorkspaceSwitcher onNavigate={onClose} />
        </div>
      </aside>
    </>
  );
}
