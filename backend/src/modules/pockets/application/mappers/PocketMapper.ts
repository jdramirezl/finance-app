/**
 * PocketMapper
 * 
 * Handles data transformation between different layers:
 * - Domain Entity (Pocket) ↔ Database Persistence (Supabase row)
 * - Domain Entity (Pocket) → DTO (API response)
 * 
 * This keeps the domain layer pure and independent of infrastructure concerns.
 */

import { Pocket } from '../../domain/Pocket';
import type { PocketResponseDTO } from '../dtos/PocketDTO';
import type { Currency, PocketType } from '@shared-backend/types';

/**
 * Database row structure from Supabase pockets table
 */
interface PocketPersistence {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  display_order: number | null;
  created_at?: string;
  updated_at?: string;
}

export class PocketMapper {
  /**
   * Convert domain entity to database persistence format
   * 
   * Maps camelCase domain properties to snake_case database columns
   * Adds user_id for multi-tenancy
   * 
   * @param pocket - Domain entity
   * @param userId - User ID for multi-tenancy
   * @returns Database row object
   */
  static toPersistence(pocket: Pocket, userId: string): PocketPersistence {
    return {
      id: pocket.id,
      user_id: userId,
      account_id: pocket.accountId,
      name: pocket.name,
      type: pocket.type,
      balance: pocket.balance,
      currency: pocket.currency,
      display_order: pocket.displayOrder ?? null,
    };
  }

  /**
   * Convert database row to domain entity
   * 
   * Maps snake_case database columns to camelCase domain properties
   * Handles null values from database
   * 
   * @param row - Database row from Supabase
   * @returns Domain entity
   */
  static toDomain(row: PocketPersistence): Pocket {
    return new Pocket(
      row.id,
      row.account_id,
      row.name,
      row.type as PocketType,
      row.balance,
      row.currency as Currency,
      row.display_order ?? undefined
    );
  }

  /**
   * Convert domain entity to API response DTO
   * 
   * This is what gets sent to the frontend
   * Includes all fields needed by the UI
   * 
   * @param pocket - Domain entity
   * @returns API response DTO
   */
  static toDTO(pocket: Pocket): PocketResponseDTO {
    return {
      id: pocket.id,
      accountId: pocket.accountId,
      name: pocket.name,
      type: pocket.type,
      balance: pocket.balance,
      currency: pocket.currency,
      displayOrder: pocket.displayOrder,
    };
  }

  /**
   * Convert array of domain entities to array of DTOs
   * 
   * Convenience method for bulk transformations
   * 
   * @param pockets - Array of domain entities
   * @returns Array of API response DTOs
   */
  static toDTOArray(pockets: Pocket[]): PocketResponseDTO[] {
    return pockets.map(pocket => this.toDTO(pocket));
  }

  /**
   * Convert array of database rows to array of domain entities
   * 
   * Convenience method for bulk transformations
   * 
   * @param rows - Array of database rows
   * @returns Array of domain entities
   */
  static toDomainArray(rows: PocketPersistence[]): Pocket[] {
    return rows.map(row => this.toDomain(row));
  }
}
