import type { Movement, MovementType } from '../types';
import { StorageService } from './storageService';
import { generateId } from '../utils/idGenerator';
import { format } from 'date-fns';

// Lazy getters to avoid circular dependencies
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pocketServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let subPocketServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let accountServiceCache: any = null;

const getPocketService = async () => {
  if (!pocketServiceCache) {
    const module = await import('./pocketService');
    pocketServiceCache = module.pocketService;
  }
  return pocketServiceCache;
};

const getSubPocketService = async () => {
  if (!subPocketServiceCache) {
    const module = await import('./subPocketService');
    subPocketServiceCache = module.subPocketService;
  }
  return subPocketServiceCache;
};

const getAccountService = async () => {
  if (!accountServiceCache) {
    const module = await import('./accountService');
    accountServiceCache = module.accountService;
  }
  return accountServiceCache;
};

class MovementService {
  // Get all movements
  getAllMovements(): Movement[] {
    return StorageService.getMovements();
  }

  // Get movement by ID
  getMovement(id: string): Movement | null {
    const movements = this.getAllMovements();
    return movements.find(m => m.id === id) || null;
  }

  // Get movements sorted by createdAt (registration date)
  getMovementsSortedByCreatedAt(): Movement[] {
    const movements = this.getAllMovements();
    return movements.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // Get movements by account
  getMovementsByAccount(accountId: string): Movement[] {
    const movements = this.getAllMovements();
    return movements.filter(m => m.accountId === accountId);
  }

  // Get movements by pocket
  getMovementsByPocket(pocketId: string): Movement[] {
    const movements = this.getAllMovements();
    return movements.filter(m => m.pocketId === pocketId);
  }

  // Get movements grouped by month (based on displayedDate)
  getMovementsByMonth(year: number, month: number): Movement[] {
    const movements = this.getAllMovements();
    return movements.filter(m => {
      const date = new Date(m.displayedDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }

  // Get all movements grouped by month
  getMovementsGroupedByMonth(): Map<string, Movement[]> {
    const movements = this.getMovementsSortedByCreatedAt();
    const grouped = new Map<string, Movement[]>();

    movements.forEach(movement => {
      const date = new Date(movement.displayedDate);
      const monthKey = format(date, 'yyyy-MM'); // e.g., "2025-01"
      
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(movement);
    });

    return grouped;
  }

  // Update pocket balance based on movement
  private async updatePocketBalance(
    pocketId: string,
    amount: number,
    isIncome: boolean
  ): Promise<void> {
    const pocketService = await getPocketService();
    const pocket = pocketService.getPocket(pocketId);
    if (!pocket) return;

    const pockets = pocketService.getAllPockets();
    const index = pockets.findIndex(p => p.id === pocketId);
    if (index === -1) return;

    if (isIncome) {
      pockets[index].balance += amount;
    } else {
      pockets[index].balance -= amount;
    }

    StorageService.savePockets(pockets);

    // Recalculate account balance
    const accountService = await getAccountService();
    await accountService.updateAccount(pocket.accountId, {});
  }

  // Update sub-pocket balance for fixed expenses
  private async updateSubPocketBalance(
    subPocketId: string,
    amount: number,
    isIncome: boolean
  ): Promise<void> {
    const subPocketService = await getSubPocketService();
    const subPocket = subPocketService.getSubPocket(subPocketId);
    if (!subPocket) return;

    const subPockets = subPocketService.getAllSubPockets();
    const index = subPockets.findIndex(sp => sp.id === subPocketId);
    if (index === -1) return;

    if (isIncome) {
      subPockets[index].balance += amount;
    } else {
      subPockets[index].balance -= amount;
    }

    StorageService.saveSubPockets(subPockets);

    // Recalculate pocket balance (which will recalculate account balance)
    const pocketService = await getPocketService();
    await pocketService.updatePocket(subPocket.pocketId, {});
  }

  // Create new movement
  async createMovement(
    type: MovementType,
    accountId: string,
    pocketId: string,
    amount: number,
    notes?: string,
    displayedDate?: string,
    subPocketId?: string
  ): Promise<Movement> {
    const now = new Date().toISOString();
    const movement: Movement = {
      id: generateId(),
      type,
      accountId,
      pocketId,
      subPocketId,
      amount,
      notes,
      displayedDate: displayedDate || now,
      createdAt: now,
    };

    const movements = this.getAllMovements();
    movements.push(movement);
    StorageService.saveMovements(movements);

    // Update balances
    const isIncome = type === 'IngresoNormal' || type === 'IngresoFijo' || type === 'InvestmentIngreso';
    
    if (subPocketId) {
      // Fixed expense movement
      await this.updateSubPocketBalance(subPocketId, amount, isIncome);
    } else {
      // Normal pocket movement
      await this.updatePocketBalance(pocketId, amount, isIncome);
    }

    return movement;
  }

  // Update movement
  async updateMovement(
    id: string,
    updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>
  ): Promise<Movement> {
    const movements = this.getAllMovements();
    const index = movements.findIndex(m => m.id === id);

    if (index === -1) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    const oldMovement = movements[index];
    
    // Revert old balance changes
    const oldIsIncome = oldMovement.type === 'IngresoNormal' || oldMovement.type === 'IngresoFijo' || oldMovement.type === 'InvestmentIngreso';
    if (oldMovement.subPocketId) {
      await this.updateSubPocketBalance(oldMovement.subPocketId, oldMovement.amount, !oldIsIncome);
    } else {
      await this.updatePocketBalance(oldMovement.pocketId, oldMovement.amount, !oldIsIncome);
    }

    // Apply new movement
    const updatedMovement = { ...oldMovement, ...updates };
    movements[index] = updatedMovement;
    StorageService.saveMovements(movements);

    // Apply new balance changes
    const newIsIncome = updatedMovement.type === 'IngresoNormal' || updatedMovement.type === 'IngresoFijo' || updatedMovement.type === 'InvestmentIngreso';
    if (updatedMovement.subPocketId) {
      await this.updateSubPocketBalance(updatedMovement.subPocketId, updatedMovement.amount, newIsIncome);
    } else {
      await this.updatePocketBalance(updatedMovement.pocketId, updatedMovement.amount, newIsIncome);
    }

    return updatedMovement;
  }

  // Delete movement
  async deleteMovement(id: string): Promise<void> {
    const movements = this.getAllMovements();
    const index = movements.findIndex(m => m.id === id);

    if (index === -1) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    const movement = movements[index];
    
    // Revert balance changes
    const isIncome = movement.type === 'IngresoNormal' || movement.type === 'IngresoFijo' || movement.type === 'InvestmentIngreso';
    if (movement.subPocketId) {
      await this.updateSubPocketBalance(movement.subPocketId, movement.amount, !isIncome);
    } else {
      await this.updatePocketBalance(movement.pocketId, movement.amount, !isIncome);
    }

    movements.splice(index, 1);
    StorageService.saveMovements(movements);
  }
}

export const movementService = new MovementService();

