import { Button } from '@/components/ui';
import type { ConnectionStatus } from '@/types/api';

const statusText: Record<ConnectionStatus, { label: string; className: string }> = {
  CONNECTED: { label: 'Connected', className: 'text-status-succeeded' },
  NEEDS_ATTENTION: { label: 'Needs attention', className: 'text-ember-deep' },
  DISCONNECTED: { label: 'Not connected', className: 'text-muted' },
};

interface ProviderRowProps {
  name: string;
  description: string;
  status: ConnectionStatus;
}

export function ProviderRow({ name, description, status }: ProviderRowProps) {
  const s = statusText[status];
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1 basis-full sm:basis-0">
        <p className="font-medium">{name}</p>
        <p className="text-muted text-sm">{description}</p>
      </div>
      <span className={`text-sm font-medium ${s.className}`}>{s.label}</span>
      {/* TODO: connect → redirect to OAuth URL; disconnect → confirm */}
      <Button variant="secondary" size="sm">
        {status === 'DISCONNECTED' ? 'Connect' : 'Manage'}
      </Button>
    </li>
  );
}
