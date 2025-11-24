import type { Pocket } from '../types';
import { StorageService } from './storageService';
import { generateId } from '../utils/idGenerator';

// Lazy getters to avoid circular dependencies - using dynamic imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let accountServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let subPocketServiceCache: any = null;

const getAccountService = async () => {
  if (!accountServiceCache) {
    const module = await import('./accountService');
    accountServiceCache = module.accountService;
  }
  return accountServiceCache;
};

const getSubPocketService = async () => {
  if (!subPocketServiceCache) {
    const module = await import('./subPocketService');
    subPocketServiceCache = module.subPocketService;
  }
  return subPocketServiceCache;
};

class PocketService {
  // Get all pockets
  getAllPockets(): Pocket[] {
    return StorageService.getPockets();
  }

  // Get pocket by ID
  getPocket(id: string): Pocket | null {
    const pockets = this.getAllPockets();
    return pockets.find(p => p.id === id) || null;
  }

  // Get pockets by account
  getPocketsByAccount(accountId: string): Pocket[] {
    const pockets = this.getAllPockets();
    return pockets.filter(p => p.accountId === accountId);
  }

  // Validate pocket uniqueness within an account
  validatePocketUniqueness(accountId: string, name: string, excludeId?: string): boolean {
    const pockets = this.getPocketsByAccount(accountId);
    const existing = pockets.find(
      p => p.name === name && p.id !== excludeId
    );
    return !existing; // Returns true if unique
  }

  // Validate that only one fixed pocket exists globally
  validateFixedPocketUniqueness(excludeId?: string): boolean {
    const pockets = this.getAllPockets();
    const fixedPockets = pockets.filter(p => p.type === 'fixed' && p.id !== excludeId);
    return fixedPockets.length === 0; // Returns true if no other fixed pocket exists
  }

  // Calculate pocket balance
  // For fixed pockets: sum of sub-pocket balances
  // For normal pockets: sum of movements (handled by movement service)
  async calculatePocketBalance(pocketId: string): Promise<number> {
    const pocket = this.getPocket(pocketId);
    if (!pocket) return 0;

    if (pocket.type === 'fixed') {
      // Sum of all sub-pocket balances
      const subPocketService = await getSubPocketService();
      const subPockets = subPocketService.getSubPocketsByPocket(pocketId);
      return subPockets.reduce((sum: number, sub: { balance: number }) => sum + sub.balance, 0);
    }

    // For normal pockets, balance is calculated from movements
    // This will be handled by movementService
    return pocket.balance;
  }

  // Create new pocket
  async createPocket(accountId: string, name: string, type: Pocket['type']): Promise<Pocket> {
    // Validate and sanitize input
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Pocket name cannot be empty.');
    }

    // Validate account exists (dynamic import to avoid circular dependency)
    const accountService = await getAccountService();
    const account = accountService.getAccount(accountId);
    if (!account) {
      throw new Error(`Account with id "${accountId}" not found.`);
    }

    // Investment accounts cannot have fixed pockets
    if (account.type === 'investment' && type === 'fixed') {
      throw new Error('Investment accounts cannot have fixed expenses pockets.');
    }

    // Validate uniqueness within account
    if (!this.validatePocketUniqueness(accountId, trimmedName)) {
      throw new Error(`A pocket with name "${trimmedName}" already exists in this account.`);
    }

    // If creating fixed pocket, validate global uniqueness
    if (type === 'fixed') {
      // Disallow fixed pocket in investment accounts
      if (account.type === 'investment') {
        throw new Error('Investment accounts cannot have a fixed expenses pocket.');
      }
      if (!this.validateFixedPocketUniqueness()) {
        throw new Error('A fixed expenses pocket already exists. Only one fixed expenses pocket is allowed.');
      }
    }

    const pocket: Pocket = {
      id: generateId(),
      accountId,
      name: trimmedName,
      type,
      balance: 0,
      currency: account.currency, // Inherit from account
    };

    const pockets = this.getAllPockets();
    pockets.push(pocket);
    StorageService.savePockets(pockets);

    // Recalculate account balance (reuse accountService from above)
    await accountService.updateAccount(accountId, {});

    return pocket;
  }

  // Update pocket
  async updatePocket(id: string, updates: Partial<Pick<Pocket, 'name'>>): Promise<Pocket> {
    const pockets = this.getAllPockets();
    const index = pockets.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error(`Pocket with id "${id}" not found.`);
    }

    const pocket = pockets[index];

    // Validate and sanitize updates
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Pocket name cannot be empty.');
      }
      // Validate uniqueness if name changed
      if (trimmedName.toLowerCase() !== pocket.name.toLowerCase()) {
        if (!this.validatePocketUniqueness(pocket.accountId, trimmedName, id)) {
          throw new Error(`A pocket with name "${trimmedName}" already exists in this account.`);
        }
      }
      updates.name = trimmedName;
    }

    const updatedPocket = { ...pocket, ...updates };

    // Recalculate balance
    updatedPocket.balance = await this.calculatePocketBalance(id);

    pockets[index] = updatedPocket;
    StorageService.savePockets(pockets);

    // Recalculate account balance
    const accountService = await getAccountService();
    await accountService.updateAccount(pocket.accountId, {});

    return updatedPocket;
  }

  // Delete pocket
  async deletePocket(id: string): Promise<void> {
    const pockets = this.getAllPockets();
    const index = pockets.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error(`Pocket with id "${id}" not found.`);
    }

    const pocket = pockets[index];

    // If fixed pocket, check for sub-pockets
    if (pocket.type === 'fixed') {
      const subPocketService = await getSubPocketService();
      const subPockets = subPocketService.getSubPocketsByPocket(id);
      if (subPockets.length > 0) {
        throw new Error(`Cannot delete fixed expenses pocket because it has ${subPockets.length} sub-pocket(s). Delete sub-pockets first.`);
      }
    }

    pockets.splice(index, 1);
    StorageService.savePockets(pockets);

    // Recalculate account balance
    const accountService = await getAccountService();
    await accountService.updateAccount(pocket.accountId, {});
  }

  // Get the fixed expenses pocket (there should only be one)
  getFixedExpensesPocket(): Pocket | null {
    const pockets = this.getAllPockets();
    return pockets.find(p => p.type === 'fixed') || null;
  }
}

export const pocketService = new PocketService();

