import type { NodeKind, NodeTypeInfo } from '@/types/api';

/**
 * Palette groups (Part 16, FR-16.7): built-ins first, then schedule and HTTP, then providers
 * alphabetically, AI last. A type from an unknown family goes to "Other", never disappears.
 */
export type NodeCategory =
  | 'core'
  | 'schedule'
  | 'http'
  | 'github'
  | 'gmail'
  | 'jira'
  | 'microsoft'
  | 'slack'
  | 'ai'
  | 'other';

export const CATEGORY_ORDER: NodeCategory[] = [
  'core',
  'schedule',
  'http',
  'github',
  'gmail',
  'jira',
  'microsoft',
  'slack',
  'ai',
  'other',
];

export const CATEGORY_TITLES: Record<NodeCategory, string> = {
  core: 'Core',
  schedule: 'Schedule',
  http: 'HTTP & webhooks',
  github: 'GitHub',
  gmail: 'Gmail',
  jira: 'Jira',
  microsoft: 'Microsoft',
  slack: 'Slack',
  ai: 'AI',
  other: 'Other',
};

const FAMILY: Record<string, NodeCategory> = {
  manual: 'core',
  condition: 'core',
  util: 'core',
  schedule: 'schedule',
  http: 'http',
  webhook: 'http',
  github: 'github',
  gmail: 'gmail',
  jira: 'jira',
  microsoft: 'microsoft',
  slack: 'slack',
  ai: 'ai',
};

export function nodeCategory(type: string): NodeCategory {
  return FAMILY[type.split('.', 1)[0]] ?? 'other';
}

const KIND_ORDER: Record<NodeKind, number> = { TRIGGER: 0, CONDITION: 1, ACTION: 2 };

/** Non-empty groups in palette order; inside a group triggers come first, then logic, then actions. */
export function groupNodeTypes(types: NodeTypeInfo[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    title: CATEGORY_TITLES[category],
    items: types
      .filter((t) => nodeCategory(t.type) === category)
      .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]),
  })).filter((g) => g.items.length > 0);
}
