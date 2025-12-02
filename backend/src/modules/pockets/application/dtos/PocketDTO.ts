/**
 * Pocket Data Transfer Objects
 * 
 * DTOs for API request/response serialization
 */

import type { Currency, PocketType } from '@shared-backend/types';

/**
 * DTO for creating a new pocket
 */
export interface CreatePocketDTO {
  accountId: string;
  name: string;
  type: PocketType;
  currency?: Currency; // Optional - will be derived from account if not provided
}

/**
 * DTO for updating a pocket
 */
export interface UpdatePocketDTO {
  name?: string;
}

/**
 * DTO for pocket response
 */
export interface PocketResponseDTO {
  id: string;
  accountId: string;
  name: string;
  type: PocketType;
  balance: number;
  currency: Currency;
  displayOrder?: number;
}

/**
 * DTO for migrating a fixed pocket
 */
export interface MigratePocketDTO {
  targetAccountId: string;
}
