import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { ProviderRow } from '../components/provider-row';

const PROVIDERS = [
  {
    key: 'GITHUB',
    name: 'GitHub',
    description: 'Start workflows from issues and repository events.',
  },
  {
    key: 'MICROSOFT',
    name: 'Microsoft To Do',
    description: 'Create tasks in a To Do list of your Microsoft account.',
  },
  { key: 'SLACK', name: 'Slack', description: 'Post messages to channels.' },
] as const;

export function IntegrationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        description="Connect the tools your workflows read from and act in. Tokens are stored encrypted and never shown here."
      />
      {/* TODO: merge with useConnections() for real statuses */}
      <ul className="divide-line border-line bg-surface divide-y rounded-lg border">
        {PROVIDERS.map((p) => (
          <ProviderRow
            key={p.key}
            name={p.name}
            description={p.description}
            status="DISCONNECTED"
          />
        ))}
      </ul>
    </PageContainer>
  );
}
