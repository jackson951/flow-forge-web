import { expect, test } from '@playwright/test';
import {
  addStep,
  canvasNode,
  createWorkflow,
  expectNoTokensInStorage,
  registerInUi,
  saveAndPublish,
  selectStep,
  sendTestWebhook,
  sql,
  stepPanel,
} from './helpers';

/**
 * Part 13, FR-13.4 — journeys against the real backend + worker (fake AI, TEST webhooks).
 * Each journey registers its own user, so they are independent of order and data.
 */

/** manual trigger → condition (priority equals HIGH) → true: log "high", false: log "low". */
async function buildBranchingWorkflow(
  page: import('@playwright/test').Page,
  workspaceId: string,
  name: string,
) {
  const workflowId = await createWorkflow(page, workspaceId, name);
  await addStep(page, /^Manual trigger/);
  await selectStep(page, 'manual_trigger');
  await addStep(page, /^Condition/);
  await selectStep(page, 'condition');
  await stepPanel(page).getByLabel('Left side data').fill('trigger.priority');
  await page.keyboard.press('Escape');
  await stepPanel(page).getByLabel('Right side text').fill('HIGH');
  await addStep(page, /^Log message/); // connected to the true branch
  await selectStep(page, 'util_log');
  await stepPanel(page).getByLabel('Message').fill('high priority');
  await selectStep(page, 'condition');
  await addStep(page, /^Log message/); // next free branch: false
  await selectStep(page, 'util_log_2');
  await stepPanel(page).getByLabel('Message').fill('low priority');
  return workflowId;
}

test('1. register → workflow → publish → run → SUCCEEDED on the right branch', async ({ page }) => {
  const { workspaceId } = await registerInUi(page, 'Journey One');
  await buildBranchingWorkflow(page, workspaceId, 'Branching journey');
  await saveAndPublish(page);

  await page.getByRole('button', { name: 'Run now' }).click();
  const dialog = page.getByRole('dialog', { name: /Run “Branching journey”/ });
  await dialog.getByLabel('Input (optional JSON)').fill('{"priority":"HIGH"}');
  await dialog.getByRole('button', { name: 'Run' }).click();

  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Succeeded', {
    timeout: 60_000,
  });
  await expect(page.getByText('Branch not taken: condition was true')).toBeVisible();
  const steps = page.getByRole('list', { name: 'Steps' });
  await expect(steps).toContainText('util_log');
  await expectNoTokensInStorage(page);
});

test('2. webhook-triggered workflow (TEST provider) → run appears', async ({ page }) => {
  const { workspaceId } = await registerInUi(page, 'Journey Two');
  const workflowId = await buildBranchingWorkflow(page, workspaceId, 'Webhook journey');
  await saveAndPublish(page);
  // The UI has no TEST trigger (test-only provider); route TEST events to this workflow the
  // same way the backend's own tests do.
  const resource = `e2e-${workflowId.slice(0, 8)}`;
  sql(
    `INSERT INTO "WorkflowTrigger" (id, "workspaceId", "workflowId", "workflowVersionId", provider, "eventType", "resourceKey")
     SELECT gen_random_uuid(), "workspaceId", id, "activeVersionId", 'TEST', 'e2e.event', '${resource}'
     FROM "Workflow" WHERE id = '${workflowId}'`,
  );
  expect(await sendTestWebhook('e2e.event', resource, { priority: 'LOW' })).toBe(202);

  await page.goto(`/w/${workspaceId}/runs`);
  const table = page.getByRole('table');
  await expect(table).toContainText('Webhook journey', { timeout: 60_000 });
  await table.getByRole('link', { name: 'Webhook journey' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Succeeded', {
    timeout: 60_000,
  });
  await expect(page.getByText('Branch not taken: condition was false')).toBeVisible();
});

test('3. failing step → FAILED → retry from the start → linked retry run', async ({ page }) => {
  const { workspaceId } = await registerInUi(page, 'Journey Three');
  await createWorkflow(page, workspaceId, 'Failing journey');
  await addStep(page, /^Manual trigger/);
  await selectStep(page, 'manual_trigger');
  await addStep(page, /^Log message/);
  await selectStep(page, 'util_log');
  // Rendering more than the 16 KB template limit fails the step deterministically.
  await stepPanel(page).getByLabel('Message').fill('{{ trigger.big }}');
  await saveAndPublish(page);

  await page.getByRole('button', { name: 'Run now' }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Input (optional JSON)')
    .fill(JSON.stringify({ big: 'x'.repeat(20_000) }));
  await dialog.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Failed', {
    timeout: 60_000,
  });
  await expect(page.getByRole('region', { name: 'Why the run failed' })).toBeVisible();

  await page.getByRole('button', { name: 'Retry' }).click();
  const retry = page.getByRole('dialog', { name: 'Retry this run?' });
  await retry.getByRole('radio', { name: /Run again from the start/ }).check();
  await retry.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Earlier run')).toBeVisible({ timeout: 30_000 });
  // The uncertain-outcome acknowledgement cannot be produced deterministically against the
  // real worker; it is covered by component tests with the backend's 409 shape (Part 08).
});

test('4. a second user cannot open the first user’s workspace URL', async ({ browser }) => {
  const first = await browser.newContext();
  const a = await first.newPage();
  const { workspaceId } = await registerInUi(a, 'Owner One');

  const second = await browser.newContext();
  const b = await second.newPage();
  await registerInUi(b, 'Stranger Two');
  await b.goto(`/w/${workspaceId}/workflows`);
  await expect(b.getByRole('heading', { name: 'Workspace not found' })).toBeVisible();
  await first.close();
  await second.close();
});

test('5. draft conflict across two pages', async ({ browser }) => {
  const context = await browser.newContext();
  const a = await context.newPage();
  const { workspaceId } = await registerInUi(a, 'Journey Five');
  const workflowId = await createWorkflow(a, workspaceId, 'Conflict journey');
  const b = await context.newPage();
  await b.goto(`/w/${workspaceId}/workflows/${workflowId}`);
  await expect(b.getByRole('heading', { level: 1, name: 'Conflict journey' })).toBeVisible();

  await addStep(a, /^Manual trigger/);
  await a.keyboard.press('Control+s');
  await expect(a.getByText(/^Saved at/)).toBeVisible();

  await addStep(b, /^Log message/);
  await b.keyboard.press('Control+s');
  await expect(b.getByRole('dialog', { name: 'This draft changed elsewhere' })).toBeVisible();
  await b.getByRole('button', { name: 'Reload theirs' }).click();
  await expect(canvasNode(b, 'manual_trigger')).toBeVisible();
  await context.close();
});

test('6. keyboard-only: sign in, open a workflow, connect steps from menus, save', async ({
  page,
  browser,
}) => {
  const setup = await browser.newContext();
  const s = await setup.newPage();
  const { email, workspaceId } = await registerInUi(s, 'Keyboard User');
  const workflowId = await createWorkflow(s, workspaceId, 'Keyboard journey');
  await setup.close();

  await page.goto('/login');
  await page.keyboard.type(email); // email field is focused on load
  await page.keyboard.press('Tab');
  await page.keyboard.type('correct horse battery staple');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/w\//);

  await page.goto(`/w/${workspaceId}/workflows/${workflowId}`);
  const palette = page.getByRole('navigation', { name: 'Steps you can add' });
  await palette.getByRole('button', { name: /^Manual trigger/ }).focus();
  await page.keyboard.press('Enter');
  await palette.getByRole('button', { name: /^Log message/ }).focus();
  await page.keyboard.press('Enter');
  // Nothing selected → the log step is not connected yet; connect it from the trigger's menu.
  await canvasNode(page, 'manual_trigger').focus();
  await page.keyboard.press('Enter');
  const connectTo = stepPanel(page).getByLabel('Connect to');
  await connectTo.focus();
  await connectTo.selectOption('util_log');
  await stepPanel(page).getByRole('button', { name: 'Connect' }).focus();
  await page.keyboard.press('Enter');
  await expect(stepPanel(page)).toContainText('util_log');
  await page.keyboard.press('Control+s');
  await expect(page.getByText(/^Saved at/)).toBeVisible();
});
