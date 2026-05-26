import { test, expect } from '@playwright/test';
import { hasTestCredentials } from './helpers/auth';
import { createTestAccount, createTestPocket, deleteTestData } from './helpers/api';

let testAccountId: string;
let testPocketId: string;
let targetAccountId: string;
let targetPocketId: string;

test.describe.serial('Movement CRUD + Transfer', () => {
  test.beforeAll(async () => {
    if (!hasTestCredentials()) return;
    await deleteTestData();
    const account = await createTestAccount();
    testAccountId = account.id;
    const pocket = await createTestPocket(testAccountId);
    testPocketId = pocket.id;
    const targetAccount = await createTestAccount({ name: '[TEST] Target Account' });
    targetAccountId = targetAccount.id;
    const targetPocket = await createTestPocket(targetAccountId, { name: '[TEST] Target Pocket' });
    targetPocketId = targetPocket.id;
  });

  test.afterAll(async () => {
    if (!hasTestCredentials()) return;
    await deleteTestData();
  });

  test.fixme('create a movement', async ({ page }) => {
    // FIXME: Account/pocket selection doesn't work in CI — the AccountPocketSelector
    // auto-select feature or custom dropdown doesn't match selectOption() calls.
    // Needs investigation with Playwright trace/screenshot to debug.
    test.skip(!hasTestCredentials(), 'Test credentials not configured');

    await page.goto('/movements?action=new');
    // Wait for the movement form to be visible
    const amountInput = page.locator('input[type="number"]').first();
    await expect(amountInput).toBeVisible({ timeout: 15000 });
    // Fill form
    await page.getByLabel('Type').selectOption('EgresoNormal');
    await amountInput.fill('100');
    await page.getByLabel('Notes').fill('[TEST] Expense Movement');

    // Select account and pocket via the AccountPocketSelector
    await page.getByLabel(/source account|account/i).first().selectOption(testAccountId);
    await page.getByLabel(/source pocket|pocket/i).first().selectOption(testPocketId);

    await page.getByRole('button', { name: /create movement/i }).click();

    // Wait for form to close, then reload to ensure fresh data
    await page.waitForTimeout(2000);
    await page.reload();

    // Verify it appears in the list (allow time for mutation + refetch in CI)
    await expect(page.getByText('[TEST] Expense Movement')).toBeVisible({ timeout: 30000 });
  });

  test.fixme('inline edit movement amount', async ({ page }) => {
    // FIXME: Depends on 'create a movement' which is broken in CI
    test.skip(!hasTestCredentials(), 'Test credentials not configured');

    await page.goto('/movements');
    // Expand the current month section if collapsed
    const monthHeader = page.locator('button[aria-expanded]').first();
    const isExpanded = await monthHeader.getAttribute('aria-expanded');
    if (isExpanded === 'false') await monthHeader.click();

    // Find the test movement's amount and click to edit
    const amountButton = page.getByRole('button', { name: /edit amount.*100/i }).first();
    await amountButton.click();

    // Edit inline
    const input = page.getByLabel('Edit amount');
    await input.fill('200');
    await input.press('Enter');

    // Verify updated
    await expect(page.getByRole('button', { name: /edit amount.*200/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test.fixme('create a transfer', async ({ page }) => {
    // FIXME: Test data isolation issues — leftover data from previous runs + account cleanup race
    test.skip(!hasTestCredentials(), 'Test credentials not configured');

    await page.goto('/movements?action=transfer');
    // Wait for form to render
    const amountInput = page.locator('input[type="number"]').first();
    await expect(amountInput).toBeVisible({ timeout: 15000 });
    // Select Transfer type
    await page.getByLabel('Type').selectOption('Transfer');
    await amountInput.fill('50');
    await page.getByLabel('Notes').fill('[TEST] Transfer');

    // Source
    await page.getByLabel(/source account/i).first().selectOption(testAccountId);
    await page.getByLabel(/source pocket/i).first().selectOption(testPocketId);

    // Target
    await page.getByLabel(/target account/i).selectOption(targetAccountId);
    await page.getByLabel(/target pocket/i).selectOption(targetPocketId);

    await page.getByRole('button', { name: /transfer funds/i }).click();

    // Wait for form to close, then reload to ensure fresh data
    await page.waitForTimeout(2000);
    await page.reload();

    // Verify transfer note appears in list
    await expect(page.getByText('[TEST] Transfer')).toBeVisible({ timeout: 30000 });
  });

  test.fixme('delete a movement', async ({ page }) => {
    // FIXME: Depends on 'create a movement' which is broken in CI
    test.skip(!hasTestCredentials(), 'Test credentials not configured');

    await page.goto('/movements');
    // Expand month if needed
    const monthHeader = page.locator('button[aria-expanded]').first();
    const isExpanded = await monthHeader.getAttribute('aria-expanded');
    if (isExpanded === 'false') await monthHeader.click();

    // Find and delete the test expense movement
    const row = page.locator('div').filter({ hasText: '[TEST] Expense Movement' }).first();
    await row.getByRole('button', { name: /delete movement/i }).click();

    // Confirm deletion if dialog appears
    const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i });
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Verify gone
    await expect(page.getByText('[TEST] Expense Movement')).not.toBeVisible({ timeout: 10000 });
  });
});
