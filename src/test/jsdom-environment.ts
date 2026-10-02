import type { Environment } from 'vitest/environments';
import { builtinEnvironments } from 'vitest/environments';

/**
 * jsdom, but with Node's own AbortController/AbortSignal kept. jsdom replaces them, and Node's
 * fetch/Request (used by MSW and by React Router's navigations) reject a jsdom AbortSignal
 * ("Expected signal to be an instance of AbortSignal").
 */
const environment: Environment = {
  name: 'jsdom-node-abort',
  transformMode: 'web',
  async setup(global: typeof globalThis, options) {
    const { AbortController, AbortSignal } = global;
    const jsdom = await builtinEnvironments.jsdom.setup(global, options);
    Object.assign(global, { AbortController, AbortSignal });
    return jsdom;
  },
};

export default environment;
