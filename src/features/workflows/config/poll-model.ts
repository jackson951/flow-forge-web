/**
 * `http.poll` helpers (Part 20), mirroring the backend's item rules
 * (flowforge-api `src/modules/integrations/http/http-poll.ts`). Used to check `items` /
 * `identity` / `cursor` paths against a pasted sample response — locally, nothing is sent.
 */

export const DOT_PATH = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+){0,9}$/;

export function getPath(value: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node !== null && typeof node === 'object'
          ? (node as Record<string, unknown>)[key]
          : undefined,
      value,
    );
}

export interface SampleCheck {
  /** Problems the backend would also report (or a JSON syntax error). */
  error?: string;
  itemCount: number;
  /** First ids, or "content hash" when identity is not set. */
  ids: string[];
  /** Items without a usable id at the identity path. */
  missingIds: number;
  cursor?: string;
  /** Keys of the first item, for "trigger.item.<key>" mappings. */
  itemKeys: string[];
}

/** Applies the poll's paths to a sample response the user pasted. */
export function checkSample(
  sample: string,
  paths: { items?: string; identity?: string; cursor?: string },
): SampleCheck {
  const empty: SampleCheck = { itemCount: 0, ids: [], missingIds: 0, itemKeys: [] };
  let body: unknown;
  try {
    body = JSON.parse(sample);
  } catch {
    return { ...empty, error: 'The sample is not valid JSON.' };
  }
  for (const [name, p] of Object.entries(paths)) {
    if (p && !DOT_PATH.test(p))
      return { ...empty, error: `${name}: use a dot path such as data.items` };
  }
  let items: unknown[];
  if (!paths.items) items = body === null || body === undefined ? [] : [body];
  else {
    const found = getPath(body, paths.items);
    if (found === undefined || found === null) items = [];
    else if (!Array.isArray(found))
      return { ...empty, error: `"${paths.items}" in the response is not a list` };
    else items = found;
  }
  let missingIds = 0;
  const ids: string[] = [];
  for (const item of items) {
    if (!paths.identity) continue;
    const id = getPath(item, paths.identity);
    if ((typeof id === 'string' && id.trim()) || typeof id === 'number')
      ids.push(String(id).trim());
    else missingIds++;
  }
  const first = items[0];
  const cursorValue = paths.cursor ? getPath(body, paths.cursor) : undefined;
  return {
    itemCount: items.length,
    ids: paths.identity ? ids.slice(0, 5) : items.length ? ['content hash'] : [],
    missingIds,
    cursor:
      typeof cursorValue === 'string' || typeof cursorValue === 'number'
        ? String(cursorValue)
        : undefined,
    itemKeys:
      first && typeof first === 'object' && !Array.isArray(first)
        ? Object.keys(first)
            .filter((k) => /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(k))
            .slice(0, 30)
        : [],
  };
}
