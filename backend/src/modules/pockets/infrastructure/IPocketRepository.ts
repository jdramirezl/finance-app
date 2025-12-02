/**
 * Pocket Repository Interface
 * 
 * Defines the contract for pocket data access.
 * Infrastructure layer implements this interface.
 */

import type { Pocket } from '../domain/Pocket';

export interface IPocketRepository {
  /**
   * Save a new pocket
   */
  save(pocket: Pocket, userId: string): Promise<void>;

  /**
   * Find pocket by ID
   */
  findById(id: string, userId: string): Promise<Pocket | null>;

  /**
   * Find all pockets for a specific account
   */
  findByAccountId(accountId: string, userId: string): Promise<Pocket[]>;

  /**
   * Find all pockets for a user
   */
  findAllByUserId(userId: string): Promise<Pocket[]>;

  /**
   * Check if pocket with name exists within an account
   */
  existsByNameInAccount(name: string, accountId: string, userId: string): Promise<boolean>;

  /**
   * Check if pocket with name exists within an account, excluding a specific pocket ID
   * Used during updates to check uniqueness without conflicting with the pocket being updated
   */
  existsByNameInAccountExcludingId(
    name: string,
    accountId: string,
    userId: string,
    excludeId: string
  ): Promise<boolean>;

  /**
   * Check if a fixed pocket exists for the user (global uniqueness)
   */
  existsFixedPocketForUser(userId: string): Promise<boolean>;

  /**
   * Check if a fixed pocket exists for the user, excluding a specific pocket ID
   * Used during updates to check fixed pocket uniqueness without conflicting with the pocket being updated
   */
  existsFixedPocketForUserExcludingId(userId: string, excludeId: string): Promise<boolean>;

  /**
   * Update an existing pocket
   */
  update(pocket: Pocket, userId: string): Promise<void>;

  /**
   * Delete a pocket
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Update display order for multiple pockets
   */
  updateDisplayOrders(pocketIds: string[], userId: string): Promise<void>;
}
