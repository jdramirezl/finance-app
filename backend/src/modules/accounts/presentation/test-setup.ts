/**
 * Test Setup for Account Controller Integration Tests
 * 
 * Registers mock dependencies needed for testing.
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { createClient } from '@supabase/supabase-js';
import { initializeContainer } from '../../../shared/container';

/**
 * Mock Pocket Repository for testing
 * 
 * This is a minimal implementation that allows account deletion tests to work.
 * The full PocketRepository will be implemented in Phase 2.
 */
class MockPocketRepository {
  private supabase: any;

  constructor() {
    // Only create Supabase client if credentials are available
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );
    }
  }

  async findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; balance: number }>> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('pockets')
      .select('id, account_id, balance')
      .eq('account_id', accountId)
      .eq('user_id', userId);

    if (error) {
      return [];
    }

    return data || [];
  }
}

/**
 * Register mock dependencies for testing
 */
export function setupTestContainer(): void {
  // Initialize the main container first
  initializeContainer();

  // Register mock PocketRepository
  container.register('PocketRepository', {
    useClass: MockPocketRepository,
  });
}
