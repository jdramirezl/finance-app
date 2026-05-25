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

  /**
   * Get the distinct stock symbols across all active (non-archived) investment
   * accounts in the system.
   *
   * Used by the stock price use case to size its cache window dynamically:
   * with N symbols and 25 free-tier API calls/day, we can refresh each symbol
   * roughly every `Math.ceil(N * 24 / 25)` hours without exceeding the quota.
   *
   * Crosses user boundaries on purpose — the price cache is global (one
   * `stock_prices` row per symbol regardless of which user holds it) so the
   * sizing input must be global too.
   */
  getDistinctActiveSymbols(): Promise<string[]>;
}
