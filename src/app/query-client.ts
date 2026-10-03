import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { createMutationCache } from '@/lib/mutation-toasts';

export const queryClient = new QueryClient({
  mutationCache: createMutationCache(),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (401/403/404/422) — only transient failures.
      retry: (count, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
});
