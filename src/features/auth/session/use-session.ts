import { useSyncExternalStore } from 'react';
import { session, type SessionState } from './session';

/** Current session (status, user, why the last one ended). */
export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}
