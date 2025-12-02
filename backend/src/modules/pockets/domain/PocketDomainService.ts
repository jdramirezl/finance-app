/**
 * Pocket Domain Service
 * 
 * Contains complex business logic that doesn't belong in a single entity.
 * Handles balance calculations for both normal and fixed pockets.
 */

import type { Pocket } from './Pocket';

/**
 * Movement data structure for balance calculation
 * (Movement entity will be defined in Phase 4)
 */
interface MovementData {
  id: string;
  pocketId: string;
  amount: number;
  type: 'IngresoNormal' | 'EgresoNormal' | 'IngresoFijo' | 'EgresoFijo';
  isPending?: boolean;
  isOrphaned?: boolean;
}

/**
 * SubPocket data structure for balance calculation
 * (SubPocket entity will be defined in Phase 3)
 */
interface SubPocketData {
  id: string;
  pocketId: string;
  balance: number;
}

/**
 * Domain service for pocket-related business logic
 */
export class PocketDomainService {
  /**
   * Calculate pocket balance from movements
   * 
   * For normal pockets: sum of all non-pending, non-orphaned movement amounts
   * - Income movements (IngresoNormal, IngresoFijo) add to balance
   * - Expense movements (EgresoNormal, EgresoFijo) subtract from balance
   * - Pending movements are excluded (not yet applied)
   * - Orphaned movements are excluded (pocket/account was deleted)
   * 
   * @param movements - Array of movements belonging to the pocket
   * @returns Calculated balance
   */
  calculateBalanceFromMovements(movements: MovementData[]): number {
    return movements
      .filter(movement => !movement.isPending && !movement.isOrphaned)
      .reduce((total, movement) => {
        const isIncome = movement.type === 'IngresoNormal' || movement.type === 'IngresoFijo';
        const signedAmount = isIncome ? movement.amount : -movement.amount;
        return total + signedAmount;
      }, 0);
  }

  /**
   * Calculate fixed pocket balance from sub-pockets
   * 
   * For fixed pockets: sum of all sub-pocket balances
   * Sub-pockets can have negative balances (debt), which is valid
   * 
   * @param subPockets - Array of sub-pockets belonging to the fixed pocket
   * @returns Calculated balance
   */
  calculateBalanceFromSubPockets(subPockets: SubPocketData[]): number {
    return subPockets.reduce((total, subPocket) => total + subPocket.balance, 0);
  }

  /**
   * Update pocket balance based on pocket type
   * 
   * @param pocket - Pocket to update
   * @param movements - Movements for normal pockets (optional)
   * @param subPockets - Sub-pockets for fixed pockets (optional)
   */
  updatePocketBalance(
    pocket: Pocket,
    movements?: MovementData[],
    subPockets?: SubPocketData[]
  ): void {
    if (pocket.isFixed()) {
      if (!subPockets) {
        throw new Error('Sub-pockets are required for fixed pockets');
      }
      const balance = this.calculateBalanceFromSubPockets(subPockets);
      pocket.updateBalance(balance);
    } else {
      if (!movements) {
        throw new Error('Movements are required for normal pockets');
      }
      const balance = this.calculateBalanceFromMovements(movements);
      pocket.updateBalance(balance);
    }
  }

  /**
   * Calculate total balance for multiple pockets
   * 
   * @param pockets - Array of pockets
   * @returns Sum of all pocket balances
   */
  calculateTotalBalance(pockets: Pocket[]): number {
    return pockets.reduce((total, pocket) => total + pocket.balance, 0);
  }
}
