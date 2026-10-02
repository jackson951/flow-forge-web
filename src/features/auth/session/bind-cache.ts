import type { QueryClient } from '@tanstack/react-query';
import { session } from './session';

/** No data of a signed-out user stays in memory: the query cache is dropped when a session ends. */
export function clearCacheOnSessionEnd(client: QueryClient): () => void {
  return session.onEnd(() => client.clear());
}
