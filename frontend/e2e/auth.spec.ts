import { test, expect } from '@playwright/test';
import { hasTestCredentials, getTestCredentials } from './helpers/auth';

test.describe('Login flow', () => {
  // Force unauthenticated state regardless of the project-level storage
  // state. Without this, the saved Supabase session would auto-redirect
  // away from /login.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // Belt-and-suspenders: clear cookies, navigate to the app origin so
    // localStorage.clear() runs against the real origin (it's a no-op on
    // about:blank), then wipe localStorage too.
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Finance App' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');

    const { email, password } = getTestCredentials();
    await page.goto('/login');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/.*login.*/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    // The error banner uses MD3-style hex classes (bg-[#93000a]/20). Match
    // by the partial class fragment so we don't depend on exact tokens.
    await expect(page.locator('div[class*="93000a"]')).toBeVisible({ timeout: 10000 });
  });
});
