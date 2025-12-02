/**
 * SubPocket Repository Interface
 * 
 * Defines the contract for sub-pocket data access.
 * Infrastructure layer implements this interface.
 */

import type { SubPocket } from '../domain/SubPocket';

export interface ISubPocketRepository {
  /**
   * Save a new sub-pocket
   */
  save(subPocket: SubPocket, userId: string): Promise<void>;

  /**
   * Find sub-pocket by ID
   */
  findById(id: string, userId: string): Promise<SubPocket | null>;

  /**
   * Find all sub-pockets for a specific pocket
   */
  findByPocketId(pocketId: string, userId: string): Promise<SubPocket[]>;

  /**
   * Find all sub-pockets for a specific group
   */
  findByGroupId(groupId: string, userId: string): Promise<SubPocket[]>;

  /**
   * Find all sub-pockets for a user
   */
  findAllByUserId(userId: string): Promise<SubPocket[]>;

  /**
   * Update an existing sub-pocket
   */
  update(subPocket: SubPocket, userId: string): Promise<void>;

  /**
   * Delete a sub-pocket
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Update display order for multiple sub-pockets
   */
  updateDisplayOrders(subPocketIds: string[], userId: string): Promise<void>;

  /**
   * Count movements for a sub-pocket
   * Used to check if sub-pocket can be deleted
   */
  countMovements(subPocketId: string, userId: string): Promise<number>;

  /**
   * Check if sub-pocket has any movements
   * Used to prevent deletion of sub-pockets with movements
   */
  hasMovements(subPocketId: string, userId: string): Promise<boolean>;
}
