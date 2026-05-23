import { test, expect, type Page, type Locator } from '@playwright/test';
import { hasTestCredentials } from './helpers/auth';
import { deleteTestData } from './helpers/api';

const TEST_ACCOUNT_NAME = '[TEST] E2E Account';
const TEST_ACCOUNT_RENAMED = '[TEST] E2E Renamed';
const TEST_POCKET_NAME = '[TEST] E2E Pocket';

/**
 * Locate the AccountCard row that contains a given account name AND an
 * "Edit" button. Filtering on both anchors keeps us out of the
 * AccountDetailPanel header (which uses different labels: "Edit
 * Account" / "Delete All"). The list renders the smallest matching
 * <div> innermost so `.last()` picks the actual card-level container.
 */
const accountRow = (page: Page, name: string): Locator =>
  page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name, level: 3 }) })
    .filter({ has: page.getByRole('button', { name: 'Edit', exact: true }) })
    .last();

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

    // Scope subsequent finds to the open modal: when the Accounts page
    // is empty (no non-test accounts), the EmptyState renders a CTA
    // labelled "Create Account" that conflicts with the form submit
    // button under the same accessible name.
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Account Name').fill(TEST_ACCOUNT_NAME);
    await dialog.getByLabel('Currency').selectOption('USD');
    await dialog.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText(TEST_ACCOUNT_NAME).first()).toBeVisible();
  });

  test('edits an account', async ({ page }) => {
    await accountRow(page, TEST_ACCOUNT_NAME)
      .getByRole('button', { name: 'Edit', exact: true })
      .click();

    const dialog = page.getByRole('dialog');
    // Wait for the form to render with the current account name before
    // overwriting it; otherwise fill() can race the form's
    // defaultValues hydration.
    const nameInput = dialog.getByLabel('Account Name');
    await expect(nameInput).toHaveValue(TEST_ACCOUNT_NAME);
    await nameInput.fill(TEST_ACCOUNT_RENAMED);
    await dialog.getByRole('button', { name: 'Update Account' }).click();

    // Wait for the modal to close, then for the renamed account to
    // surface in the list (cache invalidation happens after the
    // mutation resolves).
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await expect(page.getByText(TEST_ACCOUNT_RENAMED).first()).toBeVisible({ timeout: 10000 });
  });

  test('creates a pocket', async ({ page }) => {
    // Click the card's heading (not its action buttons) to open the
    // detail panel where pockets live.
    await page
      .getByRole('heading', { name: TEST_ACCOUNT_RENAMED, level: 3 })
      .first()
      .click();
    await page.getByRole('button', { name: 'Create new pocket' }).click();
    await page.getByLabel('Pocket Name').fill(TEST_POCKET_NAME);
    await page.getByRole('button', { name: 'Create Pocket' }).click();

    await expect(page.getByText(TEST_POCKET_NAME)).toBeVisible();
  });

  test('deletes an account', async ({ page }) => {
    // The "Delete" button on the AccountCard opens a regular confirm
    // dialog and the backend rejects DELETE /api/accounts/:id with 409
    // when pockets exist. The cascade flow lives in the detail panel:
    // select the account → "Delete All" → "Delete Everything".
    await page
      .getByRole('heading', { name: TEST_ACCOUNT_RENAMED, level: 3 })
      .first()
      .click();
    await page.getByRole('button', { name: 'Delete All' }).click();
    await page.getByRole('button', { name: 'Delete Everything' }).click();

    await expect(page.getByText(TEST_ACCOUNT_RENAMED)).not.toBeVisible();
  });
});
