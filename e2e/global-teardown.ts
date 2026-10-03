import { compose } from './global-setup';

/** Stops the E2E stack and deletes its data (unless E2E_KEEP_STACK is set for debugging). */
export default async function globalTeardown() {
  if (process.env.E2E_EXTERNAL_API || process.env.E2E_KEEP_STACK) return;
  compose(['down', '-v', '--remove-orphans']);
}
