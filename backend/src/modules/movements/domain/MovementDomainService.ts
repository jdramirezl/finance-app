/**
 * Movement Domain Service
 * 
 * Contains complex business logic for movement-related operations.
 * Handles balance recalculation logic for accounts, pockets, and sub-pockets.
 */

import type { Movement } from './Movement';

/**
 * Account data structure for balance recalculation
 */
interface AccountData {
  id: string;
  balance: number;
}

/**
 * Pocket data structure for balance recalculation
 */
interface PocketData {
  id: string;
  accountId: string;
  balance: number;
  type: 'normal' | 'fixed';
}

/**
 * SubPocket data structure for balance recalculation
 */
interface SubPocketData {
  id: string;
  pocketId: string;
  balance: number;
}

/**
 * Domain service for movement-related business logic
 */
export class MovementDomainService {
  /**
   * Calculate balance from movements
   * 
   * Sums all non-pending, non-orphaned movements:
   * - Income movements (IngresoNormal, IngresoFijo) add to balance
   * - Expense movements (EgresoNormal, EgresoFijo) subtract from balance
   * - Pending movements are excluded (not yet applied)
   * - Orphaned movements are excluded (account/pocket was deleted)
   * 
   * @param movements - Array of movements to calculate balance from
   * @returns Calculated balance
   */
  calculateBalance(movements: Movement[]): number {
    return movements
      .filter(movement => !movement.isPending && !movement.isOrphaned)
      .reduce((total, movement) => {
        return total + movement.getSignedAmount();
      }, 0);
  }

  /**
   * Calculate balance for a specific pocket
   * 
   * @param movements - All movements
   * @param pocketId - Pocket ID to calculate balance for
   * @returns Calculated balance for the pocket
   */
  calculatePocketBalance(movements: Movement[], pocketId: string): number {
    const pocketMovements = movements.filter(m => m.pocketId === pocketId);
    return this.calculateBalance(pocketMovements);
  }

  /**
   * Calculate balance for a specific sub-pocket
   * 
   * @param movements - All movements
   * @param subPocketId - SubPocket ID to calculate balance for
   * @returns Calculated balance for the sub-pocket
   */
  calculateSubPocketBalance(movements: Movement[], subPocketId: string): number {
    const subPocketMovements = movements.filter(m => m.subPocketId === subPocketId);
    return this.calculateBalance(subPocketMovements);
  }

  /**
   * Calculate balance for a specific account
   * 
   * @param movements - All movements
   * @param accountId - Account ID to calculate balance for
   * @returns Calculated balance for the account
   */
  calculateAccountBalance(movements: Movement[], accountId: string): number {
    const accountMovements = movements.filter(m => m.accountId === accountId);
    return this.calculateBalance(accountMovements);
  }

  /**
   * Determine which entities need balance recalculation after a movement change
   * 
   * Returns the IDs of entities that need their balances recalculated:
   * - Account: always needs recalculation
   * - Pocket: always needs recalculation
   * - SubPocket: only if movement has a subPocketId
   * 
   * @param movement - Movement that was created, updated, or deleted
   * @returns Object with entity IDs that need recalculation
   */
  getAffectedEntities(movement: Movement): {
    accountId: string;
    pocketId: string;
    subPocketId?: string;
  } {
    return {
      accountId: movement.accountId,
      pocketId: movement.pocketId,
      subPocketId: movement.subPocketId,
    };
  }

  /**
   * Determine if a movement update requires balance recalculation
   * 
   * Balance recalculation is needed if:
   * - Amount changed
   * - Pending status changed
   * - Movement type changed (income vs expense)
   * - Account/pocket/sub-pocket reference changed
   * 
   * @param oldMovement - Movement before update
   * @param newMovement - Movement after update
   * @returns True if balance recalculation is needed
   */
  requiresBalanceRecalculation(oldMovement: Movement, newMovement: Movement): boolean {
    // Amount changed
    if (oldMovement.amount !== newMovement.amount) {
      return true;
    }

    // Pending status changed
    if (oldMovement.isPending !== newMovement.isPending) {
      return true;
    }

    // Type changed (affects sign of amount)
    if (oldMovement.type !== newMovement.type) {
      return true;
    }

    // Account changed
    if (oldMovement.accountId !== newMovement.accountId) {
      return true;
    }

    // Pocket changed
    if (oldMovement.pocketId !== newMovement.pocketId) {
      return true;
    }

    // SubPocket changed
    if (oldMovement.subPocketId !== newMovement.subPocketId) {
      return true;
    }

    // Orphaned status changed
    if (oldMovement.isOrphaned !== newMovement.isOrphaned) {
      return true;
    }

    return false;
  }

  /**
   * Get all affected entities from both old and new movement states
   * Used when a movement is updated and references change
   * 
   * @param oldMovement - Movement before update
   * @param newMovement - Movement after update
   * @returns Array of unique entity IDs that need recalculation
   */
  getAllAffectedEntities(oldMovement: Movement, newMovement: Movement): {
    accountIds: string[];
    pocketIds: string[];
    subPocketIds: string[];
  } {
    const accountIds = new Set<string>();
    const pocketIds = new Set<string>();
    const subPocketIds = new Set<string>();

    // Add old movement entities
    accountIds.add(oldMovement.accountId);
    pocketIds.add(oldMovement.pocketId);
    if (oldMovement.subPocketId) {
      subPocketIds.add(oldMovement.subPocketId);
    }

    // Add new movement entities
    accountIds.add(newMovement.accountId);
    pocketIds.add(newMovement.pocketId);
    if (newMovement.subPocketId) {
      subPocketIds.add(newMovement.subPocketId);
    }

    return {
      accountIds: Array.from(accountIds),
      pocketIds: Array.from(pocketIds),
      subPocketIds: Array.from(subPocketIds),
    };
  }

  /**
   * Filter movements by date range
   * 
   * @param movements - All movements
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @returns Filtered movements
   */
  filterByDateRange(movements: Movement[], startDate: Date, endDate: Date): Movement[] {
    return movements.filter(movement => {
      const date = movement.displayedDate;
      return date >= startDate && date <= endDate;
    });
  }

  /**
   * Filter movements by month
   * 
   * @param movements - All movements
   * @param year - Year (e.g., 2024)
   * @param month - Month (1-12)
   * @returns Filtered movements
   */
  filterByMonth(movements: Movement[], year: number, month: number): Movement[] {
    return movements.filter(movement => {
      const date = movement.displayedDate;
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });
  }

  /**
   * Group movements by month
   * 
   * @param movements - All movements
   * @returns Map of month keys (YYYY-MM) to movements
   */
  groupByMonth(movements: Movement[]): Map<string, Movement[]> {
    const grouped = new Map<string, Movement[]>();

    for (const movement of movements) {
      const year = movement.displayedDate.getFullYear();
      const month = String(movement.displayedDate.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(movement);
    }

    return grouped;
  }

  /**
   * Calculate total income from movements
   * 
   * @param movements - Movements to calculate from
   * @returns Total income amount
   */
  calculateTotalIncome(movements: Movement[]): number {
    return movements
      .filter(m => !m.isPending && !m.isOrphaned && m.isIncome())
      .reduce((total, m) => total + m.amount, 0);
  }

  /**
   * Calculate total expenses from movements
   * 
   * @param movements - Movements to calculate from
   * @returns Total expense amount (positive number)
   */
  calculateTotalExpenses(movements: Movement[]): number {
    return movements
      .filter(m => !m.isPending && !m.isOrphaned && m.isExpense())
      .reduce((total, m) => total + m.amount, 0);
  }
}
