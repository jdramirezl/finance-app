import { test, expect } from '@playwright/test';
import { hasTestCredentials } from './helpers/auth';
import { createTestAccount, createTestPocket } from './helpers/api';
import { cleanupTestData } from './helpers/cleanup';

const QA_ACCOUNT = '[TEST] QA';
const QA_POCKET = '[TEST] QA Pocket';

test.describe('Quick-add and Budget flows', () => {
  test.beforeAll(async () => {
    if (!hasTestCredentials()) return;
    // Ensure deterministic fixtures: an account with a normal pocket so
    // the inline QuickAdd's auto-select resolves to a valid pair, and a
    // fixed pocket so /budget renders the income card instead of its
    // empty state. The fixed-pocket creation is best-effort because
    // only one fixed pocket may exist globally per user.
    const account = await createTestAccount({ name: QA_ACCOUNT });
    await createTestPocket(account.id, { name: QA_POCKET, type: 'normal' });
    try {
      await createTestPocket(account.id, { name: '[TEST] QA Fixed', type: 'fixed' });
    } catch {
      // A fixed pocket already exists for this user — that's fine; the
      // budget page renders correctly as long as one exists somewhere.
    }
  });

  test.afterAll(async () => {
    if (hasTestCredentials()) {
      await cleanupTestData();
    }
  });

  test.beforeEach(async () => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');
  });

  test('quick-add via keyboard shortcut opens modal', async ({ page }) => {
    await page.goto('/');
    // Wait for the Layout to mount before pressing the shortcut: the
    // global keydown listener is registered inside Layout's effect, so
    // pressing too early is a silent no-op. The Summary heading is
    // rendered by SummaryPage which only renders once Layout is up.
    await page.getByRole('heading', { name: 'Summary', level: 1 }).waitFor();
    // Small grace period so the useEffect that adds the keydown handler
    // has flushed.
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+Shift+M');

    const modal = page.getByRole('heading', { name: 'Quick Add' });
    await expect(modal).toBeVisible({ timeout: 5000 });

    // /summary has no inline QuickAdd, so the form here is the modal one.
    const form = page.getByRole('form', { name: 'Quick add movement' });
    await expect(form).toBeVisible();
    // Amount input is labelled via aria-label="Amount" (renamed from
    // "Quick add amount"). The free-text "What for?" field was removed.
    await expect(form.getByLabel('Amount')).toBeVisible();
    await expect(form.getByLabel('Submit quick add')).toBeVisible();
  });

  test('quick-add inline submits a movement on movements page', async ({ page }) => {
    await page.goto('/movements');

    const form = page.getByRole('form', { name: 'Quick add movement' });
    await expect(form).toBeVisible();

    // Auto-select picks accounts[0] and the first pocket on it. If the
    // user's first account happens to have no pockets, submit stays
    // disabled. Pin the form to known fixtures explicitly.
    await form.getByLabel('Account').selectOption({ label: QA_ACCOUNT });
    await form.getByLabel('Pocket').selectOption({ label: QA_POCKET });
    await form.getByLabel('Amount').fill('2.02');
    await form.getByLabel('Submit quick add').click();

    await expect(form.getByText('✓')).toBeVisible({ timeout: 5000 });
  });

  test('budget page accepts income and shows distribution', async ({ page }) => {
    // /budget-planning redirects to /budget; use the canonical path.
    await page.goto('/budget');

    const incomeInput = page.getByPlaceholder('0.00');
    const emptyState = page.getByRole('heading', { name: /no fixed expenses pocket/i });
    // Wait for either the income card or the empty state — both
    // indicate the page has finished its initial fetches.
    await expect(incomeInput.or(emptyState)).toBeVisible({ timeout: 10000 });

    if (await emptyState.isVisible().catch(() => false)) {
      test.skip(true, 'No fixed expenses pocket exists — budget shows empty state');
      return;
    }

    await incomeInput.fill('5000');

    // Distribution footer renders "Generate Movements" (formerly
    // "Create Movements"). The button is always present but disabled
    // until the user adds distribution entries — assert visibility,
    // not enabled state.
    await expect(page.getByRole('button', { name: 'Generate Movements' })).toBeVisible();
  });
});
