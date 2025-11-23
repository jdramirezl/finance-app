import type { Account } from '../types';
import { StorageService } from './storageService';
import { generateId } from '../utils/idGenerator';

// Lazy getter to avoid circular dependency - using dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pocketServiceCache: any = null;
const getPocketService = async () => {
  if (!pocketServiceCache) {
    const module = await import('./pocketService');
    pocketServiceCache = module.pocketService;
  }
  return pocketServiceCache;
};

class AccountService {
  // Get all accounts
  getAllAccounts(): Account[] {
    return StorageService.getAccounts();
  }

  // Get account by ID
  getAccount(id: string): Account | null {
    const accounts = this.getAllAccounts();
    return accounts.find(acc => acc.id === id) || null;
  }

  // Validate account uniqueness (name + currency combination)
  validateAccountUniqueness(name: string, currency: string, excludeId?: string): boolean {
    const accounts = this.getAllAccounts();
    const existing = accounts.find(
      acc => acc.name === name && acc.currency === currency && acc.id !== excludeId
    );
    return !existing; // Returns true if unique (no existing account found)
  }

  // Calculate account balance (sum of all pocket balances)
  // Note: This method should be called after pockets are loaded
  async calculateAccountBalance(accountId: string): Promise<number> {
    // Import dynamically to avoid circular dependency
    const pocketService = await getPocketService();
    const pockets = pocketService.getPocketsByAccount(accountId);
    return pockets.reduce((sum: number, pocket: { balance: number }) => sum + pocket.balance, 0);
  }

  // Create new account
  createAccount(
    name: string,
    color: string,
    currency: Account['currency'],
    type: Account['type'] = 'normal',
    stockSymbol?: string
  ): Account {
    // Validate uniqueness
    if (!this.validateAccountUniqueness(name, currency)) {
      throw new Error(`An account with name "${name}" and currency "${currency}" already exists.`);
    }

    const account: Account = {
      id: generateId(),
      name,
      color,
      currency,
      balance: 0,
      type,
      ...(type === 'investment' && {
        stockSymbol: stockSymbol || 'VOO',
        montoInvertido: 0,
        shares: 0,
      }),
    };

    const accounts = this.getAllAccounts();
    accounts.push(account);
    StorageService.saveAccounts(accounts);

    return account;
  }

  // Update account
  async updateAccount(id: string, updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>>): Promise<Account> {
    const accounts = this.getAllAccounts();
    const index = accounts.findIndex(acc => acc.id === id);

    if (index === -1) {
      throw new Error(`Account with id "${id}" not found.`);
    }

    const account = accounts[index];
    const updatedAccount = { ...account, ...updates };

    // Validate uniqueness if name or currency changed
    if (updates.name || updates.currency) {
      const newName = updates.name || account.name;
      const newCurrency = updates.currency || account.currency;
      if (!this.validateAccountUniqueness(newName, newCurrency, id)) {
        throw new Error(`An account with name "${newName}" and currency "${newCurrency}" already exists.`);
      }
    }

    // If currency changed, update all pockets' currency
    if (updates.currency) {
      const pocketService = await getPocketService();
      const pockets = pocketService.getPocketsByAccount(id);
      const allPockets = pocketService.getAllPockets();
      pockets.forEach((pocket: { id: string }) => {
        const pocketIndex = allPockets.findIndex((p: { id: string }) => p.id === pocket.id);
        if (pocketIndex !== -1) {
          allPockets[pocketIndex].currency = updates.currency!;
        }
      });
      StorageService.savePockets(allPockets);
    }

    // Recalculate balance
    updatedAccount.balance = await this.calculateAccountBalance(id);

    accounts[index] = updatedAccount;
    StorageService.saveAccounts(accounts);

    return updatedAccount;
  }

  // Delete account
  async deleteAccount(id: string): Promise<void> {
    const accounts = this.getAllAccounts();
    const index = accounts.findIndex(acc => acc.id === id);

    if (index === -1) {
      throw new Error(`Account with id "${id}" not found.`);
    }

    // Check if account has pockets
    const pocketService = await getPocketService();
    const pockets = pocketService.getPocketsByAccount(id);
    if (pockets.length > 0) {
      throw new Error(`Cannot delete account "${accounts[index].name}" because it has ${pockets.length} pocket(s). Delete pockets first.`);
    }

    accounts.splice(index, 1);
    StorageService.saveAccounts(accounts);
  }

  // Recalculate all account balances (useful after movements)
  async recalculateAllBalances(): Promise<void> {
    const accounts = this.getAllAccounts();
    for (const account of accounts) {
      account.balance = await this.calculateAccountBalance(account.id);
    }
    StorageService.saveAccounts(accounts);
  }
}

export const accountService = new AccountService();

