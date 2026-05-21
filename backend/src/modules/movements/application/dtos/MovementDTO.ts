/**
 * Movement DTOs
 * 
 * Data Transfer Objects for movement-related operations.
 */

import type { Currency, MovementType } from '@shared-backend/types';

/**
 * DTO for creating a new movement
 */
export interface CreateMovementDTO {
  type: MovementType;
  accountId: string;
  pocketId: string;
  amount: number;
  displayedDate: string; // ISO date string
  notes?: string;
  subPocketId?: string;
  isPending?: boolean;
}

/**
 * DTO for updating a movement
 */
export interface UpdateMovementDTO {
  type?: MovementType;
  amount?: number;
  displayedDate?: string; // ISO date string
  notes?: string;
  subPocketId?: string | null;
  accountId?: string;
  pocketId?: string;
}

/**
 * DTO for movement response
 */
export interface MovementResponseDTO {
  id: string;
  type: MovementType;
  accountId: string;
  pocketId: string;
  amount: number;
  displayedDate: string; // ISO date string
  notes?: string;
  subPocketId?: string;
  isPending: boolean;
  isOrphaned: boolean;
  orphanedAccountName?: string;
  orphanedAccountCurrency?: Currency;
  orphanedPocketName?: string;
  createdAt?: string;
}

/**
 * DTO for restore orphaned movements result
 */
export interface RestoreOrphanedResultDTO {
  restored: number;
  failed: number;
}

/**
 * DTO for paginated movement list responses (e.g. GET /api/movements
 * without filters). The total count and hasMore flag let the frontend
 * render pagination controls without an extra round-trip.
 */
export interface PaginatedMovementsDTO {
  /** The page of movements, ordered by displayed date descending. */
  data: MovementResponseDTO[];
  /** Total number of movements matching the query, across all pages. */
  total: number;
  /** 1-based page number that was returned. */
  page: number;
  /** Page size that was applied. */
  limit: number;
  /** True when at least one more page exists after this one. */
  hasMore: boolean;
}
