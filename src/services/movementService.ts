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
  // Get all movements
  async getAllMovements(): Promise<Movement[]> {
    return await SupabaseStorageService.getMovements();
  }

  // Get movement by ID
  async getMovement(id: string): Promise<Movement | null> {
    const movements = await this.getAllMovements();
    return movements.find(m => m.id === id) || null;
  }

  // Get movements sorted by createdAt (registration date)
  async getMovementsSortedByCreatedAt(): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // Get movements by account
  async getMovementsByAccount(accountId: string): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.filter(m => m.accountId === accountId);
  }

  // Get movements by pocket
  async getMovementsByPocket(pocketId: string): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.filter(m => m.pocketId === pocketId);
  }

  // Get movements grouped by month (based on displayedDate)
  async getMovementsByMonth(year: number, month: number): Promise<Movement[]> {
    const movements = await this.getAllMovements();
    return movements.filter(m => {
      const date = new Date(m.displayedDate);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }

  // Get all movements grouped by month
  async getMovementsGroupedByMonth(): Promise<Map<string, Movement[]>> {
    const movements = await this.getMovementsSortedByCreatedAt();
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

  // Update investment account (money or shares)
  private async updateInvestmentAccount(
    accountId: string,
    type: MovementType,
    amount: number
  ): Promise<void> {
    const accountService = await getAccountService();
    const account = await accountService.getAccount(accountId);
    if (!account || account.type !== 'investment') return;

    const updates: Partial<Account> = {};
    if (type === 'InvestmentIngreso') {
      updates.montoInvertido = (account.montoInvertido || 0) + amount;
    } else if (type === 'InvestmentShares') {
      updates.shares = (account.shares || 0) + amount;
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

    // Handle investment movements separately
        // Handle investment movements separately
        if (type === 'InvestmentIngreso' || type === 'InvestmentShares') {
          // Update the pocket balance first so pockets remain the source of truth
          // (the form passes the pocketId where the user recorded the movement)
          await this.updatePocketBalance(pocketId, amount, true);

          // Synchronize account fields with pocket balances (keep account totals in sync)
          const pocketService = await getPocketService();
          const accountService = await getAccountService();
          const account = await accountService.getAccount(accountId);
          if (account && account.type === 'investment') {
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

          return movement;
        }

    // Update balances for normal movements
    const isIncome = type === 'IngresoNormal' || type === 'IngresoFijo';

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
    const movements = await this.getAllMovements();
    const index = movements.findIndex(m => m.id === id);

    if (index === -1) {
      throw new Error(`Movement with id "${id}" not found.`);
    }

    const oldMovement = movements[index];
    const updatedMovement = { ...oldMovement, ...updates };

    // Handle investment movements
    const isOldInvestment = oldMovement.type === 'InvestmentIngreso' || oldMovement.type === 'InvestmentShares';
    const isNewInvestment = updatedMovement.type === 'InvestmentIngreso' || updatedMovement.type === 'InvestmentShares';

    if (isOldInvestment) {
      // Revert old investment changes
      const accountService = await getAccountService();
      const account = await accountService.getAccount(oldMovement.accountId);
      if (account && account.type === 'investment') {
        const updates: Partial<Account> = {};
        if (oldMovement.type === 'InvestmentIngreso') {
          updates.montoInvertido = Math.max(0, (account.montoInvertido || 0) - oldMovement.amount);
        } else if (oldMovement.type === 'InvestmentShares') {
          updates.shares = Math.max(0, (account.shares || 0) - oldMovement.amount);
        }
        // Update directly - much faster
        await SupabaseStorageService.updateAccount(oldMovement.accountId, updates);
      }
    }

    if (isNewInvestment) {
      // Apply new investment changes
      await this.updateInvestmentAccount(updatedMovement.accountId, updatedMovement.type, updatedMovement.amount);
    } else {
      // Revert old balance changes for normal movements
      const oldIsIncome = oldMovement.type === 'IngresoNormal' || oldMovement.type === 'IngresoFijo';
      if (oldMovement.subPocketId) {
        await this.updateSubPocketBalance(oldMovement.subPocketId, oldMovement.amount, !oldIsIncome);
      } else if (!isOldInvestment) {
        await this.updatePocketBalance(oldMovement.pocketId, oldMovement.amount, !oldIsIncome);
      }

      // Apply new balance changes
      const newIsIncome = updatedMovement.type === 'IngresoNormal' || updatedMovement.type === 'IngresoFijo';
      if (updatedMovement.subPocketId) {
        await this.updateSubPocketBalance(updatedMovement.subPocketId, updatedMovement.amount, newIsIncome);
      } else if (!isNewInvestment) {
        await this.updatePocketBalance(updatedMovement.pocketId, updatedMovement.amount, newIsIncome);
      }
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

    // Handle investment movements
    if (movement.type === 'InvestmentIngreso' || movement.type === 'InvestmentShares') {
      const accountService = await getAccountService();
      const account = await accountService.getAccount(movement.accountId);
      if (account && account.type === 'investment') {
        const updates: Partial<Account> = {};
        if (movement.type === 'InvestmentIngreso') {
          updates.montoInvertido = Math.max(0, (account.montoInvertido || 0) - movement.amount);
        } else if (movement.type === 'InvestmentShares') {
          updates.shares = Math.max(0, (account.shares || 0) - movement.amount);
        }
        // Update directly - much faster
        await SupabaseStorageService.updateAccount(movement.accountId, updates);
      }
    } else {
      // Revert balance changes for normal movements
      const isIncome = movement.type === 'IngresoNormal' || movement.type === 'IngresoFijo';
      if (movement.subPocketId) {
        await this.updateSubPocketBalance(movement.subPocketId, movement.amount, !isIncome);
      } else {
        await this.updatePocketBalance(movement.pocketId, movement.amount, !isIncome);
      }
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

    // Handle investment movements
    if (movement.type === 'InvestmentIngreso' || movement.type === 'InvestmentShares') {
      await this.updatePocketBalance(movement.pocketId, movement.amount, true);

      // Synchronize account fields
      const pocketService = await getPocketService();
      const accountService = await getAccountService();
      const account = await accountService.getAccount(movement.accountId);
      if (account && account.type === 'investment') {
        const pockets = await pocketService.getPocketsByAccount(movement.accountId);
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
        await SupabaseStorageService.updateAccount(movement.accountId, updates);
      }
    } else if (movement.subPocketId) {
      // Fixed expense movement
      await this.updateSubPocketBalance(movement.subPocketId, movement.amount, isIncome);
    } else {
      // Normal pocket movement
      await this.updatePocketBalance(movement.pocketId, movement.amount, isIncome);
    }

    return { ...movement, isPending: false };
  }
}

export const movementService = new MovementService();

