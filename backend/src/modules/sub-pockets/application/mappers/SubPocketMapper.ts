/**
 * SubPocketMapper
 * 
 * Handles data transformation between different layers:
 * - Domain Entity (SubPocket) ↔ Database Persistence (Supabase row)
 * - Domain Entity (SubPocket) → DTO (API response)
 * 
 * This keeps the domain layer pure and independent of infrastructure concerns.
 */

import { SubPocket } from '../../domain/SubPocket';
import type { SubPocketResponseDTO } from '../dtos/SubPocketDTO';

/**
 * Database row structure from Supabase sub_pockets table
 */
interface SubPocketPersistence {
  id: string;
  user_id: string;
  pocket_id: string;
  name: string;
  value_total: number;
  periodicity_months: number;
  balance: number;
  enabled: boolean;
  group_id: string | null;
  display_order: number | null;
  created_at?: string;
  updated_at?: string;
}

export class SubPocketMapper {
  /**
   * Convert domain entity to database persistence format
   * 
   * Maps camelCase domain properties to snake_case database columns
   * Adds user_id for multi-tenancy
   * 
   * @param subPocket - Domain entity
   * @param userId - User ID for multi-tenancy
   * @returns Database row object
   */
  static toPersistence(subPocket: SubPocket, userId: string): SubPocketPersistence {
    return {
      id: subPocket.id,
      user_id: userId,
      pocket_id: subPocket.pocketId,
      name: subPocket.name,
      value_total: subPocket.valueTotal,
      periodicity_months: subPocket.periodicityMonths,
      balance: subPocket.balance,
      enabled: subPocket.enabled,
      group_id: subPocket.groupId ?? null,
      display_order: subPocket.displayOrder ?? null,
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
  static toDomain(row: SubPocketPersistence): SubPocket {
    return new SubPocket(
      row.id,
      row.pocket_id,
      row.name,
      row.value_total,
      row.periodicity_months,
      row.balance,
      row.enabled,
      row.group_id ?? undefined,
      row.display_order ?? undefined
    );
  }

  /**
   * Convert domain entity to API response DTO
   * 
   * This is what gets sent to the frontend
   * Includes all fields needed by the UI, including calculated monthlyContribution
   * 
   * @param subPocket - Domain entity
   * @returns API response DTO
   */
  static toDTO(subPocket: SubPocket): SubPocketResponseDTO {
    return {
      id: subPocket.id,
      pocketId: subPocket.pocketId,
      name: subPocket.name,
      valueTotal: subPocket.valueTotal,
      periodicityMonths: subPocket.periodicityMonths,
      balance: subPocket.balance,
      enabled: subPocket.enabled,
      groupId: subPocket.groupId,
      displayOrder: subPocket.displayOrder,
      monthlyContribution: subPocket.monthlyContribution,
    };
  }

  /**
   * Convert array of domain entities to array of DTOs
   * 
   * Convenience method for bulk transformations
   * 
   * @param subPockets - Array of domain entities
   * @returns Array of API response DTOs
   */
  static toDTOArray(subPockets: SubPocket[]): SubPocketResponseDTO[] {
    return subPockets.map(subPocket => this.toDTO(subPocket));
  }

  /**
   * Convert array of database rows to array of domain entities
   * 
   * Convenience method for bulk transformations
   * 
   * @param rows - Array of database rows
   * @returns Array of domain entities
   */
  static toDomainArray(rows: SubPocketPersistence[]): SubPocket[] {
    return rows.map(row => this.toDomain(row));
  }
}
