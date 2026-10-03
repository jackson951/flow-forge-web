import { Plug } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { ProviderRow } from '../components/provider-row';

const PROVIDERS = [
  {
    key: 'GITHUB',
    name: 'GitHub',
    description: 'Start workflows when issues are opened in your repositories.',
  },
  {
    key: 'SLACK',
    name: 'Slack',
    description: 'Post messages to your channels.',
  },
  {
    key: 'MICROSOFT',
    name: 'Microsoft To Do',
    description: 'Create tasks in a To Do list of your Microsoft account.',
  },
] as const;

export function IntegrationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        icon={Plug}
        description="Connect the tools your workflows read from and act in. Tokens are stored encrypted and never shown here."
      />
      {/* Part 10: merge with useProviders() / useConnections() for real statuses */}
      <ul className="divide-line border-line bg-surface divide-y rounded-xl border">
        {PROVIDERS.map((p) => (
          <ProviderRow
            key={p.key}
            provider={p.key}
            name={p.name}
            description={p.description}
            status="DISCONNECTED"
          />
        ))}
      </ul>
    </PageContainer>
  );
}
