/**
 * The access token lives here, in memory only — never in localStorage, sessionStorage or a
 * readable cookie. The refresh token is the backend's httpOnly cookie. Part 02 fills this
 * store on login/refresh and clears it on logout.
 */
let token: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export const accessToken = {
  get: (): string | null => token,
  set(next: string | null): void {
    token = next;
    listeners.forEach((listener) => listener(next));
  },
  clear(): void {
    accessToken.set(null);
  },
  subscribe(listener: (token: string | null) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
