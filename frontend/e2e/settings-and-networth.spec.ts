import { test, expect } from '@playwright/test';
import { hasTestCredentials } from './helpers/auth';

test.describe('Settings and Net Worth flows', () => {
  let originalCurrency: string | null = null;
  let originalDisplayMode: string | null = null;

  test.beforeAll(() => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');
  });

  test.afterAll(async ({ browser }) => {
    if (!hasTestCredentials()) return;
    // Restore original settings
    const context = await browser.newContext({ storageState: 'e2e/.auth/storage-state.json' });
    const page = await context.newPage();
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")');

    if (originalCurrency) {
      await page.getByRole('radio', { name: originalCurrency }).check();
      await page.waitForTimeout(500);
    }
    if (originalDisplayMode) {
      await page.getByRole('radio', { name: new RegExp(originalDisplayMode, 'i') }).check();
      await page.waitForTimeout(500);
    }
    await context.close();
  });

  test('Settings: change display mode persists after reload', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")');

    // Capture original display mode for Regular Accounts
    const compactRadio = page.locator('input[name="normalAccountDisplay"][value="compact"]');
    const detailedRadio = page.locator('input[name="normalAccountDisplay"][value="detailed"]');

    const isCompact = await compactRadio.isChecked();
    originalDisplayMode = isCompact ? 'compact' : 'detailed';

    // Toggle to the opposite mode
    const targetMode = isCompact ? detailedRadio : compactRadio;
    await targetMode.check();
    await page.waitForTimeout(500);

    // Reload and verify persistence
    await page.reload();
    await page.waitForSelector('h1:has-text("Settings")');

    const expectedRadio = isCompact ? detailedRadio : compactRadio;
    await expect(expectedRadio).toBeChecked();
  });

  test('Settings: change primary currency', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")');

    // Find the currently active currency
    const activeLabel = page.locator('input[name="primaryCurrency"]:checked');
    originalCurrency = await activeLabel.getAttribute('value');

    // Pick a different currency
    const targetCurrency = originalCurrency === 'USD' ? 'EUR' : 'USD';
    await page.getByRole('radio', { name: targetCurrency }).check();
    await page.waitForTimeout(500);

    // Navigate to summary and verify the currency is reflected
    await page.goto('/summary');
    await page.waitForTimeout(1000);

    // The page should contain the target currency symbol or code somewhere
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain(targetCurrency === 'USD' ? '$' : '€');
  });

  test('Net worth: view timeline chart', async ({ page }) => {
    await page.goto('/summary');

    // The net worth widget should be visible (either chart or empty state)
    const widget = page.locator('text=Net Worth Timeline').first();
    await expect(widget).toBeVisible({ timeout: 10000 });
  });

  test('Net worth: breakdown view toggle', async ({ page }) => {
    await page.goto('/summary');
    await page.waitForSelector('text=Net Worth Timeline', { timeout: 10000 });

    // Click "By Currency" button
    const byCurrencyBtn = page.getByRole('button', { name: 'By Currency' });
    await byCurrencyBtn.click();

    // Verify the button is now active (has the active class)
    await expect(byCurrencyBtn).toHaveClass(/bg-blue-500/);

    // Click "Total" to switch back
    const totalBtn = page.getByRole('button', { name: 'Total' });
    await totalBtn.click();
    await expect(totalBtn).toHaveClass(/bg-blue-500/);
  });
});
