/**
 * Canonical JSON (object keys sorted, recursively) — the same idea as the backend's
 * canonical-json.ts, so "does the draft differ from the active version?" ignores key order.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

export const sameDefinition = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
