import { ArrowRight, LayoutDashboard, LogIn, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Logo } from '@/components/brand/logo';
import { buttonClasses } from '@/components/ui';
import { useSession } from '@/features/auth/session/use-session';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';

const NAV = [
  { to: paths.features, label: 'Product' },
  { to: paths.publicIntegrations, label: 'Integrations' },
  { to: paths.security, label: 'Security' },
];

/**
 * The public website around the product (Part 12): header with sign in / start building,
 * footer. Signed-in visitors get "Open FlowForge" instead.
 */
export function PublicLayout({ children }: { children?: ReactNode }) {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  const [open, setOpen] = useState(false);

  const actions = signedIn ? (
    <Link to={paths.home} className={buttonClasses('primary', 'sm')}>
      <LayoutDashboard className="size-4" aria-hidden />
      Open FlowForge
    </Link>
  ) : (
    <>
      <Link to={paths.login} className={buttonClasses('ghost', 'sm')}>
        <LogIn className="size-4" aria-hidden />
        Sign in
      </Link>
      <Link to={paths.register} className={buttonClasses('primary', 'sm')}>
        Start building
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </>
  );

  return (
    <div className="bg-surface flex min-h-full flex-col">
      <header className="border-line bg-surface/90 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to={paths.home} aria-label="FlowForge home">
            <Logo tone="dark" />
          </Link>
          <nav aria-label="Website" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm',
                    isActive ? 'text-primary font-medium' : 'text-muted hover:text-ink',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">{actions}</div>
          <button
            type="button"
            className="text-muted hover:text-ink ml-auto rounded p-1.5 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
        {open && (
          <div className="border-line space-y-1 border-t px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="text-ink block rounded-md px-2 py-2 text-sm"
              >
                {n.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">{actions}</div>
          </div>
        )}
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>

      <footer className="border-line bg-canvas border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm sm:px-6">
          <Logo tone="dark" />
          <nav aria-label="Footer" className="text-muted flex flex-wrap gap-4">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-ink">
                {n.label}
              </Link>
            ))}
            <Link to={paths.login} className="hover:text-ink">
              Sign in
            </Link>
          </nav>
          <p className="text-muted ml-auto">© {new Date().getFullYear()} FlowForge</p>
        </div>
      </footer>
    </div>
  );
}
