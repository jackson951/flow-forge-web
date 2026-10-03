import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { resetSessionForTests } from '@/features/auth/session/session';
import { server } from './msw/server';
import { installReactFlowShims } from './react-flow-shims';

installReactFlowShims();

// findBy*/waitFor: 1 s is too tight when the whole suite runs in parallel on a busy machine.
configure({ asyncUtilTimeout: 5_000 });

// The API is always mocked: a request without a handler fails the test instead of
// reaching the network (Part 01, AC-01.5).
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  // Session and access token are module singletons; every test starts signed out/unknown.
  resetSessionForTests();
});
afterAll(() => server.close());
