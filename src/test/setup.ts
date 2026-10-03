import '@testing-library/jest-dom/vitest';
import { resetSessionForTests } from '@/features/auth/session/session';
import { server } from './msw/server';
import { installReactFlowShims } from './react-flow-shims';

installReactFlowShims();

// The API is always mocked: a request without a handler fails the test instead of
// reaching the network (Part 01, AC-01.5).
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // Session and access token are module singletons; every test starts signed out/unknown.
  resetSessionForTests();
});
afterAll(() => server.close());
