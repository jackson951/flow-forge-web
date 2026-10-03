import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { COMPOSE_FILE } from './global-setup';

export const PASSWORD = 'correct horse battery staple';
const API = `http://localhost:${process.env.E2E_API_PORT ?? '3200'}/api/v1`;

export const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${randomUUID().slice(0, 6)}@example.test`;

/** Registers through the UI and lands in the new user's workspace (backend creates it). */
export async function registerInUi(page: Page, name: string, email = uniqueEmail('e2e')) {
  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/w\/[0-9a-f-]{36}$/);
  const workspaceId = page.url().split('/w/')[1];
  return { email, workspaceId };
}

/** Creates a workflow from the list and returns once the editor is open. */
export async function createWorkflow(page: Page, workspaceId: string, name: string) {
  await page.goto(`/w/${workspaceId}/workflows`);
  await page
    .getByRole('button', { name: /Create workflow/ })
    .first()
    .click();
  await page.getByRole('dialog').getByLabel('Name').fill(name);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Create/ })
    .click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  return page.url().split('/workflows/')[1];
}

export const palette = (page: Page) => page.getByRole('navigation', { name: 'Steps you can add' });
export const stepPanel = (page: Page) => page.getByRole('complementary', { name: 'Selected step' });
export const canvasNode = (page: Page, key: string) =>
  page.locator(`.react-flow__node[data-id="${key}"]`);

/** Adds a step from the palette (after the selected step, which connects it). */
export async function addStep(page: Page, displayName: RegExp) {
  await palette(page).getByRole('button', { name: displayName }).click();
}

export async function selectStep(page: Page, key: string) {
  await canvasNode(page, key).click({ position: { x: 40, y: 18 } });
  await expect(stepPanel(page).getByRole('textbox', { name: 'Step key' })).toHaveValue(key);
}

export async function saveAndPublish(page: Page) {
  await page.keyboard.press('Control+s');
  await expect(page.getByText(/^Saved at|^All changes saved/)).toBeVisible();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Publish a new version?' })
    .getByRole('button', { name: 'Publish' })
    .click();
  await expect(page.getByText(/Published v\d+\. It is now the active version\./)).toBeVisible();
}

/** Signed request to the backend's TEST webhook provider (non-production only). */
export async function sendTestWebhook(
  event: string,
  resource: string,
  data: Record<string, unknown>,
) {
  const secret = process.env.E2E_WEBHOOK_TEST_SECRET;
  if (!secret) throw new Error('E2E_WEBHOOK_TEST_SECRET is not set (global setup)');
  const body = JSON.stringify({ resource, data });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
  const res = await fetch(`${API}/webhooks/test`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-flowforge-event': event,
      'x-flowforge-delivery': randomUUID(),
      'x-flowforge-timestamp': String(timestamp),
      'x-flowforge-signature': signature,
    },
    body,
  });
  return res.status;
}

/** SQL against the E2E database (only for setup the UI cannot do, e.g. TEST webhook routing). */
export function sql(statement: string) {
  return execFileSync(
    'docker',
    [
      'compose',
      '-f',
      COMPOSE_FILE,
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'flowforge',
      '-d',
      'flowforge',
      '-tAc',
      statement,
    ],
    { encoding: 'utf8' },
  ).trim();
}

/** Asserts the browser keeps no token anywhere script-readable (Part 13, FR-13.5). */
export async function expectNoTokensInStorage(page: Page) {
  const stored = await page.evaluate(() =>
    JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
  );
  expect(stored).not.toMatch(
    /eyJ[\w-]{10,}\.[\w-]{10,}|accessToken|refreshToken|xox[abpr]-|gh[osu]_/,
  );
}
