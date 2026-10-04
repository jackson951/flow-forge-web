import type { NodeTypeInfo } from '@/types/api';
import { groupNodeTypes, nodeCategory } from './node-categories';
import { NODE_CATALOG } from './node-catalog';

const t = (type: string, kind: NodeTypeInfo['kind']): NodeTypeInfo => ({
  type,
  kind,
  displayName: type,
});

describe('palette categories (Part 16, FR-16.7)', () => {
  it('groups built-ins, schedule, HTTP, providers alphabetically and AI last', () => {
    const groups = groupNodeTypes([
      t('ai.summarize', 'ACTION'),
      t('slack.sendMessage', 'ACTION'),
      t('jira.createIssue', 'ACTION'),
      t('gmail.sendEmail', 'ACTION'),
      t('http.request', 'ACTION'),
      t('webhook.received', 'TRIGGER'),
      t('schedule.trigger', 'TRIGGER'),
      t('util.log', 'ACTION'),
      t('github.issue.created', 'TRIGGER'),
      t('microsoft.todo.createTask', 'ACTION'),
    ]);
    expect(groups.map((g) => g.title)).toEqual([
      'Core',
      'Schedule',
      'HTTP & webhooks',
      'GitHub',
      'Gmail',
      'Jira',
      'Microsoft',
      'Slack',
      'AI',
    ]);
  });

  it('puts triggers first, then logic, then actions inside a group', () => {
    const [core] = groupNodeTypes([
      t('util.log', 'ACTION'),
      t('condition', 'CONDITION'),
      t('manual.trigger', 'TRIGGER'),
    ]);
    expect(core.items.map((i) => i.type)).toEqual(['manual.trigger', 'condition', 'util.log']);
  });

  it('keeps a type from an unknown family visible under Other', () => {
    expect(nodeCategory('teams.post')).toBe('other');
    expect(groupNodeTypes([t('teams.post', 'ACTION')])[0].title).toBe('Other');
  });

  it('every catalogued node type belongs to a known category', () => {
    for (const entry of NODE_CATALOG)
      expect([entry.type, nodeCategory(entry.type)]).not.toEqual([entry.type, 'other']);
  });
});
