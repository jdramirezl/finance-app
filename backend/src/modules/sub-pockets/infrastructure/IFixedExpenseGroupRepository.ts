/**
 * FixedExpenseGroup Repository Interface
 * 
 * Defines the contract for fixed expense group data access.
 * Infrastructure layer implements this interface.
 */

import type { FixedExpenseGroup } from '../domain/FixedExpenseGroup';

export interface IFixedExpenseGroupRepository {
  /**
   * Save a new fixed expense group
   */
  save(group: FixedExpenseGroup, userId: string): Promise<void>;

  /**
   * Find group by ID
   */
  findById(id: string, userId: string): Promise<FixedExpenseGroup | null>;

  /**
   * Find all groups for a user
   */
  findAllByUserId(userId: string): Promise<FixedExpenseGroup[]>;

  /**
   * Update an existing group
   */
  update(group: FixedExpenseGroup, userId: string): Promise<void>;

  /**
   * Delete a group
   */
  delete(id: string, userId: string): Promise<void>;
}
