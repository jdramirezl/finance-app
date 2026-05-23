import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageStatePath = path.resolve(__dirname, 'e2e/.auth/storage-state.json');

export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:5173',
  globalSetup: './e2e/global-setup.ts',
  use: {
    headless: true,
    storageState: storageStatePath,
  },
  webServer: [
    {
      command: 'npm run dev --workspace=backend',
      port: 3001,
      reuseExistingServer: true,
      cwd: path.resolve(__dirname, '..'),
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
