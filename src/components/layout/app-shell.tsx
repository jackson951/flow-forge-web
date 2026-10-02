import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router';
import { UserMenu } from '@/features/auth/components/user-menu';
import { Sidebar } from './sidebar';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-full">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line bg-surface flex h-16 items-center gap-3 border-b px-4 lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
