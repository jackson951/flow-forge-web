import { queryKeys } from './query-keys';

const WS = 'ws-under-test';

type Factory = (...args: never[]) => readonly unknown[];

/** Every function in the factory that takes a workspace id first. */
function tenantFactories(): [string, Factory][] {
  const found: [string, Factory][] = [];
  const walk = (node: unknown, path: string) => {
    if (typeof node === 'function') found.push([path, node as Factory]);
    else if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(queryKeys, '');
  return found;
}

describe('query keys (Part 01, AC-01.4)', () => {
  it('starts every tenant key with the workspace id', () => {
    const factories = tenantFactories();
    expect(factories.length).toBeGreaterThanOrEqual(15);
    for (const [name, factory] of factories) {
      const key = (factory as (...a: unknown[]) => readonly unknown[])(WS, 'id-2', 3);
      expect([name, key.slice(0, 2)]).toEqual([name, ['ws', WS]]);
    }
  });

  it('keeps two workspaces apart and lets one be cleared as a whole', () => {
    expect(queryKeys.runs.list('a')).not.toEqual(queryKeys.runs.list('b'));
    const prefix = queryKeys.ws('a');
    expect(queryKeys.workflows.detail('a', 'w1').slice(0, prefix.length)).toEqual(prefix);
  });

  it('keeps non-tenant data outside the workspace prefix', () => {
    for (const key of [
      queryKeys.me,
      queryKeys.workspaces,
      queryKeys.nodeTypes,
      queryKeys.providers,
    ]) {
      expect(key[0]).not.toBe('ws');
    }
  });
});
