import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { ErrorState } from '@/components/feedback/error-state';
import { Button, Dialog, Field, Input, Panel, Select, Skeleton } from '@/components/ui';
import { useSession } from '@/features/auth/session/use-session';
import {
  useAddMember,
  useChangeRole,
  useMembers,
  useRemoveMember,
} from '@/features/workspaces/api/workspaces.api';
import { RoleBadge } from '@/features/workspaces/components/role-badge';
import { useWorkspace } from '@/features/workspaces/hooks/use-current-workspace';
import { policy, ROLE_LABEL, ROLES, type MemberRef } from '@/features/workspaces/policy';
import { isApiError, isNotFound } from '@/lib/api-client';
import { paths } from '@/lib/routes';
import type { Member, WorkspaceRole } from '@/types/api';

/** Backend messages, made actionable where the UI knows more. */
function memberError(error: unknown): string | null {
  if (!error) return null;
  if (isNotFound(error) && error.message === 'User not found') {
    return 'No FlowForge account uses this email. Ask them to register first, then add them.';
  }
  if (isApiError(error) && error.status === 403) {
    return `You do not have permission for that. ${error.message}`;
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function MembersPage() {
  const workspace = useWorkspace();
  const { user } = useSession();
  const members = useMembers(workspace.id);
  const [adding, setAdding] = useState(false);
  const canAdd = policy.assignableRoles(workspace.role).length > 0;
  const me: MemberRef | null = user ? { userId: user.id, role: workspace.role } : null;

  return (
    <Panel className="p-0">
      <div className="border-line flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h2 className="text-base font-semibold">Members</h2>
          <p className="text-muted text-sm">People with access to {workspace.name}.</p>
        </div>
        {canAdd && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="size-4" aria-hidden />
            Add member
          </Button>
        )}
      </div>

      {members.isPending && (
        <div className="space-y-3 p-6" aria-label="Loading members">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}
      {members.isError && (
        <div className="p-6">
          <ErrorState error={members.error} onRetry={() => void members.refetch()} />
        </div>
      )}
      {members.isSuccess && me && (
        <table className="w-full text-sm">
          <thead className="text-muted text-left text-xs">
            <tr>
              <th scope="col" className="px-6 py-2 font-medium">
                Name
              </th>
              <th scope="col" className="px-6 py-2 font-medium">
                Role
              </th>
              <th scope="col" className="hidden px-6 py-2 font-medium md:table-cell">
                Joined
              </th>
              <th scope="col" className="px-6 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {members.data.map((member) => (
              <MemberRow key={member.userId} member={member} me={me} />
            ))}
          </tbody>
        </table>
      )}

      <AddMemberDialog open={adding} onClose={() => setAdding(false)} />
    </Panel>
  );
}

function MemberRow({ member, me }: { member: Member; me: MemberRef }) {
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const change = useChangeRole(workspace.id);
  const remove = useRemoveMember(workspace.id, me.userId);
  const [confirming, setConfirming] = useState(false);
  const target: MemberRef = { userId: member.userId, role: member.role };
  const isSelf = member.userId === me.userId;
  // Roles this row may be changed to; the current role is always listed.
  const options = ROLES.filter(
    (role) => role === member.role || policy.canChangeRole(me, target, role),
  );
  const canChange = options.length > 1;
  const canRemove = policy.canRemove(me, target);
  const error = memberError(change.error ?? remove.error);

  return (
    <tr>
      <td className="px-6 py-3">
        <p className="font-medium">
          {member.name} {isSelf && <span className="text-muted font-normal">(you)</span>}
        </p>
        <p className="text-muted text-xs">{member.email}</p>
        {error && (
          <p role="alert" className="text-status-failed mt-1 text-xs">
            {error}
          </p>
        )}
      </td>
      <td className="px-6 py-3">
        {canChange ? (
          <Select
            aria-label={`Role of ${member.name}`}
            value={member.role}
            disabled={change.isPending}
            onChange={(e) =>
              change.mutate({ userId: member.userId, role: e.target.value as WorkspaceRole })
            }
            className="h-8 w-32"
          >
            {options.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </Select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </td>
      <td className="text-muted hidden px-6 py-3 md:table-cell">
        {new Date(member.joinedAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-3 text-right">
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            {isSelf ? 'Leave' : 'Remove'}
          </Button>
        )}
        <Dialog
          open={confirming}
          onClose={() => setConfirming(false)}
          title={isSelf ? `Leave ${workspace.name}?` : `Remove ${member.name}?`}
          description={
            isSelf
              ? 'You will lose access until an admin adds you again.'
              : `${member.name} loses access to this workspace's workflows, runs and integrations.`
          }
        >
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(member.userId, {
                  onSuccess: () =>
                    isSelf ? navigate(paths.home, { replace: true }) : setConfirming(false),
                  onError: () => setConfirming(false),
                })
              }
            >
              {isSelf ? 'Leave workspace' : 'Remove member'}
            </Button>
          </div>
        </Dialog>
      </td>
    </tr>
  );
}

const addMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter an email address')
    .max(254, 'At most 254 characters')
    .email('Enter a valid email address'),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});
type AddMemberInput = z.infer<typeof addMemberSchema>;

function AddMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const workspace = useWorkspace();
  const add = useAddMember(workspace.id);
  const roles = policy.assignableRoles(workspace.role);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: '', role: 'MEMBER' },
  });
  const close = () => {
    reset();
    add.reset();
    onClose();
  };
  const onSubmit = handleSubmit((values) => add.mutate(values, { onSuccess: close }));

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add a member"
      description="They need a FlowForge account already. They will see this workspace next time they open FlowForge."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field id="member-email" label="Email" error={errors.email?.message}>
          <Input
            id="member-email"
            type="email"
            autoComplete="off"
            aria-invalid={!!errors.email}
            aria-describedby="member-email-msg"
            {...register('email')}
          />
        </Field>
        <Field id="member-role" label="Role">
          <Select id="member-role" {...register('role')}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </Select>
        </Field>
        {add.error && (
          <p role="alert" className="text-status-failed text-sm">
            {memberError(add.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={add.isPending}>
            {add.isPending ? 'Adding…' : 'Add member'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
