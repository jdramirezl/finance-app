/**
 * Movement Mapper
 * 
 * Transforms between domain entities, persistence models, and DTOs.
 */

import { Movement } from '../../domain/Movement';
import type { MovementResponseDTO } from '../dtos/MovementDTO';
import type { MovementType, Currency } from '@shared-backend/types';

/**
 * Database row structure for movements
 */
interface MovementRow {
  id: string;
  type: MovementType;
  account_id: string;
  pocket_id: string;
  amount: number;
  displayed_date: string;
  notes?: string;
  sub_pocket_id?: string;
  is_pending: boolean;
  is_orphaned: boolean;
  orphaned_account_name?: string;
  orphaned_account_currency?: Currency;
  orphaned_pocket_name?: string;
  created_at?: string;
}

export class MovementMapper {
  /**
   * Convert domain entity to persistence model (database row)
   */
  static toPersistence(movement: Movement, userId: string): any {
    return {
      id: movement.id,
      user_id: userId,
      type: movement.type,
      account_id: movement.accountId,
      pocket_id: movement.pocketId,
      amount: movement.amount,
      displayed_date: movement.displayedDate.toISOString(),
      notes: movement.notes || null,
      sub_pocket_id: movement.subPocketId || null,
      is_pending: movement.isPending,
      is_orphaned: movement.isOrphaned,
      orphaned_account_name: movement.orphanedAccountName || null,
      orphaned_account_currency: movement.orphanedAccountCurrency || null,
      orphaned_pocket_name: movement.orphanedPocketName || null,
    };
  }

  /**
   * Convert persistence model (database row) to domain entity
   */
  static toDomain(row: MovementRow): Movement {
    // For orphaned movements, use placeholder IDs if account/pocket IDs are missing
    // This maintains domain invariants while preserving orphaned state
    const accountId = row.account_id || 'orphaned';
    const pocketId = row.pocket_id || 'orphaned';
    
    return new Movement(
      row.id,
      row.type,
      accountId,
      pocketId,
      row.amount,
      new Date(row.displayed_date),
      row.notes,
      row.sub_pocket_id,
      row.is_pending,
      row.is_orphaned,
      row.orphaned_account_name,
      row.orphaned_account_currency,
      row.orphaned_pocket_name
    );
  }

  /**
   * Convert domain entity to response DTO
   */
  static toDTO(movement: Movement, createdAt?: Date): MovementResponseDTO {
    return {
      id: movement.id,
      type: movement.type,
      accountId: movement.accountId,
      pocketId: movement.pocketId,
      amount: movement.amount,
      displayedDate: movement.displayedDate.toISOString(),
      notes: movement.notes,
      subPocketId: movement.subPocketId,
      isPending: movement.isPending,
      isOrphaned: movement.isOrphaned,
      orphanedAccountName: movement.orphanedAccountName,
      orphanedAccountCurrency: movement.orphanedAccountCurrency,
      orphanedPocketName: movement.orphanedPocketName,
      createdAt: createdAt?.toISOString(),
    };
  }

  /**
   * Convert array of domain entities to response DTOs
   */
  static toDTOArray(movements: Movement[]): MovementResponseDTO[] {
    return movements.map(movement => this.toDTO(movement));
  }
}
