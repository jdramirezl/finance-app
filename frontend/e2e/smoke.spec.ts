import { test, expect } from '@playwright/test';

// Force unauthenticated state — going to '/' otherwise redirects to '/summary'
// when the project's storage state still has a valid Supabase session.
test.use({ storageState: { cookies: [], origins: [] } });

test('app loads login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Finance App' })).toBeVisible();
});
