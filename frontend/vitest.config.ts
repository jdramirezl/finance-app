import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '../lib/supabase': path.resolve(__dirname, 'src/test/__mocks__/supabase.ts'),
      '../../lib/supabase': path.resolve(__dirname, 'src/test/__mocks__/supabase.ts'),
      '../services/apiClient': path.resolve(__dirname, 'src/test/__mocks__/apiClient.ts'),
      '../../services/apiClient': path.resolve(__dirname, 'src/test/__mocks__/apiClient.ts'),
      './apiClient': path.resolve(__dirname, 'src/test/__mocks__/apiClient.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules/**', 'e2e/**'],
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'e2e/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
    },
  },
});
