import type { Movement, MovementType, Pocket, Account } from '../types';
import { SupabaseStorageService } from './supabaseStorageService';
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
  // Get all movements (including orphaned)
  async getAllMovements(): Promise<Movement[]> {
    return await SupabaseStorageService.getMovements();
  }

  // Check if a movement is orphaned (account or pocket no longer exists)
  async isMovementOrphaned(movement: Movement): Promise<boolean> {
    const accountService = await getAccountService();
    const pocketService = await getPocketService();

    const account = await accountService.getAccount(movement.accountId);
    if (!account) return true;

    const pocket = await pocketService.getPocket(movement.pocketId);
    if (!pocket) return true;

    return false;
  }

  // Get all orphaned movements (optimized - batch lookup)
  async getOrphanedMovements(): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    const accountService = await getAccountService();
    const pocketService = await getPocketService();
    
    // Get all accounts and pockets once
    const accounts = await accountService.getAllAccounts();
    const pockets = await pocketService.getAllPockets();
    
    // Create lookup sets for O(1) checking
    const accountIds = new Set(accounts.map((a: Account) => a.id));
    const pocketIds = new Set(pockets.map((p: Pocket) => p.id));
    
    // Filter orphaned movements
    return movements.filter(m => !accountIds.has(m.accountId) || !pocketIds.has(m.pocketId));
  }

  // Get non-orphaned movements (active movements only) - optimized
  async getActiveMovements(): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    const accountService = await getAccountService();
    const pocketService = await getPocketService();
    
    // Get all accounts and pockets once
    const accounts = await accountService.getAllAccounts();
    const pockets = await pocketService.getAllPockets();
    
    // Create lookup sets for O(1) checking
    const accountIds = new Set(accounts.map((a: Account) => a.id));
    const pocketIds = new Set(pockets.map((p: Pocket) => p.id));
    
    // Filter active movements (both account AND pocket must exist)
    return movements.filter(m => accountIds.has(m.accountId) && pocketIds.has(m.pocketId));
  }

  // Get movement by ID
  async getMovement(id: string): Promise<Movement | null> {
    const movements = await this.getAllMovements();
    return movements.find(m => m.id === id) || null;
  }

  // Get movements sorted by createdAt (registration date) - ACTIVE ONLY
  async getMovementsSortedByCreatedAt(): Promise<Movement[]> {
    const movements = await this.getActiveMovements(); // Filter orphaned
    return movements.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // Get movements by account - ACTIVE ONLY
  async getMovementsByAccount(accountId: string): Promise<Movement[]> {
    const movements = await this.getActiveMovements(); // Filter orphaned
    return movements.filter(m => m.accountId === accountId);
  }

  // Get movements by pocket - ACTIVE ONLY
  async getMovementsByPocket(pocketId: string): Promise<Movement[]> {
    const movements = await this.getActiveMovements(); // Filter orphaned
    return movements.filter(m => m.pocketId === pocketId);
  }

  // Get movements grouped by month (based on displayedDate) - ACTIVE ONLY
  async getMovementsByMonth(year: number, month: number): Promise<Movement[]> {
    const movements = await this.getActiveMovements(); // Filter orphaned
    return movements.filter(m => {
      const date = new Date(m.displayedDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }

  // Get all movements grouped by month - ACTIVE ONLY
  async getMovementsGroupedByMonth(): Promise<Map<string, Movement[]>> {
    const movements = await this.getMovementsSortedByCreatedAt(); // Already filtered
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
    const pocket = await pocketService.getPocket(pocketId);
    if (!pocket) return;

    const newBalance = isIncome ? pocket.balance + amount : pocket.balance - amount;

    // Update directly - much faster
    await SupabaseStorageService.updatePocket(pocketId, { balance: newBalance });

    // Note: Account balance will be recalculated by store when it reloads
  }

  // Update sub-pocket balance for fixed expenses
  private async updateSubPocketBalance(
    subPocketId: string,
    amount: number,
    isIncome: boolean
  ): Promise<void> {
    const subPocketService = await getSubPocketService();
    const subPocket = await subPocketService.getSubPocket(subPocketId);
    if (!subPocket) return;

    const newBalance = isIncome ? subPocket.balance + amount : subPocket.balance - amount;

    // Update directly - much faster
    await SupabaseStorageService.updateSubPocket(subPocketId, { balance: newBalance });

    // Note: Pocket and account balances will be recalculated by store when it reloads
  }

  // Sync investment account fields with pocket balances
  private async syncInvestmentAccount(accountId: string): Promise<void> {
    const accountService = await getAccountService();
    const account = await accountService.getAccount(accountId);
    if (!account || account.type !== 'investment') return;

    const pocketService = await getPocketService();
    const pockets = await pocketService.getPocketsByAccount(accountId);
    
    const investedPocket = pockets.find((p: Pocket) => p.name === 'Invested Money');
    const sharesPocket = pockets.find((p: Pocket) => p.name === 'Shares');
    
    const updates: Partial<Account> = {};
    if (investedPocket) {
      updates.montoInvertido = investedPocket.balance;
    }
    if (sharesPocket) {
      updates.shares = sharesPocket.balance;
    }
    
    // Update directly - much faster
    await SupabaseStorageService.updateAccount(accountId, updates);
  }

  // Create new movement
  async createMovement(
    type: MovementType,
    accountId: string,
    pocketId: string,
    amount: number,
    notes?: string,
    displayedDate?: string,
    subPocketId?: string,
    isPending?: boolean
  ): Promise<Movement> {
    // Validate amount
    if (amount <= 0) {
      throw new Error('Movement amount must be greater than zero.');
    }

    // Validate account exists
    const accountService = await getAccountService();
    const account = await accountService.getAccount(accountId);
    if (!account) {
      throw new Error(`Account with id "${accountId}" not found.`);
    }

    // Validate pocket exists
    const pocketService = await getPocketService();
    const pocket = await pocketService.getPocket(pocketId);
    if (!pocket) {
      throw new Error(`Pocket with id "${pocketId}" not found.`);
    }

    // Validate sub-pocket if provided
    if (subPocketId) {
      const subPocketService = await getSubPocketService();
      const subPocket = await subPocketService.getSubPocket(subPocketId);
      if (!subPocket) {
        throw new Error(`Sub-pocket with id "${subPocketId}" not found.`);
      }
      // Validate sub-pocket belongs to the specified pocket
      if (subPocket.pocketId !== pocketId) {
        throw new Error('Sub-pocket does not belong to the specified pocket.');
      }
    }

    const now = new Date().toISOString();
    const movement: Movement = {
      id: generateId(),
      type,
      accountId,
      pocketId,
      subPocketId,
      amount,
      notes: notes?.trim(),
      displayedDate: displayedDate || now,
      createdAt: now,
      isPending: isPending || false,
    };

    // Insert directly - much faster
    await SupabaseStorageService.insertMovement(movement);

    // If pending, don't apply balance changes yet
    if (isPending) {
      return movement;
    }

    // Update balances based on movement type
    const isIncome = type === 'IngresoNormal' || type === 'IngresoFijo';

    if (subPocketId) {
      // Fixed expense movement
      await this.updateSubPocketBalance(subPocketId, amount, isIncome);
    } else {
      // Normal pocket movement
      await this.updatePocketBalance(pocketId, amount, isIncome);
    }

    // If this is an investment account, sync the account fields with pocket balances
    if (account.type === 'investment') {
      await this.syncInvestmentAccount(accountId);
    }

    return movement;
  }

  // Update movement
  async updateMovement(
    id: string,
    updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>
  ): Promise<Movement> {
    const movements = await this.getAllMovements();
    const index = movements.findIndex(m => m.id === id);

    if (index === -1) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    const oldMovement = movements[index];
    const updatedMovement = { ...oldMovement, ...updates };

    const accountService = await getAccountService();
    const oldAccount = await accountService.getAccount(oldMovement.accountId);
    const newAccount = await accountService.getAccount(updatedMovement.accountId);

    // Revert old balance changes
    const oldIsIncome = oldMovement.type === 'IngresoNormal' || oldMovement.type === 'IngresoFijo';
    if (oldMovement.subPocketId) {
      await this.updateSubPocketBalance(oldMovement.subPocketId, oldMovement.amount, !oldIsIncome);
    } else {
      await this.updatePocketBalance(oldMovement.pocketId, oldMovement.amount, !oldIsIncome);
    }

    // Apply new balance changes
    const newIsIncome = updatedMovement.type === 'IngresoNormal' || updatedMovement.type === 'IngresoFijo';
    if (updatedMovement.subPocketId) {
      await this.updateSubPocketBalance(updatedMovement.subPocketId, updatedMovement.amount, newIsIncome);
    } else {
      await this.updatePocketBalance(updatedMovement.pocketId, updatedMovement.amount, newIsIncome);
    }

    // Sync investment accounts if needed
    if (oldAccount && oldAccount.type === 'investment') {
      await this.syncInvestmentAccount(oldMovement.accountId);
    }
    if (newAccount && newAccount.type === 'investment' && newAccount.id !== oldAccount?.id) {
      await this.syncInvestmentAccount(updatedMovement.accountId);
    }

    // Update directly - much faster
    await SupabaseStorageService.updateMovement(id, updates);

    return updatedMovement;
  }

  // Delete movement
  async deleteMovement(id: string): Promise<void> {
    const movement = await this.getMovement(id);
    if (!movement) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    const accountService = await getAccountService();
    const account = await accountService.getAccount(movement.accountId);

    // Revert balance changes
    const isIncome = movement.type === 'IngresoNormal' || movement.type === 'IngresoFijo';
    if (movement.subPocketId) {
      await this.updateSubPocketBalance(movement.subPocketId, movement.amount, !isIncome);
    } else {
      await this.updatePocketBalance(movement.pocketId, movement.amount, !isIncome);
    }

    // Sync investment account if needed
    if (account && account.type === 'investment') {
      await this.syncInvestmentAccount(movement.accountId);
    }

    // Delete directly - much faster
    await SupabaseStorageService.deleteMovement(id);
  }

  // Get pending movements
  async getPendingMovements(): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.filter(m => m.isPending === true);
  }

  // Get applied (non-pending) movements
  async getAppliedMovements(): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.filter(m => !m.isPending);
  }

  // Apply a pending movement (convert to applied)
  async applyPendingMovement(id: string): Promise<Movement> {
    const movement = await this.getMovement(id);
    if (!movement) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    if (!movement.isPending) {
      throw new Error('Movement is already applied.');
    }

    // Mark as applied
    await SupabaseStorageService.updateMovement(id, { isPending: false });

    // Now apply the balance changes
    const isIncome = movement.type === 'IngresoNormal' || movement.type === 'IngresoFijo';
    const accountService = await getAccountService();
    const account = await accountService.getAccount(movement.accountId);

    if (movement.subPocketId) {
      // Fixed expense movement
      await this.updateSubPocketBalance(movement.subPocketId, movement.amount, isIncome);
    } else {
      // Normal pocket movement
      await this.updatePocketBalance(movement.pocketId, movement.amount, isIncome);
    }

    // Sync investment account if needed
    if (account && account.type === 'investment') {
      await this.syncInvestmentAccount(movement.accountId);
    }

    return { ...movement, isPending: false };
  }

  // Get count of movements by account
  async getMovementCountByAccount(accountId: string): Promise<number> {
    const movements = await this.getAllMovements();
    return movements.filter(m => m.accountId === accountId).length;
  }

  // Get count of movements by pocket
  async getMovementCountByPocket(pocketId: string): Promise<number> {
    const movements = await this.getAllMovements();
    return movements.filter(m => m.pocketId === pocketId).length;
  }

  // Delete all movements by account (for cascade delete)
  async deleteMovementsByAccount(accountId: string): Promise<number> {
    const movements = await this.getAllMovements();
    const accountMovements = movements.filter(m => m.accountId === accountId);
    
    for (const movement of accountMovements) {
      await SupabaseStorageService.deleteMovement(movement.id);
    }
    
    return accountMovements.length;
  }

  // Delete all movements by pocket (for cascade delete)
  async deleteMovementsByPocket(pocketId: string): Promise<number> {
    const movements = await this.getAllMovements();
    const pocketMovements = movements.filter(m => m.pocketId === pocketId);
    
    for (const movement of pocketMovements) {
      await SupabaseStorageService.deleteMovement(movement.id);
    }
    
    return pocketMovements.length;
  }
}

export const movementService = new MovementService();

