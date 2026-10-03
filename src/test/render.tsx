import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { Toaster } from '@/components/feedback/toaster';
import { clearCacheOnSessionEnd } from '@/features/auth/session/bind-cache';
import { createMutationCache } from '@/lib/mutation-toasts';

/** Render the real route tree at a given URL with a fresh query cache (API mocked by MSW). */
export function renderRoute(path: string) {
  const client = new QueryClient({
    mutationCache: createMutationCache(),
    defaultOptions: { queries: { retry: false } },
  });
  clearCacheOnSessionEnd(client);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...result, router, client };
}
