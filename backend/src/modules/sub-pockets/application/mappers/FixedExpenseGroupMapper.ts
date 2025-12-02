/**
 * FixedExpenseGroupMapper
 * 
 * Handles data transformation between different layers:
 * - Domain Entity (FixedExpenseGroup) ↔ Database Persistence (Supabase row)
 * - Domain Entity (FixedExpenseGroup) → DTO (API response)
 * 
 * This keeps the domain layer pure and independent of infrastructure concerns.
 */

import { FixedExpenseGroup } from '../../domain/FixedExpenseGroup';
import type { GroupResponseDTO } from '../dtos/FixedExpenseGroupDTO';

/**
 * Database row structure from Supabase fixed_expense_groups table
 */
interface FixedExpenseGroupPersistence {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

export class FixedExpenseGroupMapper {
  /**
   * Convert domain entity to database persistence format
   * 
   * Maps camelCase domain properties to snake_case database columns
   * Adds user_id for multi-tenancy
   * 
   * @param group - Domain entity
   * @param userId - User ID for multi-tenancy
   * @returns Database row object
   */
  static toPersistence(group: FixedExpenseGroup, userId: string): FixedExpenseGroupPersistence {
    return {
      id: group.id,
      user_id: userId,
      name: group.name,
      color: group.color,
    };
  }

  /**
   * Convert database row to domain entity
   * 
   * Maps snake_case database columns to camelCase domain properties
   * 
   * @param row - Database row from Supabase
   * @returns Domain entity
   */
  static toDomain(row: FixedExpenseGroupPersistence): FixedExpenseGroup {
    return new FixedExpenseGroup(
      row.id,
      row.name,
      row.color
    );
  }

  /**
   * Convert domain entity to API response DTO
   * 
   * This is what gets sent to the frontend
   * Includes all fields needed by the UI
   * 
   * @param group - Domain entity
   * @returns API response DTO
   */
  static toDTO(group: FixedExpenseGroup): GroupResponseDTO {
    return {
      id: group.id,
      name: group.name,
      color: group.color,
    };
  }

  /**
   * Convert array of domain entities to array of DTOs
   * 
   * Convenience method for bulk transformations
   * 
   * @param groups - Array of domain entities
   * @returns Array of API response DTOs
   */
  static toDTOArray(groups: FixedExpenseGroup[]): GroupResponseDTO[] {
    return groups.map(group => this.toDTO(group));
  }

  /**
   * Convert array of database rows to array of domain entities
   * 
   * Convenience method for bulk transformations
   * 
   * @param rows - Array of database rows
   * @returns Array of domain entities
   */
  static toDomainArray(rows: FixedExpenseGroupPersistence[]): FixedExpenseGroup[] {
    return rows.map(row => this.toDomain(row));
  }
}
