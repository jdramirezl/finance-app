import { test, expect } from '@playwright/test';
import { hasTestCredentials } from './helpers/auth';
import { createTestAccount, createTestPocket, deleteTestData } from './helpers/api';

let testAccountId: string;
let testPocketId: string;
let targetAccountId: string;
let targetPocketId: string;

test.describe('Movement CRUD + Transfer', () => {
  test.beforeAll(async () => {
    if (!hasTestCredentials()) return;
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

  test('create a movement', async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');

    await page.goto('/movements?action=new');
    // Fill form
    await page.getByLabel('Type').selectOption('EgresoNormal');
    await page.getByLabel('Amount').fill('100');
    await page.getByLabel('Notes').fill('[TEST] Expense Movement');

    // Select account and pocket via the AccountPocketSelector
    await page.getByLabel(/source account|account/i).first().selectOption(testAccountId);
    await page.getByLabel(/source pocket|pocket/i).first().selectOption(testPocketId);

    await page.getByRole('button', { name: /create movement/i }).click();

    // Verify it appears in the list
    await expect(page.getByText('[TEST] Expense Movement')).toBeVisible({ timeout: 10000 });
  });

  test('inline edit movement amount', async ({ page }) => {
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

  test('create a transfer', async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');

    await page.goto('/movements?action=transfer');
    // Select Transfer type
    await page.getByLabel('Type').selectOption('Transfer');
    await page.getByLabel('Amount').fill('50');
    await page.getByLabel('Notes').fill('[TEST] Transfer');

    // Source
    await page.getByLabel(/source account/i).first().selectOption(testAccountId);
    await page.getByLabel(/source pocket/i).first().selectOption(testPocketId);

    // Target
    await page.getByLabel(/target account/i).selectOption(targetAccountId);
    await page.getByLabel(/target pocket/i).selectOption(targetPocketId);

    await page.getByRole('button', { name: /transfer funds/i }).click();

    // Verify transfer note appears in list
    await expect(page.getByText('[TEST] Transfer')).toBeVisible({ timeout: 10000 });
  });

  test('delete a movement', async ({ page }) => {
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
