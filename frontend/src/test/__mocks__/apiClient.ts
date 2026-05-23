import { vi } from 'vitest';

export const apiClient = {
  get: vi.fn().mockResolvedValue(undefined),
  post: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  healthCheck: vi.fn().mockResolvedValue({ status: 'ok', timestamp: new Date().toISOString(), uptime: 0 }),
};
