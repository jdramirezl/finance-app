import { test, expect } from '@playwright/test';
import { hasTestCredentials } from './helpers/auth';

test.describe('Settings and Net Worth flows', () => {
  let originalCurrency: string | null = null;
  let originalDisplayMode: 'compact' | 'detailed' | null = null;

  test.beforeAll(() => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');
  });

  test.afterAll(async ({ browser }) => {
    if (!hasTestCredentials()) return;
    // Restore the user's pre-test settings so the suite is idempotent.
    const context = await browser.newContext({ storageState: 'e2e/.auth/storage-state.json' });
    const page = await context.newPage();
    await page.goto('/settings');
    await page.getByRole('heading', { name: 'Settings' }).waitFor();

    if (originalCurrency) {
      // PreferencesSection renders a <select> for the base currency. The
      // <label> isn't associated via htmlFor, so locate the select via
      // its sibling label.
      const currencySelect = page.locator('label:has-text("Base Currency") + select');
      await currencySelect.selectOption(originalCurrency);
      await page.waitForTimeout(500);
    }
    if (originalDisplayMode) {
      // Display section is hidden behind nav; click into it before
      // toggling the radio.
      await page.getByRole('button', { name: 'Display' }).click();
      const restoreRadio = page.locator(
        `input[name="normalAccountDisplay"][value="${originalDisplayMode}"]`,
      );
      await restoreRadio.click();
      await expect(restoreRadio).toBeChecked({ timeout: 5000 });
    }
    await context.close();
  });

  test('Settings: change display mode persists after reload', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('heading', { name: 'Settings' }).waitFor();

    // The Display section isn't the default — navigate to it first.
    await page.getByRole('button', { name: 'Display' }).click();

    const compactRadio = page.locator('input[name="normalAccountDisplay"][value="compact"]');
    const detailedRadio = page.locator('input[name="normalAccountDisplay"][value="detailed"]');

    const isCompact = await compactRadio.isChecked();
    originalDisplayMode = isCompact ? 'compact' : 'detailed';

    // Toggle to the opposite mode. The radio is controlled and its
    // `checked` only flips after the update mutation resolves, so use
    // .click() (no synchronous state assertion) plus a follow-up
    // `toBeChecked()` with timeout instead of .check().
    const targetMode = isCompact ? detailedRadio : compactRadio;
    await targetMode.click();
    await expect(targetMode).toBeChecked({ timeout: 5000 });

    // Reload, re-enter the Display tab, and verify persistence.
    await page.reload();
    await page.getByRole('heading', { name: 'Settings' }).waitFor();
    await page.getByRole('button', { name: 'Display' }).click();

    const expectedRadio = isCompact ? detailedRadio : compactRadio;
    await expect(expectedRadio).toBeChecked();
  });

  test('Settings: change primary currency', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('heading', { name: 'Settings' }).waitFor();

    // Navigate to Preferences section (default active)
    const currencySelect = page.locator('select').filter({ has: page.locator(`option[value="USD"]`) }).first();
    await currencySelect.waitFor({ state: 'visible', timeout: 5000 });
    originalCurrency = await currencySelect.inputValue();

    const targetCurrency = originalCurrency === 'USD' ? 'EUR' : 'USD';
    await currencySelect.selectOption(targetCurrency);

    // Wait for the mutation to settle
    await page.waitForTimeout(1500);

    // Verify the choice is reflected on the summary page.
    await page.goto('/summary');
    await page.waitForLoadState('networkidle');
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain(targetCurrency === 'USD' ? '$' : '€');
  });

  test('Net worth: timeline widget is rendered', async ({ page }) => {
    await page.goto('/summary');

    // The widget renders the chart heading when there is at least one
    // snapshot, and an empty-state copy otherwise. Either is a valid
    // signal that the widget mounted.
    const successHeading = page.getByRole('heading', { name: 'Net Worth Timeline' });
    const emptyState = page.getByText('No net worth data yet');
    await expect(successHeading.or(emptyState).first()).toBeVisible({ timeout: 10000 });
  });

  test('Net worth: breakdown view toggle', async ({ page }) => {
    await page.goto('/summary');

    // The view-mode buttons are only rendered inside the success branch
    // of the widget; if there are no snapshots, skip.
    const successHeading = page.getByRole('heading', { name: 'Net Worth Timeline' });
    const heading = await successHeading.isVisible().catch(() => false);
    test.skip(!heading, 'No net worth snapshots — widget shows empty state');

    const byCurrencyBtn = page.getByRole('button', { name: 'By Currency' });
    await byCurrencyBtn.click();
    await expect(byCurrencyBtn).toHaveClass(/bg-blue-500/);

    const totalBtn = page.getByRole('button', { name: 'Total', exact: true });
    await totalBtn.click();
    await expect(totalBtn).toHaveClass(/bg-blue-500/);
  });
});
