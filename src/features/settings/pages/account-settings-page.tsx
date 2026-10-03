import { CalendarDays, Info, LogOut, Mail, MonitorX, UserRound } from 'lucide-react';
import { Button, Panel } from '@/components/ui';
import { useLogout, useLogoutAll } from '@/features/auth/api/auth.api';
import { useSession } from '@/features/auth/session/use-session';
import { formatDateTime } from '@/lib/format';

/**
 * The signed-in user's account (Part 11, FR-11.1). The backend has no endpoint to change the
 * name, email or password yet, so they are shown as text — never as inputs that cannot save.
 */
export function AccountSettingsPage() {
  const { user } = useSession();
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  if (!user) return null;
  const busy = logout.isPending || logoutAll.isPending;

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">
          <UserRound className="text-muted size-4" aria-hidden />
          Your account
        </h2>
        <div className="mt-4 flex items-center gap-4">
          <span
            className="bg-primary flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
            aria-hidden
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted flex items-center gap-1.5">
              <UserRound className="size-3.5" aria-hidden />
              Name
            </dt>
            <dd className="font-medium">{user.name}</dd>
            <dt className="text-muted flex items-center gap-1.5">
              <Mail className="size-3.5" aria-hidden />
              Email
            </dt>
            <dd>{user.email}</dd>
            <dt className="text-muted flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              Member since
            </dt>
            <dd>{formatDateTime(user.createdAt)}</dd>
          </dl>
        </div>
        <p className="text-muted mt-4 flex items-start gap-1.5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Changing your name, email or password is not available yet.
        </p>
      </Panel>

      <Panel className="p-6">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">
          <MonitorX className="text-muted size-4" aria-hidden />
          Sessions
        </h2>
        <div className="divide-line mt-2 divide-y">
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Sign out on this device</p>
              <p className="text-muted text-sm">Other browsers and devices stay signed in.</p>
            </div>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => logout.mutate()}>
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Sign out of all devices</p>
              <p className="text-muted text-sm">
                Ends every session, including this one — useful if you used a shared or lost device.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => logoutAll.mutate()}
            >
              <MonitorX className="size-4" aria-hidden />
              Sign out everywhere
            </Button>
          </div>
        </div>
        {logoutAll.isError && (
          <p role="alert" className="text-status-failed mt-2 text-sm">
            Could not sign out everywhere. Try again.
          </p>
        )}
      </Panel>
    </div>
  );
}
