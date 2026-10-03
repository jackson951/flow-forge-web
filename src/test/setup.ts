import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { resetSessionForTests } from '@/features/auth/session/session';
import { toastStore } from '@/lib/toast';
import { server } from './msw/server';
import { installReactFlowShims } from './react-flow-shims';

installReactFlowShims();

// findBy*/waitFor: 1 s is too tight when the whole suite runs in parallel on a busy machine.
configure({ asyncUtilTimeout: 10_000 });

// The API is always mocked: a request without a handler fails the test instead of
// reaching the network (Part 01, AC-01.5).
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  // Unmount first: after hooks run in reverse order, so Testing Library's own cleanup would
  // come after the reset below, and a still-mounted tree could start a refresh against the
  // default handlers that the next test's session check then joins.
  cleanup();
  server.resetHandlers();
  // Session and access token are module singletons; every test starts signed out/unknown.
  resetSessionForTests();
  toastStore.clear();
});
afterAll(() => server.close());
