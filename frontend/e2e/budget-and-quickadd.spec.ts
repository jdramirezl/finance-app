import { test, expect } from '@playwright/test';
import { hasTestCredentials } from './helpers/auth';
import { cleanupTestData } from './helpers/cleanup';

const TEST_NOTE = '[TEST] e2e-budget-quickadd';

test.describe('Quick-add and Budget flows', () => {
  test.beforeEach(async () => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');
  });

  test.afterAll(async () => {
    if (hasTestCredentials()) {
      await cleanupTestData();
    }
  });

  test('quick-add via keyboard shortcut opens modal and submits', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+Shift+M');

    const modal = page.getByRole('heading', { name: 'Quick Add' });
    await expect(modal).toBeVisible();

    const form = page.getByRole('form', { name: 'Quick add movement' });
    await form.getByLabel('Quick add amount').fill('1.01');
    await form.getByPlaceholder('What for?').fill(TEST_NOTE);
    await form.getByLabel('Submit quick add').click();

    // Success indicator appears
    await expect(form.getByText('✓')).toBeVisible({ timeout: 5000 });
  });

  test('quick-add inline on movements page', async ({ page }) => {
    await page.goto('/movements');

    const form = page.getByRole('form', { name: 'Quick add movement' });
    await expect(form).toBeVisible();

    await form.getByLabel('Quick add amount').fill('2.02');
    await form.getByPlaceholder('What for?').fill(TEST_NOTE);
    await form.getByLabel('Submit quick add').click();

    await expect(form.getByText('✓')).toBeVisible({ timeout: 5000 });
  });

  test('budget page accepts income and shows distribution', async ({ page }) => {
    await page.goto('/budget-planning');

    const incomeInput = page.getByLabel('Initial Amount');
    await expect(incomeInput).toBeVisible();

    await incomeInput.fill('5000');

    // Summary card should appear when amount > 0
    await expect(page.getByText('Create Movements')).toBeVisible();
  });
});
