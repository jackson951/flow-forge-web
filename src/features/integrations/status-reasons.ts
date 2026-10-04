import type { Connection, ConnectionStatusReason } from '@/types/api';

/**
 * Why a connection needs attention and what to do (Part 16, FR-16.5). The backend sends a safe
 * reason code, never the provider's error text.
 */
const REASONS: Record<ConnectionStatusReason, string> = {
  TOKEN_REVOKED:
    'Access was revoked at the provider. Reconnect to give FlowForge access again; steps using this connection fail until then.',
  TOKEN_EXPIRED:
    'The provider’s authorisation expired and could not be renewed. Reconnect to continue; steps using this connection fail until then.',
  APP_UNINSTALLED:
    'The FlowForge app was uninstalled from the account. Reconnect (install it again) to continue.',
  PERMISSION_CHANGED:
    'FlowForge no longer has all the access it needs. Reconnect and grant the requested access.',
  WATCH_RENEWAL_FAILED:
    'The provider stopped sending notifications, so triggers on this connection do not fire. Reconnect, or ask the operator to check the push-notification setup.',
  AUTHENTICATION_FAILED:
    'The saved credentials were rejected. Replace them to continue; steps using this connection fail until then.',
};

const FALLBACK =
  'The provider rejected FlowForge’s access. Steps using this connection fail until it is reconnected.';

export function statusReasonMessage(connection: Pick<Connection, 'statusReason'>): string {
  return (connection.statusReason && REASONS[connection.statusReason]) || FALLBACK;
}
