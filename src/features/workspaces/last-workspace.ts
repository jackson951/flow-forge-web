/**
 * The workspace a user last opened, so `/` can return there (Part 03, FR-03.2). Not secret —
 * just an id, per user. Storage can be unavailable (private mode, blocked); then it is skipped.
 */
const key = (userId: string) => `flowforge:last-workspace:${userId}`;

export const lastWorkspace = {
  get(userId: string): string | null {
    try {
      return localStorage.getItem(key(userId));
    } catch {
      return null;
    }
  },
  set(userId: string, workspaceId: string): void {
    try {
      localStorage.setItem(key(userId), workspaceId);
    } catch {
      // ignore
    }
  },
  clear(userId: string): void {
    try {
      localStorage.removeItem(key(userId));
    } catch {
      // ignore
    }
  },
};
