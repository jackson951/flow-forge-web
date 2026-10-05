import type { WorkflowDefinition } from '../types/workflow-definition';
import {
  asCondition,
  describeCondition,
  makeGroup,
  withOperator,
  emptyComparison,
} from './condition-model';
import {
  ancestorsOf,
  availableReferences,
  referenceProblem,
  referenceSyntaxError,
  templateReferences,
} from './references';
import { CONFIG_SCHEMAS, configErrors, measureCondition, type ConditionGroup } from './schemas';

const UUID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';
const ok = (type: string, config: unknown) => CONFIG_SCHEMAS[type].safeParse(config).success;

describe('config schemas mirror the backend (Part 06, FR-06.6)', () => {
  it('manual.trigger takes no settings', () => {
    expect(ok('manual.trigger', {})).toBe(true);
    expect(ok('manual.trigger', { anything: 1 })).toBe(false);
  });

  it('util.log needs a message of at most 1000 characters', () => {
    expect(ok('util.log', { message: 'Hi {{trigger.name}}' })).toBe(true);
    expect(ok('util.log', { message: '' })).toBe(false);
    expect(ok('util.log', { message: 'x'.repeat(1001) })).toBe(false);
    expect(configErrors('util.log', {})).toEqual({ message: 'Enter a message' });
  });

  it('github.issue.created needs a connection and owner/name', () => {
    expect(ok('github.issue.created', { connectionId: UUID, repository: 'acme/api' })).toBe(true);
    expect(ok('github.issue.created', { connectionId: UUID, repository: 'acme' })).toBe(false);
    expect(ok('github.issue.created', { connectionId: 'nope', repository: 'acme/api' })).toBe(
      false,
    );
  });

  it('Jira triggers and actions mirror the backend contract (Part 21)', () => {
    const base = { connectionId: UUID, siteId: 'cloud-123' };
    expect(ok('jira.issue.created', { ...base, projectKeys: ['ENG'] })).toBe(true);
    expect(
      ok('jira.issue.transitioned', {
        ...base,
        projectKeys: ['ENG'],
        issueTypes: ['Story'],
        fromStatus: 'To Do',
        toStatus: 'Done',
      }),
    ).toBe(true);
    expect(ok('jira.issue.created', { ...base, projectKeys: [] })).toBe(false);
    expect(ok('jira.issue.created', { ...base, projectKeys: ['eng'] })).toBe(false);

    expect(
      ok('jira.createIssue', {
        ...base,
        projectKey: 'ENG',
        issueType: '10001',
        summary: '{{ trigger.issue.summary }}',
        labels: ['flowforge'],
        customFields: { customfield_10010: true },
      }),
    ).toBe(true);
    expect(ok('jira.updateIssue', { ...base, issueKey: '{{ trigger.issue.key }}' })).toBe(false);
    expect(
      ok('jira.updateIssue', {
        ...base,
        issueKey: '{{ trigger.issue.key }}',
        summary: 'Changed',
      }),
    ).toBe(true);
    expect(ok('jira.transitionIssue', { ...base, issueKey: 'ENG-1', toStatus: 'Done' })).toBe(true);
    expect(
      ok('jira.transitionIssue', {
        ...base,
        issueKey: 'ENG-1',
        toStatus: 'Done',
        transitionId: '31',
      }),
    ).toBe(false);
    expect(ok('jira.searchIssues', { ...base, jql: 'project = ENG', maxResults: 101 })).toBe(false);
  });

  it('slack.sendMessage checks channel id, text length and rejects unknown keys', () => {
    const base = { connectionId: UUID, channelId: 'C0123456789', text: 'Hello' };
    expect(ok('slack.sendMessage', base)).toBe(true);
    expect(ok('slack.sendMessage', { ...base, allowBroadcastMentions: true })).toBe(true);
    expect(ok('slack.sendMessage', { ...base, channelId: '#general' })).toBe(false);
    expect(ok('slack.sendMessage', { ...base, text: 'x'.repeat(3001) })).toBe(false);
    expect(ok('slack.sendMessage', { ...base, token: 'x' })).toBe(false);
  });

  it('microsoft.todo.createTask: list, title ≤ 255, optional body and due date', () => {
    const base = { connectionId: UUID, listId: 'AAMkAGI2=', title: 'Follow up' };
    expect(ok('microsoft.todo.createTask', base)).toBe(true);
    expect(ok('microsoft.todo.createTask', { ...base, body: 'b', dueDate: '2026-10-31' })).toBe(
      true,
    );
    expect(ok('microsoft.todo.createTask', { ...base, title: 'x'.repeat(256) })).toBe(false);
  });

  it('ai.summarize: text (template or ref) and maxWords 20–300', () => {
    expect(ok('ai.summarize', { text: '{{trigger.issue.body}}' })).toBe(true);
    expect(ok('ai.summarize', { text: { ref: 'trigger.issue.body' }, maxWords: 20 })).toBe(true);
    expect(ok('ai.summarize', { text: 'x', maxWords: 19 })).toBe(false);
    expect(ok('ai.summarize', { text: 'x', maxWords: 301 })).toBe(false);
    expect(ok('ai.summarize', { text: 'x', maxWords: 50.5 })).toBe(false);
  });

  it('ai.classify: 2–20 labels unique ignoring case', () => {
    expect(ok('ai.classify', { text: 'x', labels: ['HIGH', 'LOW'] })).toBe(true);
    expect(ok('ai.classify', { text: 'x', labels: ['HIGH'] })).toBe(false);
    expect(ok('ai.classify', { text: 'x', labels: ['High', 'high'] })).toBe(false);
    expect(configErrors('ai.classify', { text: 'x', labels: ['High', 'high'] })).toEqual({
      labels: 'Labels must be unique',
    });
  });

  it('ai.extract: identifier names, enum values only for enums, unique names', () => {
    const field = { name: 'priority', type: 'enum', enumValues: ['P1', 'P2'] };
    expect(ok('ai.extract', { text: 'x', fields: [field] })).toBe(true);
    expect(
      ok('ai.extract', { text: 'x', fields: [{ name: 'n', type: 'string', enumValues: ['a'] }] }),
    ).toBe(false);
    expect(ok('ai.extract', { text: 'x', fields: [{ name: 'meta', type: 'string' }] })).toBe(false);
    expect(ok('ai.extract', { text: 'x', fields: [{ name: '1x', type: 'string' }] })).toBe(false);
    expect(
      ok('ai.extract', {
        text: 'x',
        fields: [
          { name: 'a', type: 'string' },
          { name: 'A', type: 'number' },
        ],
      }),
    ).toBe(false);
    expect(
      configErrors('ai.extract', { text: 'x', fields: [{ name: 'meta', type: 'string' }] }),
    ).toEqual({
      'fields.0.name': 'This name is reserved',
    });
  });

  it('conditions: grammar, unary operators, depth and size limits', () => {
    const cmp = { left: { ref: 'trigger.x' }, operator: 'equals', right: { value: 1 } };
    expect(ok('condition', { all: [cmp] })).toBe(true);
    expect(
      ok('condition', { not: { any: [cmp, { left: { ref: 'a.b' }, operator: 'exists' }] } }),
    ).toBe(true);
    expect(ok('condition', cmp)).toBe(false); // top level must be a group
    expect(ok('condition', { all: [{ ...cmp, operator: 'exists' }] })).toBe(false);
    expect(ok('condition', { all: [{ left: cmp.left, operator: 'equals' }] })).toBe(false);
    const nest = (depth: number): ConditionGroup =>
      depth === 1 ? { all: [cmp as never] } : { all: [nest(depth - 1)] };
    expect(measureCondition(nest(4)).depth).toBe(4);
    expect(ok('condition', nest(4))).toBe(true);
    expect(ok('condition', nest(5))).toBe(false);
    expect(ok('condition', { all: Array.from({ length: 21 }, () => cmp) })).toBe(false);
  });
});

// trigger → classify → cond ─true→ notify
//                         └false→ log
const def: WorkflowDefinition = {
  schemaVersion: 1,
  nodes: [
    { key: 'trigger', kind: 'TRIGGER', type: 'github.issue.created', config: {} },
    { key: 'classify', kind: 'ACTION', type: 'ai.classify', config: {} },
    { key: 'cond', kind: 'CONDITION', type: 'condition', config: {} },
    { key: 'notify', kind: 'ACTION', type: 'slack.sendMessage', config: {} },
    { key: 'log', kind: 'ACTION', type: 'util.log', config: {} },
    {
      key: 'extract',
      kind: 'ACTION',
      type: 'ai.extract',
      config: { fields: [{ name: 'owner', type: 'string' }] },
    },
  ],
  edges: [
    { from: 'trigger', to: 'classify' },
    { from: 'classify', to: 'cond' },
    { from: 'cond', to: 'notify', branch: 'true' },
    { from: 'cond', to: 'log', branch: 'false' },
    { from: 'notify', to: 'extract' },
  ],
};

describe('reference suggestions (Part 06, AC-06.3)', () => {
  it('lists ancestors only, trigger first', () => {
    expect(ancestorsOf(def, 'notify')).toEqual(['trigger', 'classify', 'cond']);
    expect(ancestorsOf(def, 'trigger')).toEqual([]);
  });

  it('offers upstream data only — never siblings, the step itself or downstream steps', () => {
    const refs = availableReferences(def, 'notify').map((r) => r.ref);
    expect(refs).toContain('trigger.issue.title');
    expect(refs).toContain('steps.classify.output.label');
    expect(refs).toContain('steps.cond.output.result');
    expect(refs.some((r) => r.startsWith('steps.log.'))).toBe(false); // sibling branch
    expect(refs.some((r) => r.startsWith('steps.notify.'))).toBe(false); // itself
    expect(refs.some((r) => r.startsWith('steps.extract.'))).toBe(false); // downstream
  });

  it('describes ai.extract outputs from its configured fields', () => {
    const later = {
      ...def,
      nodes: [
        ...def.nodes,
        { key: 'after', kind: 'ACTION' as const, type: 'util.log', config: {} },
      ],
      edges: [...def.edges, { from: 'extract', to: 'after' }],
    };
    expect(availableReferences(later, 'after').map((r) => r.ref)).toContain(
      'steps.extract.output.owner',
    );
  });

  it('a step without a parent sees nothing', () => {
    const lonely = { ...def, edges: [] };
    expect(availableReferences(lonely, 'notify')).toEqual([]);
  });

  it('flags syntax errors, unknown and non-upstream steps; warns on unknown outputs', () => {
    expect(referenceSyntaxError('steps.a.output.x')).toBeNull();
    expect(referenceSyntaxError('steps.a.x')).toMatch(/output/);
    expect(referenceSyntaxError('foo.bar')).toMatch(/trigger/);
    expect(referenceSyntaxError('trigger.__proto__')).toMatch(/not allowed/);
    expect(referenceProblem(def, 'notify', 'steps.classify.output.label')).toBeNull();
    expect(referenceProblem(def, 'notify', 'steps.ghost.output.x')?.level).toBe('error');
    expect(referenceProblem(def, 'notify', 'steps.log.output.message')?.message).toMatch(
      /does not run before/,
    );
    expect(referenceProblem(def, 'notify', 'steps.classify.output.nope')?.level).toBe('warning');
    expect(referenceProblem(def, 'notify', 'trigger.anything.goes')).toBeNull();
  });

  it('finds references in templates', () => {
    expect(templateReferences('Hi {{ trigger.issue.title }} — {{steps.a.output.b}}')).toEqual([
      'trigger.issue.title',
      'steps.a.output.b',
    ]);
  });
});

describe('condition builder model (Part 06, AC-06.4)', () => {
  it('describes a condition in plain language', () => {
    const c: ConditionGroup = {
      all: [
        {
          left: { ref: 'steps.classify.output.label' },
          operator: 'equals',
          right: { value: 'HIGH' },
        },
        {
          any: [
            {
              left: { ref: 'trigger.issue.labels' },
              operator: 'contains',
              right: { value: 'bug' },
            },
            { not: { left: { ref: 'trigger.issue.body' }, operator: 'isEmpty' } },
          ],
        },
      ],
    };
    expect(describeCondition(c)).toBe(
      'steps.classify.output.label equals "HIGH" AND (trigger.issue.labels contains "bug" OR NOT trigger.issue.body is empty)',
    );
  });

  it('switching to a unary operator drops the right operand, and back adds one', () => {
    const unary = withOperator(emptyComparison(), 'exists');
    expect(unary).toEqual({ left: { ref: '' }, operator: 'exists' });
    expect(withOperator(unary, 'contains').right).toEqual({ value: '' });
  });

  it('group type changes keep the backend shape', () => {
    const a = emptyComparison();
    expect(makeGroup('any', [a, a])).toEqual({ any: [a, a] });
    expect(makeGroup('not', [a, a])).toEqual({ not: a });
  });

  it('an empty config becomes a fresh condition; a stored one is kept as-is', () => {
    expect(asCondition({})).toEqual({ all: [emptyComparison()] });
    const stored = { any: [emptyComparison()] };
    expect(asCondition(stored)).toBe(stored);
  });
});
