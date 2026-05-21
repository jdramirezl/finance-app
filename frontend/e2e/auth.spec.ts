import { test, expect } from '@playwright/test';
import { hasTestCredentials, getTestCredentials } from './helpers/auth';

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage state so we start unauthenticated for login tests
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Finance App' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    test.skip(!hasTestCredentials(), 'Test credentials not configured');

    const { email, password } = getTestCredentials();
    await page.goto('/');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/.*login.*/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('.bg-red-50, .bg-red-900\\/20')).toBeVisible({ timeout: 10000 });
  });
});
