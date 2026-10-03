import type { WorkspaceRole } from '@/types/api';
import { hasRole, policy, ROLES, type MemberRef } from './policy';

/** Same cases as the backend's workspace-policy.spec.ts, so UI and API agree. */
const as = (role: WorkspaceRole, userId = `actor-${role}`): MemberRef => ({ userId, role });
const target = (role: WorkspaceRole): MemberRef => ({ userId: `target-${role}`, role });

describe('workspace policy (mirrors the backend)', () => {
  it.each([
    ['OWNER', 'OWNER', true],
    ['OWNER', 'MEMBER', true],
    ['ADMIN', 'ADMIN', true],
    ['ADMIN', 'OWNER', false],
    ['MEMBER', 'MEMBER', true],
    ['MEMBER', 'ADMIN', false],
  ] as const)('hasRole(%s, %s) = %s', (actual, required, expected) => {
    expect(hasRole(actual, required)).toBe(expected);
  });

  it.each([
    ['OWNER', 'OWNER', true],
    ['OWNER', 'ADMIN', true],
    ['ADMIN', 'ADMIN', true],
    ['ADMIN', 'MEMBER', true],
    ['ADMIN', 'OWNER', false],
    ['MEMBER', 'MEMBER', false],
  ] as const)('%s adding a %s → %s', (actor, newRole, allowed) => {
    expect(policy.canAdd(actor, newRole)).toBe(allowed);
  });

  it.each([
    ['OWNER', 'OWNER', 'ADMIN', true],
    ['OWNER', 'MEMBER', 'OWNER', true],
    ['ADMIN', 'MEMBER', 'ADMIN', true],
    ['ADMIN', 'ADMIN', 'MEMBER', true],
    ['ADMIN', 'MEMBER', 'OWNER', false],
    ['ADMIN', 'OWNER', 'ADMIN', false],
    ['MEMBER', 'MEMBER', 'ADMIN', false],
  ] as const)('%s changing a %s to %s → %s', (actor, current, next, allowed) => {
    expect(policy.canChangeRole(as(actor), target(current), next)).toBe(allowed);
  });

  it('an ADMIN cannot promote themselves to OWNER', () => {
    const self = as('ADMIN', 'same');
    expect(policy.canChangeRole(self, self, 'OWNER')).toBe(false);
  });

  it.each([
    ['OWNER', 'OWNER', true],
    ['OWNER', 'MEMBER', true],
    ['ADMIN', 'MEMBER', true],
    ['ADMIN', 'ADMIN', true],
    ['ADMIN', 'OWNER', false],
    ['MEMBER', 'MEMBER', false],
  ] as const)('%s removing a %s → %s', (actor, targetRole, allowed) => {
    expect(policy.canRemove(as(actor), target(targetRole))).toBe(allowed);
  });

  it.each(ROLES)('a %s may always leave', (role) => {
    const self = as(role, 'same');
    expect(policy.canRemove(self, self)).toBe(true);
  });

  it('workspace-level actions', () => {
    expect([policy.canRename('MEMBER'), policy.canRename('ADMIN')]).toEqual([false, true]);
    expect([policy.canDelete('ADMIN'), policy.canDelete('OWNER')]).toEqual([false, true]);
    expect(policy.assignableRoles('ADMIN')).toEqual(['ADMIN', 'MEMBER']);
    expect(policy.assignableRoles('OWNER')).toEqual(['OWNER', 'ADMIN', 'MEMBER']);
    expect(policy.assignableRoles('MEMBER')).toEqual([]);
  });
});
