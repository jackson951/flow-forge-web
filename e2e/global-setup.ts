import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Starts the real backend stack for E2E (Part 13, FR-13.3): fresh, isolated database every run
 * (Postgres on tmpfs), throwaway secrets, migrations, API and worker. Skipped when
 * E2E_EXTERNAL_API is set (e.g. a stack you started yourself).
 */
export const COMPOSE_FILE = fileURLToPath(new URL('./docker-compose.e2e.yml', import.meta.url));

export function compose(args: string[], env: NodeJS.ProcessEnv = process.env) {
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, ...args], { stdio: 'inherit', env });
}

export default async function globalSetup() {
  if (process.env.E2E_EXTERNAL_API) return;
  const secret = (bytes: number) => randomBytes(bytes).toString('hex');
  // Shared with the tests (signed TEST-provider webhooks) through the environment.
  process.env.E2E_JWT_ACCESS_SECRET ??= secret(32);
  process.env.E2E_JWT_REFRESH_SECRET ??= secret(32);
  process.env.E2E_WEBHOOK_TEST_SECRET ??= secret(24);
  compose(['down', '-v', '--remove-orphans']);
  compose(['up', '-d', '--build', '--wait', 'api', 'worker']);
}
