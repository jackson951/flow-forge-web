import type { WorkspaceRole } from '@/types/api';

/**
 * Role rules for the UI, mirroring the backend's WorkspacePolicy
 * (flowforge-api/src/modules/workspaces/workspace-policy.ts) so controls the caller cannot use
 * are hidden or disabled. The backend stays the authority; its errors are still handled.
 *
 * - MEMBER: may only leave.
 * - ADMIN: may add, re-role and remove non-owners, never grant or touch OWNER; rename the
 *   workspace; manage workflows, integrations and runs (route-level @RequireRole('ADMIN')).
 * - OWNER: everything, including deleting the workspace.
 * The "at least one OWNER" rule needs a count and is enforced by the backend (409).
 */
const RANK: Record<WorkspaceRole, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };

export const ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER'];

export interface MemberRef {
  userId: string;
  role: WorkspaceRole;
}

export const hasRole = (actual: WorkspaceRole, required: WorkspaceRole): boolean =>
  RANK[actual] >= RANK[required];

export const policy = {
  canRename: (role: WorkspaceRole) => hasRole(role, 'ADMIN'),
  canDelete: (role: WorkspaceRole) => hasRole(role, 'OWNER'),
  /** Workflows, integrations, run retry/cancel (ADMIN routes on the backend). */
  canManage: (role: WorkspaceRole) => hasRole(role, 'ADMIN'),

  canAdd(actor: WorkspaceRole, newRole: WorkspaceRole): boolean {
    if (!hasRole(actor, 'ADMIN')) return false;
    return newRole !== 'OWNER' || hasRole(actor, 'OWNER');
  },

  canChangeRole(actor: MemberRef, target: MemberRef, newRole: WorkspaceRole): boolean {
    if (!hasRole(actor.role, 'ADMIN')) return false;
    if (target.role === 'OWNER' || newRole === 'OWNER') return hasRole(actor.role, 'OWNER');
    return true;
  },

  canRemove(actor: MemberRef, target: MemberRef): boolean {
    if (actor.userId === target.userId) return true; // anyone may leave
    if (!hasRole(actor.role, 'ADMIN')) return false;
    return target.role !== 'OWNER' || hasRole(actor.role, 'OWNER');
  },

  /** Roles the actor may give when adding a member. */
  assignableRoles: (actor: WorkspaceRole): WorkspaceRole[] =>
    ROLES.filter((role) => policy.canAdd(actor, role)),
};

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
};
