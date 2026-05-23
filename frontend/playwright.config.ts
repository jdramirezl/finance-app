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
    baseURL: 'http://localhost:5173',
  },
  webServer: [
    {
      command: 'cd backend && npx ts-node-dev --respawn --transpile-only src/server.ts',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      cwd: path.resolve(__dirname, '..'),
      timeout: 30000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
