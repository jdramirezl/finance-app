import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { hasTestCredentials, getTestCredentials } from './helpers/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageStatePath = path.resolve(__dirname, '.auth/storage-state.json');

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

  if (!hasTestCredentials()) {
    fs.writeFileSync(storageStatePath, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const { email, password } = getTestCredentials();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/');

  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}
