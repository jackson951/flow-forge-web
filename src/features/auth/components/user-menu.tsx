import { ChevronDown, LogOut, MonitorX, UserRound } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { paths } from '@/lib/routes';
import { useEffect, useId, useRef, useState } from 'react';
import { useLogout, useLogoutAll } from '../api/auth.api';
import { useSession } from '../session/use-session';

/** Signed-in user with sign-out actions (Part 02, FR-02.7). */
export function UserMenu() {
  const { user } = useSession();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const logout = useLogout();
  const logoutAll = useLogoutAll();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !ref.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!user) return null;
  const busy = logout.isPending || logoutAll.isPending;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-canvas flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
      >
        <span className="bg-primary flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block font-medium">{user.name}</span>
          <span className="text-muted block text-xs">{user.email}</span>
        </span>
        <ChevronDown className="text-muted size-4" aria-hidden />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="border-line bg-surface absolute right-0 z-50 mt-1 w-56 rounded-md border py-1 shadow-lg"
        >
          {workspaceId && (
            <Link
              role="menuitem"
              to={paths.settingsAccount(workspaceId)}
              onClick={() => setOpen(false)}
              className="hover:bg-canvas flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
            >
              <UserRound className="size-4" aria-hidden />
              Account settings
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => logout.mutate()}
            className="hover:bg-canvas flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => logoutAll.mutate()}
            className="hover:bg-canvas flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
          >
            <MonitorX className="size-4" aria-hidden />
            Sign out of all devices
          </button>
          {logoutAll.isError && (
            <p role="alert" className="text-status-failed px-3 py-2 text-xs">
              Could not sign out everywhere. Try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
