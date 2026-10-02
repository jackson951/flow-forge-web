import type { EndReason } from '../session/session';

const NOTICES: Record<EndReason, string> = {
  logout: 'You are signed out.',
  expired: 'Your session has ended. Sign in again to continue.',
  'other-tab': 'You signed out in another tab.',
};

/** Explains why the user is on the login page after a session ended. */
export function SessionNotice({ reason }: { reason: EndReason | null }) {
  if (!reason) return null;
  return (
    <p role="status" className="border-line bg-canvas mt-6 rounded-md border px-3 py-2 text-sm">
      {NOTICES[reason]}
    </p>
  );
}
