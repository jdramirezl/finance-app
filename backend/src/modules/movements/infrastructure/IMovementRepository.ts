/**
 * Movement Repository Interface
 * 
 * Defines the contract for movement data access operations.
 * This interface is defined by the domain layer and implemented by the infrastructure layer.
 */

import type { Movement } from '../domain/Movement';
import type { Currency } from '@shared-backend/types';

/**
 * Query filters for movements
 */
export interface MovementFilters {
  accountId?: string;
  pocketId?: string;
  subPocketId?: string;
  isPending?: boolean;
  isOrphaned?: boolean;
  startDate?: Date;
  endDate?: Date;
  year?: number;
  month?: number; // 1-12
  category?: string;
  tags?: string[];
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Parameters for atomic transfer via RPC
 */
export interface CreateTransferAtomicParams {
  userId: string;
  sourceAccountId: string;
  sourcePocketId: string;
  targetAccountId: string;
  targetPocketId: string;
  amount: number;
  displayedDate: string;
  notes?: string;
}

/**
 * Parameters for a single movement in a batch create
 */
export interface BatchMovementParams {
  type: string;
  accountId: string;
  pocketId: string;
  subPocketId?: string;
  amount: number;
  notes?: string;
  displayedDate: string;
  isPending?: boolean;
  category?: string;
  tags?: string[];
}

/**
 * Repository interface for Movement entity
 */
export interface IMovementRepository {
  /**
   * Save a new movement to the database
   */
  save(movement: Movement, userId: string): Promise<void>;

  /**
   * Atomically create a transfer (expense + income) via RPC
   */
  createTransferAtomic(params: CreateTransferAtomicParams): Promise<{ expense: Movement; income: Movement }>;

  /**
   * Atomically create multiple movements via RPC
   */
  batchCreate(movements: BatchMovementParams[], userId: string): Promise<Movement[]>;

  /**
   * Find movement by ID
   */
  findById(id: string, userId: string): Promise<Movement | null>;

  /**
   * Find all movements for a user with optional filters and pagination
   */
  findAll(
    userId: string,
    filters?: MovementFilters,
    pagination?: PaginationOptions
  ): Promise<Movement[]>;

  /**
   * Find movements by account ID
   */
  findByAccountId(
    accountId: string,
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]>;

  /**
   * Find movements by pocket ID
   */
  findByPocketId(
    pocketId: string,
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]>;

  /**
   * Find movements by sub-pocket ID
   */
  findBySubPocketId(
    subPocketId: string,
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]>;

  /**
   * Find movements by month
   */
  findByMonth(
    year: number,
    month: number,
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]>;

  /**
   * Find pending movements
   */
  findPending(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]>;

  /**
   * Find orphaned movements
   */
  findOrphaned(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<Movement[]>;

  /**
   * Find orphaned movements matching account name and currency
   */
  findOrphanedByAccount(
    accountName: string,
    accountCurrency: Currency,
    userId: string
  ): Promise<Movement[]>;

  /**
   * Find orphaned movements matching account and pocket name
   */
  findOrphanedByAccountAndPocket(
    accountName: string,
    accountCurrency: Currency,
    pocketName: string,
    userId: string
  ): Promise<Movement[]>;

  /**
   * Update an existing movement
   */
  update(movement: Movement, userId: string): Promise<void>;

  /**
   * Delete a movement
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Delete all movements for an account (hard delete)
   */
  deleteByAccountId(accountId: string, userId: string): Promise<number>;

  /**
   * Delete all movements for a pocket (hard delete)
   */
  deleteByPocketId(pocketId: string, userId: string): Promise<number>;

  /**
   * Mark all movements for an account as orphaned
   */
  markAsOrphanedByAccountId(
    accountId: string,
    accountName: string,
    accountCurrency: Currency,
    userId: string
  ): Promise<number>;

  /**
   * Mark all movements for a pocket as orphaned
   */
  markAsOrphanedByPocketId(
    pocketId: string,
    pocketName: string,
    userId: string
  ): Promise<number>;

  /**
   * Update account ID for all movements in a pocket (used during pocket migration)
   */
  updateAccountIdByPocketId(
    pocketId: string,
    newAccountId: string,
    userId: string
  ): Promise<number>;

  /**
   * Count movements by filters
   */
  count(userId: string, filters?: MovementFilters): Promise<number>;

  /**
   * Sum expenses by period, grouped by currency.
   * Joins with accounts table to derive currency.
   * Only counts expense types (EgresoNormal, EgresoFijo), excludes pending movements.
   */
  sumExpensesByPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ currency: Currency; total: number }[]>;
}
