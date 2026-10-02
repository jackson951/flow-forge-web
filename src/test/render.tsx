import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/routes';
import { clearCacheOnSessionEnd } from '@/features/auth/session/bind-cache';

/** Render the real route tree at a given URL with a fresh query cache (API mocked by MSW). */
export function renderRoute(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clearCacheOnSessionEnd(client);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router, client };
}
