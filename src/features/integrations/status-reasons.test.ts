import type { ConnectionStatusReason } from '@/types/api';
import { statusReasonMessage } from './status-reasons';

describe('connection status reasons (Part 16, FR-16.5)', () => {
  const reasons: [ConnectionStatusReason, RegExp][] = [
    ['TOKEN_REVOKED', /revoked.*Reconnect/],
    ['TOKEN_EXPIRED', /expired.*Reconnect/],
    ['APP_UNINSTALLED', /uninstalled.*Reconnect/],
    ['PERMISSION_CHANGED', /Reconnect and grant the requested access/],
    ['WATCH_RENEWAL_FAILED', /stopped sending notifications.*Reconnect/],
    ['AUTHENTICATION_FAILED', /credentials were rejected.*Replace them/],
  ];

  it.each(reasons)('%s has a specific message and next step', (statusReason, text) => {
    expect(statusReasonMessage({ statusReason })).toMatch(text);
  });

  it('falls back to a generic message without a reason or for an unknown one', () => {
    expect(statusReasonMessage({ statusReason: null })).toMatch(/rejected FlowForge’s access/);
    expect(
      statusReasonMessage({ statusReason: 'SOMETHING_NEW' as ConnectionStatusReason }),
    ).toMatch(/rejected FlowForge’s access/);
  });
});
