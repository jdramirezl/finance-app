import { test, expect } from '@playwright/test';
import { hasTestCredentials } from './helpers/auth';
import { deleteTestData } from './helpers/api';

const TEST_ACCOUNT_NAME = '[TEST] E2E Account';
const TEST_ACCOUNT_RENAMED = '[TEST] E2E Renamed';
const TEST_POCKET_NAME = '[TEST] E2E Pocket';

test.describe('Account Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');
    await page.goto('/accounts');
  });

  test.afterAll(async () => {
    if (hasTestCredentials()) {
      await deleteTestData();
    }
  });

  test('creates a new account', async ({ page }) => {
    await page.getByRole('button', { name: 'Create new account' }).click();
    await page.getByLabel('Account Name').fill(TEST_ACCOUNT_NAME);
    await page.getByLabel('Currency').selectOption('USD');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText(TEST_ACCOUNT_NAME)).toBeVisible();
  });

  test('edits an account', async ({ page }) => {
    const card = page.getByText(TEST_ACCOUNT_NAME).locator('..').locator('..');
    await card.getByRole('button', { name: 'Edit' }).click();

    await page.getByLabel('Account Name').clear();
    await page.getByLabel('Account Name').fill(TEST_ACCOUNT_RENAMED);
    await page.getByRole('button', { name: 'Update Account' }).click();

    await expect(page.getByText(TEST_ACCOUNT_RENAMED)).toBeVisible();
  });

  test('creates a pocket', async ({ page }) => {
    await page.getByText(TEST_ACCOUNT_RENAMED).click();
    await page.getByRole('button', { name: 'Create new pocket' }).click();
    await page.getByLabel('Pocket Name').fill(TEST_POCKET_NAME);
    await page.getByRole('button', { name: 'Create Pocket' }).click();

    await expect(page.getByText(TEST_POCKET_NAME)).toBeVisible();
  });

  test('deletes an account', async ({ page }) => {
    const card = page.getByText(TEST_ACCOUNT_RENAMED).locator('..').locator('..');
    await card.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete Everything' }).click();

    await expect(page.getByText(TEST_ACCOUNT_RENAMED)).not.toBeVisible();
  });
});
