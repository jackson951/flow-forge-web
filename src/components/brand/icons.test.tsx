import { render } from '@testing-library/react';
import { NodeTypeIcon } from './node-type-icon';
import { nodeTypeVisual } from './node-type-visual';
import { Clock, Globe, Radar, Webhook } from 'lucide-react';
import type { IntegrationProviderKey } from '@/types/api';
import {
  GitHubIcon,
  GmailIcon,
  JiraIcon,
  MicrosoftIcon,
  ProviderIcon,
  SlackIcon,
} from './provider-icons';
import { PROVIDER_NAMES } from './providers';

describe('brand icons (product rule: icons everywhere)', () => {
  it.each([
    ['github.issue.created', GitHubIcon],
    ['slack.sendMessage', SlackIcon],
    ['microsoft.todo.createTask', MicrosoftIcon],
    ['jira.issue.created', JiraIcon],
    ['jira.createIssue', JiraIcon],
    ['gmail.email.received', GmailIcon],
    ['gmail.sendEmail', GmailIcon],
  ])('%s uses the provider logo', (type, icon) => {
    expect(nodeTypeVisual(type).Icon).toBe(icon);
  });

  it('every built-in and AI node type has its own icon, distinct from the fallback', () => {
    const fallback = nodeTypeVisual('unknown.type').Icon;
    for (const type of ['manual.trigger', 'condition', 'util.log', 'ai.summarize', 'ai.classify']) {
      expect([type, nodeTypeVisual(type).Icon]).not.toEqual([type, fallback]);
    }
  });

  it('renders decorative SVGs (hidden from screen readers)', () => {
    const { container } = render(
      <>
        <ProviderIcon provider="GITHUB" />
        <ProviderIcon provider="SLACK" />
        <ProviderIcon provider="MICROSOFT" />
        <NodeTypeIcon type="slack.sendMessage" />
      </>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(4);
    svgs.forEach((svg) => expect(svg.closest('[aria-hidden]')).not.toBeNull());
  });

  it.each([
    ['schedule.trigger', Clock],
    ['http.request', Globe],
    ['http.poll', Radar],
    ['webhook.received', Webhook],
  ])('%s has its own icon (Part 16)', (type, icon) => {
    expect(nodeTypeVisual(type).Icon).toBe(icon);
  });

  it('every provider the UI can show has a name and a decorative icon (Part 16, FR-16.4)', () => {
    const keys: IntegrationProviderKey[] = [
      'GITHUB',
      'SLACK',
      'MICROSOFT',
      'JIRA',
      'GMAIL',
      'HTTP',
      'WEBHOOK',
    ];
    const { container } = render(
      <>
        {keys.map((k) => (
          <ProviderIcon key={k} provider={k} />
        ))}
      </>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(keys.length);
    for (const k of keys) expect(PROVIDER_NAMES[k]).toBeTruthy();
  });
});
