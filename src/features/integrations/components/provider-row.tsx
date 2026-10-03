import { CircleAlert, CircleCheckBig, CircleDashed, Plug, type LucideIcon } from 'lucide-react';
import { ProviderIcon } from '@/components/brand/provider-icons';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ConnectionStatus, IntegrationProviderKey } from '@/types/api';

const STATUS: Record<ConnectionStatus, { label: string; icon: LucideIcon; className: string }> = {
  CONNECTED: { label: 'Connected', icon: CircleCheckBig, className: 'text-status-succeeded' },
  NEEDS_ATTENTION: {
    label: 'Needs attention',
    icon: CircleAlert,
    className: 'text-status-warning',
  },
  DISCONNECTED: { label: 'Not connected', icon: CircleDashed, className: 'text-muted' },
};

interface ProviderRowProps {
  provider: IntegrationProviderKey;
  name: string;
  description: string;
  status: ConnectionStatus;
}

export function ProviderRow({ provider, name, description, status }: ProviderRowProps) {
  const s = STATUS[status];
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <span className="border-line bg-surface flex size-11 shrink-0 items-center justify-center rounded-xl border">
        <ProviderIcon provider={provider} className="size-6" />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-medium">{name}</p>
        <p className="text-muted text-sm">{description}</p>
      </div>
      <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', s.className)}>
        <s.icon className="size-4" aria-hidden />
        {s.label}
      </span>
      {/* Part 10: connect → provider URL; manage/disconnect */}
      <Button variant="secondary" size="sm">
        <Plug className="size-4" aria-hidden />
        {status === 'DISCONNECTED' ? 'Connect' : 'Manage'}
      </Button>
    </li>
  );
}
