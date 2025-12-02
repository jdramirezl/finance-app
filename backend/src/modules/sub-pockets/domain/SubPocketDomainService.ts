/**
 * SubPocket Domain Service
 * 
 * Contains complex business logic that doesn't belong in a single entity.
 * Handles balance calculations for sub-pockets.
 */

import type { SubPocket } from './SubPocket';

/**
 * Movement data structure for balance calculation
 * (Movement entity will be defined in Phase 4)
 */
interface MovementData {
  id: string;
  subPocketId?: string;
  amount: number;
  type: 'IngresoNormal' | 'EgresoNormal' | 'IngresoFijo' | 'EgresoFijo';
  isPending?: boolean;
  isOrphaned?: boolean;
}

/**
 * Domain service for sub-pocket-related business logic
 */
export class SubPocketDomainService {
  /**
   * Calculate sub-pocket balance from movements
   * 
   * Sum of all non-pending, non-orphaned movement amounts for this sub-pocket
   * - Income movements (IngresoFijo) add to balance
   * - Expense movements (EgresoFijo) subtract from balance
   * - Pending movements are excluded (not yet applied)
   * - Orphaned movements are excluded (pocket/account was deleted)
   * - Sub-pockets can have negative balances (debt)
   * 
   * Requirements 8.3: SubPocket balance calculation
   * 
   * @param movements - Array of movements belonging to the sub-pocket
   * @returns Calculated balance
   */
  calculateBalanceFromMovements(movements: MovementData[]): number {
    return movements
      .filter(movement => !movement.isPending && !movement.isOrphaned)
      .reduce((total, movement) => {
        const isIncome = movement.type === 'IngresoFijo';
        const signedAmount = isIncome ? movement.amount : -movement.amount;
        return total + signedAmount;
      }, 0);
  }

  /**
   * Update sub-pocket balance
   * 
   * @param subPocket - SubPocket to update
   * @param movements - Movements for the sub-pocket
   */
  updateSubPocketBalance(subPocket: SubPocket, movements: MovementData[]): void {
    const balance = this.calculateBalanceFromMovements(movements);
    subPocket.updateBalance(balance);
  }

  /**
   * Calculate total balance for multiple sub-pockets
   * 
   * @param subPockets - Array of sub-pockets
   * @returns Sum of all sub-pocket balances
   */
  calculateTotalBalance(subPockets: SubPocket[]): number {
    return subPockets.reduce((total, subPocket) => total + subPocket.balance, 0);
  }

  /**
   * Calculate total monthly contribution for multiple sub-pockets
   * 
   * @param subPockets - Array of sub-pockets
   * @returns Sum of all monthly contributions
   */
  calculateTotalMonthlyContribution(subPockets: SubPocket[]): number {
    return subPockets.reduce((total, subPocket) => total + subPocket.monthlyContribution, 0);
  }

  /**
   * Calculate total monthly contribution for enabled sub-pockets only
   * 
   * @param subPockets - Array of sub-pockets
   * @returns Sum of monthly contributions for enabled sub-pockets
   */
  calculateEnabledMonthlyContribution(subPockets: SubPocket[]): number {
    return subPockets
      .filter(sp => sp.isEnabled())
      .reduce((total, subPocket) => total + subPocket.monthlyContribution, 0);
  }
}
