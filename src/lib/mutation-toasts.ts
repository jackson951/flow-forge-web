import { MutationCache } from '@tanstack/react-query';
import { toast } from './toast';

/** A mutation declares its toast: `meta: { success: 'Workflow archived' }` (or a function). */
type Message = string | ((data: unknown, variables: unknown) => string);

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { success?: Message };
  }
}

/**
 * Toasts for finished mutations (Part 12, FR-12.3), configured once on the query client.
 * Failures are not toasted here: each form/dialog shows its own error next to the action.
 */
export function createMutationCache() {
  return new MutationCache({
    onSuccess: (data, variables, _context, mutation) => {
      const success = mutation.meta?.success;
      if (success)
        toast.success(typeof success === 'function' ? success(data, variables) : success);
    },
  });
}
