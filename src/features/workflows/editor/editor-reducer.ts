import type { NodeKind } from '@/types/api';
import {
  DEFINITION_LIMITS,
  type NodePosition,
  type WorkflowDefinition,
} from '../types/workflow-definition';
import { canConnect } from './graph-rules';
import { edgeId } from './mapping';
import { generateKey, keyProblem } from './keys';
import { autoLayout, LAYOUT } from './layout';

/**
 * Editor state (Part 05): the definition is the single source of truth; React Flow only renders
 * it. Every edit goes through this reducer, which enforces the graph rules and keeps an
 * undo/redo history. Pure — no React, no React Flow.
 */
export interface EditorState {
  definition: WorkflowDefinition;
  past: WorkflowDefinition[];
  future: WorkflowDefinition[];
  /** Why the last edit was refused (shown to the user), or null. */
  notice: string | null;
  /** The definition as last loaded or saved; `dirty` compares against it. */
  saved: WorkflowDefinition;
  /** Field of the last config edit; further typing in it extends that undo step. */
  lastEdit: string | null;
}

export type EditorAction =
  | { type: 'load'; definition: WorkflowDefinition }
  /** The backend stored `definition` (defaults to the current one): it becomes the baseline. */
  | { type: 'markSaved'; definition?: WorkflowDefinition }
  /** Replaces the whole draft (restore a version) as one undoable edit. */
  | { type: 'replace'; definition: WorkflowDefinition }
  | {
      type: 'addNode';
      nodeType: string;
      kind: NodeKind;
      position?: NodePosition;
      /** Place below this step and connect it (first free branch of a condition). */
      after?: string;
    }
  | { type: 'moveNode'; key: string; position: NodePosition }
  /** Reflows the complete graph as one undoable edit. */
  | { type: 'autoLayout' }
  | { type: 'connect'; from: string; to: string; branch?: 'true' | 'false' | null }
  /** Removes the nodes with their edges, plus any other `edgeIds`, as one undoable edit. */
  | { type: 'removeNodes'; keys: string[]; edgeIds?: string[] }
  | { type: 'removeEdges'; ids: string[] }
  | { type: 'renameKey'; from: string; to: string }
  /**
   * `field` names what was edited (e.g. "text"); consecutive edits of the same field of the
   * same step are one undo step, so undo does not go back one keystroke at a time.
   */
  | { type: 'updateConfig'; key: string; config: Record<string, unknown>; field?: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'dismissNotice' };

const HISTORY_LIMIT = 100;

export const initialEditorState = (definition: WorkflowDefinition): EditorState => ({
  definition,
  past: [],
  future: [],
  notice: null,
  saved: definition,
  lastEdit: null,
});

/** Unsaved changes (structural comparison). */
export const isDirty = (state: EditorState) =>
  JSON.stringify(state.definition) !== JSON.stringify(state.saved);

function commit(state: EditorState, definition: WorkflowDefinition): EditorState {
  if (definition === state.definition) return state;
  return {
    ...state,
    definition,
    past: [...state.past, state.definition].slice(-HISTORY_LIMIT),
    future: [],
    notice: null,
    lastEdit: null,
  };
}

const refuse = (state: EditorState, notice: string): EditorState => ({ ...state, notice });

/** Rewrites `steps.<from>.` references inside string config values after a key rename. */
function renameReferences(value: unknown, from: string, to: string): unknown {
  if (typeof value === 'string') {
    return value.replace(new RegExp(`(^|[^\\w])steps\\.${from}(?=\\.|\\b)`, 'g'), `$1steps.${to}`);
  }
  if (Array.isArray(value)) return value.map((v) => renameReferences(v, from, to));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, renameReferences(v, from, to)]),
    );
  }
  return value;
}

function placeNear(def: WorkflowDefinition, near?: string): NodePosition {
  const anchor = def.nodes.find((n) => n.key === near)?.position;
  if (anchor) return { x: anchor.x, y: anchor.y + LAYOUT.rowHeight };
  const lowest = Math.max(-LAYOUT.rowHeight, ...def.nodes.map((n) => n.position?.y ?? 0));
  return { x: 0, y: lowest + LAYOUT.rowHeight };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const def = state.definition;
  switch (action.type) {
    case 'load':
      return initialEditorState(action.definition);

    case 'markSaved':
      return { ...state, saved: action.definition ?? state.definition };

    case 'replace':
      return commit(state, action.definition);

    case 'addNode': {
      if (action.kind === 'TRIGGER' && def.nodes.some((n) => n.kind === 'TRIGGER')) {
        return refuse(state, 'A workflow has exactly one trigger. Remove the current one first.');
      }
      if (def.nodes.length >= DEFINITION_LIMITS.maxNodes) {
        return refuse(state, `A workflow can have at most ${DEFINITION_LIMITS.maxNodes} steps.`);
      }
      const key = generateKey(
        action.nodeType,
        def.nodes.map((n) => n.key),
      );
      const withNode: WorkflowDefinition = {
        ...def,
        nodes: [
          ...def.nodes,
          {
            key,
            kind: action.kind,
            type: action.nodeType,
            config: {},
            position: action.position ?? placeNear(def, action.after),
          },
        ],
      };
      const parent = withNode.nodes.find((n) => n.key === action.after);
      if (!parent) {
        // A trigger or the first step needs no connection; anything else is left for the user.
        const lone = action.kind === 'TRIGGER' || def.nodes.length === 0;
        return lone
          ? commit(state, withNode)
          : {
              ...commit(state, withNode),
              notice: 'Added, but not connected: drag from a step’s bottom handle to connect it.',
            };
      }
      const branch =
        parent.kind === 'CONDITION'
          ? (['true', 'false'] as const).find(
              (b) => !withNode.edges.some((e) => e.from === parent.key && e.branch === b),
            )
          : undefined;
      const result = canConnect(withNode, parent.key, key, branch);
      if (!result.ok) {
        // The step is still added; say why it is not connected.
        return { ...commit(state, withNode), notice: `Added, but not connected: ${result.reason}` };
      }
      return commit(state, { ...withNode, edges: [...withNode.edges, result.edge] });
    }

    case 'moveNode': {
      const node = def.nodes.find((n) => n.key === action.key);
      if (!node) return state;
      const { x, y } = action.position;
      if (node.position?.x === x && node.position?.y === y) return state;
      return commit(state, {
        ...def,
        nodes: def.nodes.map((n) => (n.key === action.key ? { ...n, position: { x, y } } : n)),
      });
    }

    case 'autoLayout': {
      const positions = autoLayout(def);
      if (!positions.size) return state;
      const definition = {
        ...def,
        nodes: def.nodes.map((node) => ({
          ...node,
          position: positions.get(node.key) ?? node.position,
        })),
      };
      return JSON.stringify(definition) === JSON.stringify(def) ? state : commit(state, definition);
    }

    case 'connect': {
      if (def.edges.length >= DEFINITION_LIMITS.maxEdges) {
        return refuse(
          state,
          `A workflow can have at most ${DEFINITION_LIMITS.maxEdges} connections.`,
        );
      }
      const result = canConnect(def, action.from, action.to, action.branch);
      if (!result.ok) return refuse(state, result.reason);
      return commit(state, { ...def, edges: [...def.edges, result.edge] });
    }

    case 'removeNodes': {
      const gone = new Set(action.keys);
      const goneEdges = new Set(action.edgeIds ?? []);
      const nodes = def.nodes.filter((n) => !gone.has(n.key));
      const edges = def.edges.filter(
        (e) => !gone.has(e.from) && !gone.has(e.to) && !goneEdges.has(edgeId(e)),
      );
      if (nodes.length === def.nodes.length && edges.length === def.edges.length) return state;
      return commit(state, { ...def, nodes, edges });
    }

    case 'removeEdges': {
      const gone = new Set(action.ids);
      const edges = def.edges.filter((e) => !gone.has(edgeId(e)));
      return edges.length === def.edges.length ? state : commit(state, { ...def, edges });
    }

    case 'renameKey': {
      if (action.from === action.to) return state;
      const problem = keyProblem(
        action.to,
        def.nodes.filter((n) => n.key !== action.from).map((n) => n.key),
      );
      if (problem) return refuse(state, problem);
      const rename = (k: string) => (k === action.from ? action.to : k);
      return commit(state, {
        ...def,
        nodes: def.nodes.map((n) => ({
          ...n,
          key: rename(n.key),
          config: renameReferences(n.config, action.from, action.to) as Record<string, unknown>,
        })),
        edges: def.edges.map((e) => ({ ...e, from: rename(e.from), to: rename(e.to) })),
      });
    }

    case 'updateConfig': {
      const next = {
        ...def,
        nodes: def.nodes.map((n) => (n.key === action.key ? { ...n, config: action.config } : n)),
      };
      const edit = action.field ? `${action.key}:${action.field}` : null;
      if (edit && edit === state.lastEdit && state.past.length) {
        return { ...state, definition: next, future: [], notice: null };
      }
      return { ...commit(state, next), lastEdit: edit };
    }

    case 'undo': {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        definition: previous,
        past: state.past.slice(0, -1),
        future: [def, ...state.future],
        notice: null,
        lastEdit: null,
      };
    }

    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        ...state,
        definition: next,
        past: [...state.past, def],
        future: rest,
        notice: null,
        lastEdit: null,
      };
    }

    case 'dismissNotice':
      return { ...state, notice: null };
  }
}
