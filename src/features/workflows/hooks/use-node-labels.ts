import { useCallback, useMemo } from 'react';
import { useNodeTypes } from '../api/workflows.api';
import { NODE_CATALOG } from '../types/node-catalog';

/** Display name of a node type: the server's name, else the client catalog, else the id. */
export function useNodeLabels() {
  const nodeTypes = useNodeTypes();
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of NODE_CATALOG) map.set(n.type, n.label);
    for (const t of nodeTypes.data ?? []) map.set(t.type, t.displayName);
    return map;
  }, [nodeTypes.data]);
  return useCallback((type: string) => labels.get(type) ?? type, [labels]);
}
