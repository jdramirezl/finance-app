/**
 * Test Setup for Pocket Controller Integration Tests
 * 
 * Registers dependencies needed for testing.
 */

import 'reflect-metadata';
import { initializeContainer } from '../../../shared/container';

/**
 * Register dependencies for testing
 */
export function setupTestContainer(): void {
  // Initialize the main container
  // This includes all real implementations for accounts and pockets
  initializeContainer();
}
