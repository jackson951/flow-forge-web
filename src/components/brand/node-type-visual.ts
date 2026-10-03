import { MousePointerClick, ScrollText, Sparkles, Split, Workflow } from 'lucide-react';
import { GitHubIcon, MicrosoftIcon, SlackIcon } from './provider-icons';

export type Visual = { Icon: (p: { className?: string }) => React.ReactNode; tile: string };

/**
 * Icon for a node type: the provider's logo for integration steps, a meaningful symbol for
 * built-ins. Unknown types fall back to a generic workflow icon.
 */
export function nodeTypeVisual(type: string): Visual {
  const prefix = type.split('.', 1)[0];
  switch (prefix) {
    case 'github':
      return { Icon: GitHubIcon, tile: 'bg-gray-100 text-gray-900' };
    case 'slack':
      return { Icon: SlackIcon, tile: 'bg-white ring-1 ring-line' };
    case 'microsoft':
      return { Icon: MicrosoftIcon, tile: 'bg-white ring-1 ring-line' };
    case 'ai':
      return { Icon: Sparkles, tile: 'bg-violet-50 text-violet-600' };
    case 'condition':
      return { Icon: Split, tile: 'bg-amber-50 text-amber-600' };
    case 'manual':
      return { Icon: MousePointerClick, tile: 'bg-primary-soft text-primary' };
    case 'util':
      return { Icon: ScrollText, tile: 'bg-sky-50 text-sky-600' };
    default:
      return { Icon: Workflow, tile: 'bg-canvas text-muted' };
  }
}
