import '@testing-library/jest-dom/vitest';
import { accessToken } from '@/lib/access-token';
import { server } from './msw/server';

// The API is always mocked: a request without a handler fails the test instead of
// reaching the network (Part 01, AC-01.5).
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  accessToken.clear();
});
afterAll(() => server.close());
