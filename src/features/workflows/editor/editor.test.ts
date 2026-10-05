import type { WorkflowDefinition } from '../types/workflow-definition';
import {
  editorReducer,
  initialEditorState,
  isDirty,
  type EditorAction,
  type EditorState,
} from './editor-reducer';
import { canConnect } from './graph-rules';
import { generateKey, keyProblem } from './keys';
import { autoLayout, LAYOUT } from './layout';
import { edgeId, toDefinition, toFlow } from './mapping';

/** A backend-shaped definition: trigger → condition → (true) slack / (false) log. */
const branching: WorkflowDefinition = {
  schemaVersion: 1,
  nodes: [
    {
      key: 'trigger',
      kind: 'TRIGGER',
      type: 'github.issue.created',
      config: { connectionId: 'c1', repository: 'acme/api' },
      position: { x: 0, y: 0 },
    },
    {
      key: 'is_high',
      kind: 'CONDITION',
      type: 'condition',
      config: {
        all: [
          {
            left: { ref: 'trigger.issue.title' },
            operator: 'contains',
            right: { value: 'urgent' },
          },
        ],
      },
      position: { x: 0, y: 140 },
    },
    {
      key: 'notify',
      kind: 'ACTION',
      type: 'slack.sendMessage',
      config: { connectionId: 'c2', channelId: 'C0123', text: 'New: {{trigger.issue.title}}' },
      position: { x: -150, y: 280 },
    },
    {
      key: 'log',
      kind: 'ACTION',
      type: 'util.log',
      config: { message: 'low priority' },
      position: { x: 150, y: 280 },
    },
  ],
  edges: [
    { from: 'trigger', to: 'is_high' },
    { from: 'is_high', to: 'notify', branch: 'true' },
    { from: 'is_high', to: 'log', branch: 'false' },
  ],
};

const run = (def: WorkflowDefinition, ...actions: EditorAction[]) =>
  actions.reduce(editorReducer, initialEditorState(def));

describe('definition ↔ canvas mapping (AC-05.1)', () => {
  it('round-trips a backend definition without any change', () => {
    const { nodes, edges } = toFlow(branching);
    expect(toDefinition(nodes, edges)).toEqual(branching);
    expect(JSON.stringify(toDefinition(nodes, edges))).toBe(JSON.stringify(branching));
  });

  it('maps condition branches to source handles and edge labels', () => {
    const { edges } = toFlow(branching);
    expect(edges.find((e) => e.id === 'is_high->notify')).toMatchObject({
      source: 'is_high',
      target: 'notify',
      sourceHandle: 'true',
      label: 'true',
    });
    expect(edges.find((e) => e.id === 'trigger->is_high')?.sourceHandle).toBeNull();
  });

  it('lays out nodes without positions for display only — the definition is untouched', () => {
    const noPositions: WorkflowDefinition = {
      ...branching,
      nodes: branching.nodes.map(({ position: _p, ...n }) => n),
    };
    const { nodes } = toFlow(noPositions);
    expect(nodes.find((n) => n.id === 'trigger')?.position).toEqual({ x: 0, y: 0 });
    expect(nodes.find((n) => n.id === 'notify')!.position.y).toBeGreaterThan(
      nodes.find((n) => n.id === 'is_high')!.position.y,
    );
    // Loading and saving without edits keeps the stored definition exactly.
    expect(run(noPositions).definition).toBe(noPositions);
  });

  it('read-only canvases cannot be dragged, connected or deleted', () => {
    const { nodes, edges } = toFlow(branching, { readOnly: true });
    expect(
      nodes.every((n) => n.draggable === false && n.connectable === false && n.deletable === false),
    ).toBe(true);
    expect(edges.every((e) => e.deletable === false)).toBe(true);
  });

  it('expands legacy tight positions for display without reducing authored gaps', () => {
    const { nodes } = toFlow(branching, { spacious: true });
    const position = (key: string) => nodes.find((node) => node.id === key)!.position;
    expect(position('is_high').y - position('trigger').y).toBe(260);
    expect(position('notify').y - position('is_high').y).toBe(260);
    expect(position('log').x - position('notify').x).toBeGreaterThanOrEqual(380);
    expect(branching.nodes.find((node) => node.key === 'is_high')!.position).toEqual({
      x: 0,
      y: 140,
    });

    const generous: WorkflowDefinition = {
      ...branching,
      nodes: branching.nodes.map((node, index) => ({
        ...node,
        position: { x: node.position!.x * 3, y: index * 500 },
      })),
    };
    const spread = toFlow(generous, { spacious: true }).nodes;
    expect(spread.map((node) => node.position)).toEqual(
      generous.nodes.map((node) => node.position),
    );
  });
});

describe('connection rules — same as the backend (AC-05.3)', () => {
  const base: WorkflowDefinition = {
    schemaVersion: 1,
    nodes: [
      { key: 't', kind: 'TRIGGER', type: 'manual.trigger', config: {} },
      { key: 'c', kind: 'CONDITION', type: 'condition', config: {} },
      { key: 'a', kind: 'ACTION', type: 'util.log', config: {} },
      { key: 'b', kind: 'ACTION', type: 'util.log', config: {} },
    ],
    edges: [{ from: 't', to: 'c' }],
  };

  it.each([
    ['self-loop', 'a', 'a', undefined, /itself/],
    ['into the trigger', 'a', 't', undefined, /into the trigger/],
    ['duplicate', 't', 'c', undefined, /already connected/],
    ['second incoming (join)', 'a', 'c', undefined, /only follow one/],
    ['condition without a branch', 'c', 'a', undefined, /true” or “false/],
  ])('refuses %s', (_name, from, to, branch, reason) => {
    const result = canConnect(base, from, to, branch);
    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? '' : result.reason).toMatch(reason);
  });

  it('allows one "true" and one "false" edge per condition', () => {
    const withTrue = {
      ...base,
      edges: [...base.edges, { from: 'c', to: 'a', branch: 'true' as const }],
    };
    expect(canConnect(base, 'c', 'a', 'true')).toEqual({
      ok: true,
      edge: { from: 'c', to: 'a', branch: 'true' },
    });
    expect(canConnect(withTrue, 'c', 'b', 'true')).toMatchObject({ ok: false });
    expect(canConnect(withTrue, 'c', 'b', 'false')).toEqual({
      ok: true,
      edge: { from: 'c', to: 'b', branch: 'false' },
    });
  });

  it('refuses a loop and allows fan-out from an action', () => {
    const chain = {
      ...base,
      edges: [
        ...base.edges,
        { from: 'c', to: 'a', branch: 'true' as const },
        { from: 'a', to: 'b' },
      ],
    };
    expect(canConnect({ ...chain, edges: [{ from: 'a', to: 'b' }] }, 'b', 'a')).toMatchObject({
      ok: false,
    });
    const fan = {
      ...base,
      nodes: [...base.nodes, { key: 'd', kind: 'ACTION' as const, type: 'util.log', config: {} }],
      edges: [...chain.edges],
    };
    expect(canConnect(fan, 'a', 'd')).toEqual({ ok: true, edge: { from: 'a', to: 'd' } });
  });

  it('never puts a branch on edges from non-conditions', () => {
    // A stray handle id from a non-condition is dropped: the backend forbids branches there.
    expect(canConnect(base, 't', 'a', 'true')).toEqual({ ok: true, edge: { from: 't', to: 'a' } });
  });
});

describe('keys', () => {
  it('derives readable unique keys matching the backend pattern', () => {
    expect(generateKey('slack.sendMessage', [])).toBe('slack_send_message');
    expect(generateKey('slack.sendMessage', ['slack_send_message'])).toBe('slack_send_message_2');
    expect(generateKey('slack.sendMessage', ['slack_send_message', 'slack_send_message_2'])).toBe(
      'slack_send_message_3',
    );
    expect(generateKey('microsoft.todo.createTask', [])).toBe('microsoft_todo_create_task');
    expect(generateKey('ai.classify', [])).toMatch(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/);
  });

  it('explains invalid or taken keys', () => {
    expect(keyProblem('1abc', [])).toMatch(/Start with a letter/);
    expect(keyProblem('has-dash', [])).toMatch(/letters, digits/);
    expect(keyProblem('a'.repeat(65), [])).toMatch(/at most 64/);
    expect(keyProblem('notify', ['notify'])).toMatch(/already uses/);
    expect(keyProblem('notify_2', ['notify'])).toBeNull();
  });
});

describe('autoLayout', () => {
  it('puts children below their parent and siblings side by side', () => {
    const pos = autoLayout(branching);
    expect(pos.get('trigger')!.y).toBeLessThan(pos.get('is_high')!.y);
    expect(pos.get('notify')!.y).toBe(pos.get('log')!.y);
    expect(pos.get('notify')!.x).not.toBe(pos.get('log')!.x);
  });
});

describe('editor reducer (AC-05.5)', () => {
  const empty: WorkflowDefinition = { schemaVersion: 1, nodes: [], edges: [] };

  it('adds nodes with generated keys, below the previous one', () => {
    const s = run(
      empty,
      { type: 'addNode', nodeType: 'manual.trigger', kind: 'TRIGGER' },
      { type: 'addNode', nodeType: 'util.log', kind: 'ACTION', after: 'manual_trigger' },
    );
    expect(s.definition.nodes.map((n) => n.key)).toEqual(['manual_trigger', 'util_log']);
    expect(s.definition.nodes[1].position!.y).toBeGreaterThan(s.definition.nodes[0].position!.y);
    expect(isDirty(s)).toBe(true);
  });

  it('adding after a step connects it; after a condition it takes the free branches in turn', () => {
    const s = run(
      {
        schemaVersion: 1,
        nodes: [
          { key: 'c', kind: 'CONDITION', type: 'condition', config: {}, position: { x: 0, y: 0 } },
        ],
        edges: [],
      },
      { type: 'addNode', nodeType: 'util.log', kind: 'ACTION', after: 'c' },
      { type: 'addNode', nodeType: 'util.log', kind: 'ACTION', after: 'c' },
      { type: 'addNode', nodeType: 'util.log', kind: 'ACTION', after: 'c' },
    );
    expect(s.definition.edges).toEqual([
      { from: 'c', to: 'util_log', branch: 'true' },
      { from: 'c', to: 'util_log_2', branch: 'false' },
    ]);
    expect(s.definition.nodes).toHaveLength(4);
    expect(s.notice).toMatch(/Added, but not connected/);
  });

  it('refuses a second trigger with an explanation (FR-05.4)', () => {
    const s = run(branching, { type: 'addNode', nodeType: 'manual.trigger', kind: 'TRIGGER' });
    expect(s.definition).toBe(branching);
    expect(s.notice).toMatch(/exactly one trigger/);
  });

  it('refuses invalid connections and records valid ones', () => {
    const s = run(branching, { type: 'connect', from: 'log', to: 'trigger' });
    expect(s.notice).toMatch(/into the trigger/);
    const added = run(
      branching,
      { type: 'addNode', nodeType: 'util.log', kind: 'ACTION' },
      { type: 'connect', from: 'notify', to: 'util_log' },
    );
    expect(added.definition.edges.at(-1)).toEqual({ from: 'notify', to: 'util_log' });
    expect(added.notice).toBeNull();
  });

  it('deleting a node removes its edges', () => {
    const s = run(branching, { type: 'removeNodes', keys: ['is_high'] });
    expect(s.definition.nodes.map((n) => n.key)).toEqual(['trigger', 'notify', 'log']);
    expect(s.definition.edges).toEqual([]);
  });

  it('deleting nodes and edges together is one undo step (keyboard Delete)', () => {
    const s = run(branching, {
      type: 'removeNodes',
      keys: ['log'],
      edgeIds: [edgeId({ from: 'is_high', to: 'log' }), edgeId({ from: 'trigger', to: 'is_high' })],
    });
    expect(s.definition.nodes.map((n) => n.key)).toEqual(['trigger', 'is_high', 'notify']);
    expect(s.definition.edges).toHaveLength(1);
    expect(s.past).toHaveLength(1);
    expect(editorReducer(s, { type: 'undo' }).definition).toEqual(branching);
  });

  it('deletes edges by id', () => {
    const s = run(branching, {
      type: 'removeEdges',
      ids: [edgeId({ from: 'is_high', to: 'log' })],
    });
    expect(s.definition.edges).toHaveLength(2);
  });

  it('renaming a key updates edges and references in other steps', () => {
    const s = run(branching, { type: 'renameKey', from: 'trigger', to: 'issue' });
    expect(s.definition.edges[0]).toEqual({ from: 'issue', to: 'is_high' });
    // References use "trigger.*" (the trigger root), not "steps.trigger", so they stay.
    const r = run(
      {
        ...branching,
        nodes: [
          ...branching.nodes,
          {
            key: 'echo',
            kind: 'ACTION',
            type: 'util.log',
            config: { message: 'was {{steps.notify.output.ts}} and {{steps.notify_old.x}}' },
          },
        ],
      },
      { type: 'renameKey', from: 'notify', to: 'alert' },
    );
    expect(r.definition.nodes.find((n) => n.key === 'echo')!.config.message).toBe(
      'was {{steps.alert.output.ts}} and {{steps.notify_old.x}}',
    );
  });

  it('refuses an invalid or duplicate key', () => {
    expect(run(branching, { type: 'renameKey', from: 'log', to: 'notify' }).notice).toMatch(
      /already uses/,
    );
    expect(run(branching, { type: 'renameKey', from: 'log', to: '9x' }).notice).toMatch(
      /Start with a letter/,
    );
  });

  it('moving to the same position is not an edit', () => {
    const s = run(branching, { type: 'moveNode', key: 'log', position: { x: 150, y: 280 } });
    expect(s.past).toHaveLength(0);
  });

  it('auto-layout arranges every step as one undoable edit', () => {
    const scattered = {
      ...branching,
      nodes: branching.nodes.map((node, index) => ({
        ...node,
        position: { x: index * 17, y: index * 13 },
      })),
    };
    const arranged = run(scattered, { type: 'autoLayout' });
    expect(arranged.past).toHaveLength(1);
    expect(arranged.definition.nodes.find((node) => node.key === 'trigger')?.position).toEqual({
      x: 0,
      y: 0,
    });
    expect(arranged.definition.nodes.find((node) => node.key === 'notify')?.position?.y).toBe(
      LAYOUT.rowHeight * 2,
    );
    expect(editorReducer(arranged, { type: 'undo' }).definition).toEqual(scattered);
  });

  it('undo and redo restore every edit type', () => {
    const actions: EditorAction[] = [
      { type: 'addNode', nodeType: 'util.log', kind: 'ACTION' },
      { type: 'moveNode', key: 'util_log', position: { x: 500, y: 500 } },
      { type: 'connect', from: 'notify', to: 'util_log' },
      { type: 'renameKey', from: 'util_log', to: 'audit' },
      { type: 'updateConfig', key: 'audit', config: { message: 'done' } },
      { type: 'removeEdges', ids: ['notify->audit'] },
      { type: 'removeNodes', keys: ['audit'] },
    ];
    const states = [initialEditorState(branching)];
    for (const a of actions) states.push(editorReducer(states.at(-1)!, a));
    let s = states.at(-1)!;
    for (let i = actions.length - 1; i >= 0; i--) {
      s = editorReducer(s, { type: 'undo' });
      expect(s.definition).toEqual(states[i].definition);
    }
    for (let i = 1; i <= actions.length; i++) {
      s = editorReducer(s, { type: 'redo' });
      expect(s.definition).toEqual(states[i].definition);
    }
    expect(isDirty(editorReducer(s, { type: 'markSaved' }))).toBe(false);
  });

  it('typing in one settings field is one undo step; another field starts a new one', () => {
    const type = (s: EditorState, field: string, message: string) =>
      editorReducer(s, { type: 'updateConfig', key: 'log', config: { message }, field });
    let s = initialEditorState(branching);
    s = type(s, 'message', 'H');
    s = type(s, 'message', 'Hi');
    s = type(s, 'message', 'Hi!');
    expect(s.past).toHaveLength(1);
    s = editorReducer(s, {
      type: 'updateConfig',
      key: 'log',
      config: { message: 'Hi!', x: 1 },
      field: 'x',
    });
    expect(s.past).toHaveLength(2);
    s = editorReducer(s, { type: 'undo' });
    expect(s.definition.nodes.find((n) => n.key === 'log')?.config).toEqual({ message: 'Hi!' });
    s = editorReducer(s, { type: 'undo' });
    expect(s.definition).toEqual(branching);
    // After undo, typing again starts a fresh step instead of extending the undone one.
    s = type(editorReducer(s, { type: 'redo' }), 'message', 'Hey');
    expect(s.past).toHaveLength(2);
  });

  it('a new edit after undo drops the redo history', () => {
    let s = run(branching, { type: 'removeNodes', keys: ['log'] }, { type: 'undo' });
    expect(s.future).toHaveLength(1);
    s = editorReducer(s, { type: 'removeNodes', keys: ['notify'] });
    expect(s.future).toHaveLength(0);
  });
});
