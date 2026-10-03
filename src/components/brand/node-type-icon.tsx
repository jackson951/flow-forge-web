import { cn } from '@/lib/cn';
import { nodeTypeVisual } from './node-type-visual';

/** The node type's icon in a rounded tile, as on the canvas and in run timelines. */
export function NodeTypeIcon({
  type,
  size = 'md',
  className,
}: {
  type: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { Icon, tile } = nodeTypeVisual(type);
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        size === 'sm' ? 'size-7' : 'size-9',
        tile,
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-5'} />
    </span>
  );
}
