import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Node-side MSW server used by every Vitest test (started in src/test/setup.ts). */
export const server = setupServer(...handlers);
