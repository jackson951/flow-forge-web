import { Activity, LayoutDashboard, Plug, Settings, Workflow, X } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/workflows', label: 'Workflows', icon: Workflow },
  { to: '/runs', label: 'Runs', icon: Activity },
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div aria-hidden className="bg-ink/40 fixed inset-0 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'bg-ink fixed inset-y-0 left-0 z-40 flex w-60 flex-col text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <span className="text-lg font-semibold tracking-tight">
            Flow<span className="text-ember">Forge</span>
          </span>
          <button className="lg:hidden" onClick={onClose} aria-label="Close navigation">
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-0.5 px-3 py-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm',
                  isActive
                    ? 'border-ember bg-ink-soft font-medium text-white'
                    : 'hover:bg-ink-soft border-transparent text-white/70 hover:text-white',
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
