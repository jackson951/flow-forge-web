import { paths } from '@/lib/routes';

const SECTIONS = ['workflows', 'runs', 'integrations', 'settings'] as const;

/**
 * The same section in another workspace: list pages keep their section, detail pages
 * (a workflow, a run) fall back to their list — the id belongs to the old workspace.
 */
export function sameSectionIn(pathname: string, target: string): string {
  const [, , , section, sub] = pathname.split('/'); // '', 'w', id, section, sub
  if (section === 'settings' && sub === 'members') return paths.settingsMembers(target);
  const known = SECTIONS.find((s) => s === section);
  return known ? `${paths.workspace(target)}/${known}` : paths.workspace(target);
}
