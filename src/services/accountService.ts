import type { Account } from '../types';
import { SupabaseStorageService } from './supabaseStorageService';
import { generateId } from '../utils/idGenerator';

// Lazy getters to avoid circular dependencies - using dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pocketServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let subPocketServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let movementServiceCache: any = null;

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

const getMovementService = async () => {
  if (!movementServiceCache) {
    const module = await import('./movementService');
    movementServiceCache = module.movementService;
  }
  return movementServiceCache;
};

class AccountService {
  // Get all accounts
  async getAllAccounts(): Promise<Account[]> {
    return await SupabaseStorageService.getAccounts();
  }

  // Get account by ID
  async getAccount(id: string): Promise<Account | null> {
    const accounts = await this.getAllAccounts();
    return accounts.find(acc => acc.id === id) || null;
  }

  // Validate account uniqueness (name + currency combination)
  async validateAccountUniqueness(name: string, currency: string, excludeId?: string): Promise<boolean> {
    const accounts = await this.getAllAccounts();
    const existing = accounts.find(
      acc => acc.name === name && acc.currency === currency && acc.id !== excludeId
    );
    return !existing; // Returns true if unique (no existing account found)
  }

  // Calculate account balance (sum of all pocket balances)
  // Note: This method should be called after pockets are loaded
  // IMPORTANT: This is the ONLY source of truth for account balances
  // Account.balance in storage may be stale - always recalculate from pockets
  async calculateAccountBalance(accountId: string): Promise<number> {
    // Import dynamically to avoid circular dependency
    const pocketService = await getPocketService();
    const pockets = await pocketService.getPocketsByAccount(accountId);
    return pockets.reduce((sum: number, pocket: { balance: number }) => sum + pocket.balance, 0);
  }

  // Create new account
  async createAccount(
    name: string,
    color: string,
    currency: Account['currency'],
    type: Account['type'] = 'normal',
    stockSymbol?: string
  ): Promise<Account> {
    // Validate and sanitize input
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Account name cannot be empty.');
    }
    if (!color || !color.trim()) {
      throw new Error('Account color cannot be empty.');
    }

    // Validate uniqueness
    if (!(await this.validateAccountUniqueness(trimmedName, currency))) {
      throw new Error(`An account with name "${trimmedName}" and currency "${currency}" already exists.`);
    }

    const account: Account = {
      id: generateId(),
      name: trimmedName,
      color: color.trim(),
      currency,
      balance: 0,
      type,
      ...(type === 'investment' && {
        stockSymbol: stockSymbol?.trim() || 'VOO',
        montoInvertido: 0,
        shares: 0,
      }),
    };

    // Insert directly - much faster
    await SupabaseStorageService.insertAccount(account);

    return account;
  }

  // Update account
  async updateAccount(id: string, updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>>): Promise<Account> {
    const accounts = await this.getAllAccounts();
    const index = accounts.findIndex(acc => acc.id === id);

    if (index === -1) {
      throw new Error(`Account with id "${id}" not found.`);
    }

    const account = accounts[index];

    // Validate and sanitize updates
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Account name cannot be empty.');
      }
      updates.name = trimmedName;
    }
    if (updates.color !== undefined) {
      const trimmedColor = updates.color.trim();
      if (!trimmedColor) {
        throw new Error('Account color cannot be empty.');
      }
      updates.color = trimmedColor;
    }

    const updatedAccount = { ...account, ...updates };

    // Validate uniqueness if name or currency changed
    if (updates.name || updates.currency) {
      const newName = updates.name || account.name;
      const newCurrency = updates.currency || account.currency;
      if (!(await this.validateAccountUniqueness(newName, newCurrency, id))) {
        throw new Error(`An account with name "${newName}" and currency "${newCurrency}" already exists.`);
      }
    }

    // If currency changed, update all pockets' currency
    if (updates.currency) {
      const pocketService = await getPocketService();
      const pockets = await pocketService.getPocketsByAccount(id);
      const allPockets = await pocketService.getAllPockets();
      pockets.forEach((pocket: { id: string }) => {
        const pocketIndex = allPockets.findIndex((p: { id: string }) => p.id === pocket.id);
        if (pocketIndex !== -1) {
          allPockets[pocketIndex].currency = updates.currency!;
        }
      });
      await SupabaseStorageService.savePockets(allPockets);
    }

    // Recalculate balance
    updatedAccount.balance = await this.calculateAccountBalance(id);

    // Update directly - much faster
    await SupabaseStorageService.updateAccount(id, updatedAccount);

    return updatedAccount;
  }

  // Delete account
  async deleteAccount(id: string): Promise<void> {
    const account = await this.getAccount(id);
    if (!account) {
      throw new Error(`Account with id "${id}" not found.`);
    }

    // Check if account has pockets
    const pocketService = await getPocketService();
    const pockets = await pocketService.getPocketsByAccount(id);
    if (pockets.length > 0) {
      throw new Error(`Cannot delete account "${account.name}" because it has ${pockets.length} pocket(s). Delete pockets first.`);
    }

    // Delete directly - much faster
    await SupabaseStorageService.deleteAccount(id);
  }

  // Cascade delete account with all pockets, sub-pockets, and optionally movements
  async deleteAccountCascade(id: string, deleteMovements: boolean = false): Promise<{
    account: string;
    pockets: number;
    subPockets: number;
    movements: number;
  }> {
    console.log(`🗑️ [deleteAccountCascade] Starting - accountId: ${id}, deleteMovements: ${deleteMovements}`);
    
    const account = await this.getAccount(id);
    if (!account) {
      throw new Error(`Account with id "${id}" not found.`);
    }

    console.log(`📋 [deleteAccountCascade] Account found: ${account.name}`);

    const pocketService = await getPocketService();
    const subPocketService = await getSubPocketService();
    const movementService = await getMovementService();

    const pockets = await pocketService.getPocketsByAccount(id);
    console.log(`📦 [deleteAccountCascade] Found ${pockets.length} pockets to delete`);
    
    let totalSubPockets = 0;
    let totalMovements = 0;

    // CRITICAL: Mark movements as orphaned FIRST (before deleting anything)
    // Otherwise CASCADE DELETE will remove movements before we can mark them
    if (!deleteMovements) {
      console.log(`🔖 [deleteAccountCascade] STEP 1: Marking all movements as orphaned for account ${id}`);
      const markedCount = await movementService.markMovementsAsOrphaned(id, 'account');
      console.log(`🔖 [deleteAccountCascade] Marked ${markedCount} movements as orphaned`);
      totalMovements += markedCount;
    }

    // Delete in order: movements (if hard delete) -> sub-pockets -> pockets -> account
    for (const pocket of pockets) {
      // Get sub-pockets for this pocket
      const subPockets = await subPocketService.getSubPocketsByPocket(pocket.id);
      totalSubPockets += subPockets.length;

      // Delete sub-pockets
      for (const subPocket of subPockets) {
        await subPocketService.deleteSubPocket(subPocket.id);
      }

      // Handle movements (only if hard delete)
      if (deleteMovements) {
        // Hard delete movements
        console.log(`💥 [deleteAccountCascade] Hard deleting movements for pocket ${pocket.id}`);
        const deletedCount = await movementService.deleteMovementsByPocket(pocket.id);
        console.log(`💥 [deleteAccountCascade] Deleted ${deletedCount} movements`);
        totalMovements += deletedCount;
      }

      // Delete pocket
      console.log(`🗑️ [deleteAccountCascade] Deleting pocket ${pocket.id}`);
      try {
        await SupabaseStorageService.deletePocket(pocket.id);
        console.log(`✅ [deleteAccountCascade] Pocket deleted successfully`);
      } catch (error) {
        console.error(`❌ [deleteAccountCascade] Failed to delete pocket:`, error);
        throw error;
      }
    }

    // Handle any remaining movements by account (only if hard delete)
    if (deleteMovements) {
      // Hard delete remaining movements
      console.log(`💥 [deleteAccountCascade] Hard deleting remaining movements for account ${id}`);
      const remainingCount = await movementService.deleteMovementsByAccount(id);
      console.log(`💥 [deleteAccountCascade] Deleted ${remainingCount} remaining movements`);
      totalMovements += remainingCount;
    }

    // Delete account
    console.log(`🗑️ [deleteAccountCascade] Deleting account ${id}`);
    try {
      await SupabaseStorageService.deleteAccount(id);
      console.log(`✅ [deleteAccountCascade] Account deleted successfully`);
    } catch (error) {
      console.error(`❌ [deleteAccountCascade] Failed to delete account:`, error);
      throw error;
    }

    console.log(`✅ [deleteAccountCascade] Complete - account: ${account.name}, pockets: ${pockets.length}, subPockets: ${totalSubPockets}, movements: ${totalMovements}`);
    
    return {
      account: account.name,
      pockets: pockets.length,
      subPockets: totalSubPockets,
      movements: totalMovements,
    };
  }

  // Recalculate single account balance
  async recalculateAccountBalance(accountId: string): Promise<void> {
    const account = await this.getAccount(accountId);
    if (account) {
      account.balance = await this.calculateAccountBalance(accountId);
      await SupabaseStorageService.updateAccount(accountId, { balance: account.balance });
    }
  }

  // Recalculate all account balances (useful after movements)
  async recalculateAllBalances(): Promise<void> {
    const accounts = await this.getAllAccounts();
    for (const account of accounts) {
      account.balance = await this.calculateAccountBalance(account.id);
    }
    await SupabaseStorageService.saveAccounts(accounts);
  }
}

export const accountService = new AccountService();

