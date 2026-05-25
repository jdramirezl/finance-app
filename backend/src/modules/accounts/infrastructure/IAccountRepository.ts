/**
 * Account Repository Interface
 * 
 * Defines the contract for account data access.
 * Infrastructure layer implements this interface.
 */

import type { Account } from '../domain/Account';
import type { Currency } from '@shared-backend/types';

export interface IAccountRepository {
  /**
   * Save a new account
   */
  save(account: Account, userId: string): Promise<void>;

  /**
   * Find account by ID
   */
  findById(id: string, userId: string): Promise<Account | null>;

  /**
   * Find all accounts for a user
   *
   * @param userId - The owning user's id
   * @param includeArchived - When true, archived accounts are included.
   *                          Defaults to false (active accounts only).
   */
  findAllByUserId(userId: string, includeArchived?: boolean): Promise<Account[]>;

  /**
   * Check if account with name and currency exists for user
   */
  existsByNameAndCurrency(name: string, currency: Currency, userId: string): Promise<boolean>;

  /**
   * Check if account with name and currency exists for user, excluding specific account ID
   */
  existsByNameAndCurrencyExcludingId(
    name: string,
    currency: Currency,
    userId: string,
    excludeId: string
  ): Promise<boolean>;

  /**
   * Update an existing account
   */
  update(account: Account, userId: string): Promise<void>;

  /**
   * Delete an account
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Archive (soft-delete) an account by setting its archived_at timestamp.
   * Archived accounts are excluded from default list queries but their
   * historical movements remain intact.
   */
  archive(id: string, userId: string): Promise<void>;

  /**
   * Restore a previously archived account by clearing its archived_at timestamp.
   */
  unarchive(id: string, userId: string): Promise<void>;

  /**
   * Update display order for multiple accounts
   */
  updateDisplayOrders(accountIds: string[], userId: string): Promise<void>;
}
