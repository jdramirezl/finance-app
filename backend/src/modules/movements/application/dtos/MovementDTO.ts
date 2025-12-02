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
