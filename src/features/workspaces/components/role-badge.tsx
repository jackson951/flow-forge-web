import { Crown, ShieldCheck, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { WorkspaceRole } from '@/types/api';
import { ROLE_LABEL } from '../policy';

const ROLE_ICON: Record<WorkspaceRole, LucideIcon> = {
  OWNER: Crown,
  ADMIN: ShieldCheck,
  MEMBER: User,
};

/** Role with its icon (crown / shield / person); the text stays for screen readers. */
export function RoleBadge({ role, className }: { role: WorkspaceRole; className?: string }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {ROLE_LABEL[role]}
    </span>
  );
}
