import type { WorkflowDefinition } from '../types/workflow-definition';

/**
 * Data references (`trigger.issue.title`, `steps.classify.output.label`) — the backend grammar
 * (engine/expressions/reference.ts) and the outputs each node type is known to produce.
 * A step may only reference steps that run before it on its path: its ancestors.
 */

export interface ReferenceSuggestion {
  /** Text inserted, e.g. `steps.classify.output.label`. */
  ref: string;
  /** Where it comes from, e.g. "Classify text (classify)". */
  source: string;
  description: string;
}

export interface ReferenceProblem {
  level: 'error' | 'warning';
  message: string;
}

type Field = { path: string; description: string };

/** Trigger output = the run's trigger input (normalised event or manual input). */
const TRIGGER_FIELDS: Record<string, Field[]> = {
  'github.issue.created': [
    { path: 'issue.number', description: 'Issue number' },
    { path: 'issue.title', description: 'Issue title' },
    { path: 'issue.body', description: 'Issue text' },
    { path: 'issue.url', description: 'Link to the issue' },
    { path: 'issue.state', description: 'open / closed' },
    { path: 'issue.createdAt', description: 'When it was opened (ISO 8601)' },
    { path: 'issue.labels', description: 'Label names (list)' },
    { path: 'issue.author.login', description: 'Who opened it' },
    { path: 'repository.fullName', description: 'owner/name' },
    { path: 'repository.private', description: 'true for private repositories' },
    { path: 'sender.login', description: 'Who triggered the event' },
  ],
  // Manual runs: whatever JSON the run is started with — no fixed fields.
  'manual.trigger': [],
};

/** Known outputs per action/condition type; ai.extract's depend on its configured fields. */
function outputFields(type: string, config: Record<string, unknown>): Field[] | null {
  switch (type) {
    case 'util.log':
      return [{ path: 'message', description: 'The logged message' }];
    case 'condition':
      return [{ path: 'result', description: 'true or false' }];
    case 'slack.sendMessage':
      return [
        { path: 'ts', description: 'Message timestamp (its id in Slack)' },
        { path: 'channelId', description: 'Channel it was posted to' },
      ];
    case 'microsoft.todo.createTask':
      return [
        { path: 'taskId', description: 'Id of the new task' },
        { path: 'listId', description: 'List it was added to' },
      ];
    case 'ai.summarize':
      return [{ path: 'summary', description: 'The summary' }];
    case 'ai.classify':
      return [
        { path: 'label', description: 'The chosen label' },
        { path: 'confidence', description: 'Model confidence 0–1, when given' },
      ];
    case 'ai.extract': {
      const fields = Array.isArray(config.fields) ? config.fields : [];
      return fields
        .filter(
          (f): f is { name: string; description?: string } =>
            typeof f?.name === 'string' && !!f.name,
        )
        .map((f) => ({ path: f.name, description: f.description || 'Extracted field' }));
    }
    default:
      return null; // unknown shape: any path is accepted without a warning
  }
}

/** Keys of the steps that run before `key` (its ancestors), trigger first. */
export function ancestorsOf(def: WorkflowDefinition, key: string): string[] {
  const parent = new Map(def.edges.map((e) => [e.to, e.from]));
  const chain: string[] = [];
  const seen = new Set([key]);
  for (let at = parent.get(key); at && !seen.has(at); at = parent.get(at)) {
    seen.add(at);
    chain.unshift(at);
  }
  return chain;
}

/** Everything `key` may reference, nearest data last (trigger, then each step down the path). */
export function availableReferences(
  def: WorkflowDefinition,
  key: string,
  labelFor: (type: string) => string = (t) => t,
): ReferenceSuggestion[] {
  const byKey = new Map(def.nodes.map((n) => [n.key, n]));
  const result: ReferenceSuggestion[] = [];
  for (const ancestorKey of ancestorsOf(def, key)) {
    const node = byKey.get(ancestorKey);
    if (!node) continue;
    const source = `${labelFor(node.type)} (${node.key})`;
    if (node.kind === 'TRIGGER') {
      for (const f of TRIGGER_FIELDS[node.type] ?? []) {
        result.push({ ref: `trigger.${f.path}`, source, description: f.description });
      }
      continue;
    }
    for (const f of outputFields(node.type, node.config) ?? []) {
      result.push({
        ref: `steps.${node.key}.output.${f.path}`,
        source,
        description: f.description,
      });
    }
  }
  return result;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const INDEX = /^\d{1,6}$/;
const NODE_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

/** Syntax check identical to the backend's parseReference; null when valid. */
export function referenceSyntaxError(text: string): string | null {
  if (!text) return 'Empty reference';
  if (text.length > 300) return 'Reference is too long';
  const segments = text.split('.');
  if (segments.length > 20) return 'Too many segments';
  let rest: string[];
  if (segments[0] === 'trigger') rest = segments.slice(1);
  else if (segments[0] === 'steps') {
    if (!segments[1] || !NODE_KEY.test(segments[1])) return 'Expected steps.<step key>.output';
    if (segments[2] !== 'output') return 'Step references continue with ".output"';
    rest = segments.slice(3);
  } else return 'Must start with "trigger" or "steps"';
  for (const segment of rest) {
    if (FORBIDDEN.has(segment)) return `"${segment}" is not allowed`;
    if (!INDEX.test(segment) && !IDENTIFIER.test(segment)) return `Invalid part "${segment}"`;
  }
  return null;
}

/** Why `text`, used in step `key`, will not work (error) or may not (warning); null if fine. */
export function referenceProblem(
  def: WorkflowDefinition,
  key: string,
  text: string,
): ReferenceProblem | null {
  const syntax = referenceSyntaxError(text);
  if (syntax) return { level: 'error', message: `${text}: ${syntax}` };
  const [root, nodeKey, , ...path] = text.split('.');
  if (root === 'trigger') return null;
  const node = def.nodes.find((n) => n.key === nodeKey);
  if (!node) return { level: 'error', message: `${text}: there is no step "${nodeKey}"` };
  if (!ancestorsOf(def, key).includes(nodeKey)) {
    return {
      level: 'error',
      message: `${text}: "${nodeKey}" does not run before this step`,
    };
  }
  const known = outputFields(node.type, node.config);
  if (known && path.length && !known.some((f) => f.path.split('.')[0] === path[0])) {
    return {
      level: 'warning',
      message: `${text}: "${path[0]}" is not a known output of ${nodeKey}`,
    };
  }
  return null;
}

export const TEMPLATE_PATTERN = /\{\{\s*([^{}\s]+)\s*\}\}/g;

/** References used in a template string. */
export function templateReferences(template: string): string[] {
  return [...template.matchAll(TEMPLATE_PATTERN)].map((m) => m[1]);
}
