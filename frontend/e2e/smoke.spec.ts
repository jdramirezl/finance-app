import { test, expect } from '@playwright/test';

test('app loads login page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
});
