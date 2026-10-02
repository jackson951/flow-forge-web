/**
 * App URLs (Part 01, FR-01.7). Tenant pages live under `/w/:workspaceId`, so the workspace
 * being viewed is always explicit and shareable. Build links with these helpers, never by hand.
 */
export const paths = {
  login: '/login',
  register: '/register',
  /** Resolves to the user's workspace (Part 03 remembers the last one). */
  home: '/',
  workspace: (ws: string) => `/w/${ws}`,
  workflows: (ws: string) => `/w/${ws}/workflows`,
  workflow: (ws: string, workflowId: string) => `/w/${ws}/workflows/${workflowId}`,
  runs: (ws: string) => `/w/${ws}/runs`,
  run: (ws: string, runId: string) => `/w/${ws}/runs/${runId}`,
  integrations: (ws: string) => `/w/${ws}/integrations`,
  settings: (ws: string) => `/w/${ws}/settings`,
} as const;

/** Route patterns for the router (same structure as `paths`). */
export const patterns = {
  workspace: '/w/:workspaceId',
  workflows: 'workflows',
  workflow: 'workflows/:workflowId',
  runs: 'runs',
  run: 'runs/:runId',
  integrations: 'integrations',
  settings: 'settings',
} as const;

/**
 * Only same-origin relative paths are accepted as post-login destinations (`?next=`), so a
 * crafted link cannot send the user to another site.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  return next;
}
