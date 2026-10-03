import { NODE_KEY_PATTERN } from '../types/workflow-definition';

/**
 * A readable, unique node key from the node type: `slack.sendMessage` → `slack_send_message`,
 * then `slack_send_message_2`, … Matches the backend pattern (letter first, letters, digits,
 * `_`, at most 64). Keys are how later steps reference this one (`steps.<key>.output`).
 */
export function generateKey(type: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  let base = type
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  if (!/^[a-z]/.test(base)) base = `step_${base}`;
  base = base.slice(0, 60);
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}_${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Why a key cannot be used, or null when it is fine. */
export function keyProblem(key: string, others: Iterable<string>): string | null {
  if (!NODE_KEY_PATTERN.test(key)) {
    return 'Start with a letter; use letters, digits and _ only (at most 64)';
  }
  for (const other of others) if (other === key) return 'Another step already uses this key';
  return null;
}
