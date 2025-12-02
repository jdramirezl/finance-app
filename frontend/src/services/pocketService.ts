import type { Pocket } from '../types';
import { SupabaseStorageService } from './supabaseStorageService';
import { generateId } from '../utils/idGenerator';
import { apiClient } from './apiClient';

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
  // Feature flag to control backend usage
  private useBackend = import.meta.env.VITE_USE_BACKEND_POCKETS === 'true';

  constructor() {
    // Log which mode we're in
    if (this.useBackend) {
      console.log('🚀 PocketService: Using BACKEND API at', import.meta.env.VITE_API_URL);
    } else {
      console.log('📦 PocketService: Using DIRECT Supabase calls');
    }
  }
  // Get all pockets
  async getAllPockets(): Promise<Pocket[]> {
    // Note: Backend doesn't have a "get all pockets" endpoint
    // This is only used internally, so we always use direct Supabase
    return await this.getAllPocketsDirect();
  }

  // Direct Supabase implementation (fallback)
  private async getAllPocketsDirect(): Promise<Pocket[]> {
    return await SupabaseStorageService.getPockets();
  }

  // Get pocket by ID
  async getPocket(id: string): Promise<Pocket | null> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: GET /api/pockets/' + id);
        return await apiClient.get<Pocket>(`/api/pockets/${id}`);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.getPocketDirect(id);
      }
    }
    return await this.getPocketDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async getPocketDirect(id: string): Promise<Pocket | null> {
    const pockets = await this.getAllPocketsDirect();
    return pockets.find(p => p.id === id) || null;
  }

  // Get pockets by account
  async getPocketsByAccount(accountId: string): Promise<Pocket[]> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: GET /api/pockets?accountId=' + accountId);
        return await apiClient.get<Pocket[]>(`/api/pockets?accountId=${accountId}`);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.getPocketsByAccountDirect(accountId);
      }
    }
    return await this.getPocketsByAccountDirect(accountId);
  }

  // Direct Supabase implementation (fallback)
  private async getPocketsByAccountDirect(accountId: string): Promise<Pocket[]> {
    const pockets = await this.getAllPocketsDirect();
    return pockets.filter(p => p.accountId === accountId);
  }

  // Validate pocket uniqueness within an account
  async validatePocketUniqueness(accountId: string, name: string, excludeId?: string): Promise<boolean> {
    const pockets = await this.getPocketsByAccount(accountId);
    const existing = pockets.find(
      p => p.name === name && p.id !== excludeId
    );
    return !existing; // Returns true if unique
  }

  // Validate that only one fixed pocket exists globally
  async validateFixedPocketUniqueness(excludeId?: string): Promise<boolean> {
    const pockets = await this.getAllPockets();
    const fixedPockets = pockets.filter(p => p.type === 'fixed' && p.id !== excludeId);
    return fixedPockets.length === 0; // Returns true if no other fixed pocket exists
  }

  // Calculate pocket balance
  // For fixed pockets: sum of sub-pocket balances
  // For normal pockets: sum of movements (handled by movement service)
  async calculatePocketBalance(pocketId: string): Promise<number> {
    const pocket = await this.getPocket(pocketId);
    if (!pocket) return 0;

    if (pocket.type === 'fixed') {
      // Sum of all sub-pocket balances
      const subPocketService = await getSubPocketService();
      const subPockets = await subPocketService.getSubPocketsByPocket(pocketId);
      return subPockets.reduce((sum: number, sub: { balance: number }) => sum + sub.balance, 0);
    }

    // For normal pockets, balance is calculated from movements
    // This will be handled by movementService
    return pocket.balance;
  }

  // Create new pocket
  async createPocket(accountId: string, name: string, type: Pocket['type']): Promise<Pocket> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: POST /api/pockets', { accountId, name, type });
        return await apiClient.post<Pocket>('/api/pockets', {
          accountId,
          name,
          type,
        });
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.createPocketDirect(accountId, name, type);
      }
    }
    return await this.createPocketDirect(accountId, name, type);
  }

  // Direct Supabase implementation (fallback)
  private async createPocketDirect(accountId: string, name: string, type: Pocket['type']): Promise<Pocket> {
    // Validate and sanitize input
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Pocket name cannot be empty.');
    }

    // Validate account exists (dynamic import to avoid circular dependency)
    const accountService = await getAccountService();
    const account = await accountService.getAccount(accountId);
    if (!account) {
      throw new Error(`Account with id "${accountId}" not found.`);
    }

    // Investment accounts cannot have fixed pockets
    if (account.type === 'investment' && type === 'fixed') {
      throw new Error('Investment accounts cannot have fixed expenses pockets.');
    }

    // Validate uniqueness within account
    if (!(await this.validatePocketUniqueness(accountId, trimmedName))) {
      throw new Error(`A pocket with name "${trimmedName}" already exists in this account.`);
    }

    // If creating fixed pocket, validate global uniqueness
    if (type === 'fixed') {
      // Disallow fixed pocket in investment accounts
      if (account.type === 'investment') {
        throw new Error('Investment accounts cannot have a fixed expenses pocket.');
      }
      if (!(await this.validateFixedPocketUniqueness())) {
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

    // Insert directly - much faster
    await SupabaseStorageService.insertPocket(pocket);

    // Note: Account balance will be recalculated by store when it reloads
    // No need to trigger updateAccount here

    return pocket;
  }

  // Update pocket
  async updatePocket(id: string, updates: Partial<Pick<Pocket, 'name'>>): Promise<Pocket> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: PUT /api/pockets/' + id, updates);
        return await apiClient.put<Pocket>(`/api/pockets/${id}`, updates);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.updatePocketDirect(id, updates);
      }
    }
    return await this.updatePocketDirect(id, updates);
  }

  // Direct Supabase implementation (fallback)
  private async updatePocketDirect(id: string, updates: Partial<Pick<Pocket, 'name'>>): Promise<Pocket> {
    const pockets = await this.getAllPocketsDirect();
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
        if (!(await this.validatePocketUniqueness(pocket.accountId, trimmedName, id))) {
          throw new Error(`A pocket with name "${trimmedName}" already exists in this account.`);
        }
      }
      updates.name = trimmedName;
    }

    const updatedPocket = { ...pocket, ...updates };

    // Recalculate balance
    updatedPocket.balance = await this.calculatePocketBalance(id);

    // Update directly - much faster
    await SupabaseStorageService.updatePocket(id, updatedPocket);

    // Note: Account balance will be recalculated by store when it reloads

    return updatedPocket;
  }

  // Delete pocket
  async deletePocket(id: string): Promise<void> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: DELETE /api/pockets/' + id);
        await apiClient.delete(`/api/pockets/${id}`);
        return;
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.deletePocketDirect(id);
      }
    }
    return await this.deletePocketDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async deletePocketDirect(id: string): Promise<void> {
    const pocket = await this.getPocketDirect(id);
    if (!pocket) {
      throw new Error(`Pocket with id "${id}" not found.`);
    }

    // If fixed pocket, check for sub-pockets
    if (pocket.type === 'fixed') {
      const subPocketService = await getSubPocketService();
      const subPockets = await subPocketService.getSubPocketsByPocket(id);
      if (subPockets.length > 0) {
        throw new Error(`Cannot delete fixed expenses pocket because it has ${subPockets.length} sub-pocket(s). Delete sub-pockets first.`);
      }
    }

    // Delete directly - much faster
    await SupabaseStorageService.deletePocket(id);

    // Note: Account balance will be recalculated by store when it reloads
  }

  // Get the fixed expenses pocket (there should only be one)
  async getFixedExpensesPocket(): Promise<Pocket | null> {
    const pockets = await this.getAllPockets();
    return pockets.find(p => p.type === 'fixed') || null;
  }

  // Migrate fixed pocket to another account (maintaining all movements and sub-pockets)
  async migrateFixedPocketToAccount(pocketId: string, targetAccountId: string): Promise<Pocket> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: POST /api/pockets/' + pocketId + '/migrate', { targetAccountId });
        return await apiClient.post<Pocket>(`/api/pockets/${pocketId}/migrate`, {
          targetAccountId,
        });
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.migrateFixedPocketToAccountDirect(pocketId, targetAccountId);
      }
    }
    return await this.migrateFixedPocketToAccountDirect(pocketId, targetAccountId);
  }

  // Direct Supabase implementation (fallback)
  private async migrateFixedPocketToAccountDirect(pocketId: string, targetAccountId: string): Promise<Pocket> {
    console.log(`🔄 [migrateFixedPocketToAccount] Starting migration - pocketId: ${pocketId}, targetAccountId: ${targetAccountId}`);
    
    const pocket = await this.getPocketDirect(pocketId);
    if (!pocket) {
      throw new Error(`Pocket with id "${pocketId}" not found.`);
    }
    console.log(`✅ [migrateFixedPocketToAccount] Found pocket:`, pocket);

    if (pocket.type !== 'fixed') {
      throw new Error('Only fixed pockets can be migrated using this method.');
    }

    // Validate target account exists
    const accountService = await getAccountService();
    const targetAccount = await accountService.getAccount(targetAccountId);
    if (!targetAccount) {
      throw new Error(`Target account with id "${targetAccountId}" not found.`);
    }
    console.log(`✅ [migrateFixedPocketToAccount] Found target account:`, targetAccount);

    // Investment accounts cannot have fixed pockets
    if (targetAccount.type === 'investment') {
      throw new Error('Investment accounts cannot have fixed expenses pockets.');
    }

    // Check if target account already has a pocket with the same name
    if (!(await this.validatePocketUniqueness(targetAccountId, pocket.name, pocketId))) {
      throw new Error(`A pocket with name "${pocket.name}" already exists in the target account.`);
    }
    console.log(`✅ [migrateFixedPocketToAccount] Pocket name is unique in target account`);

    // Update pocket's accountId and currency
    const updatedPocket = {
      ...pocket,
      accountId: targetAccountId,
      currency: targetAccount.currency,
    };

    console.log(`💾 [migrateFixedPocketToAccount] Updating pocket in storage:`, updatedPocket);
    await SupabaseStorageService.updatePocket(pocketId, updatedPocket);
    console.log(`✅ [migrateFixedPocketToAccount] Pocket updated in storage`);

    // Update all movements associated with this pocket to the new account
    const { movementService } = await import('./movementService');
    console.log(`🔄 [migrateFixedPocketToAccount] Updating movements for pocket`);
    const movementCount = await movementService.updateMovementsAccountForPocket(pocketId, targetAccountId);
    console.log(`✅ [migrateFixedPocketToAccount] Updated ${movementCount} movements`);

    console.log(`🎉 [migrateFixedPocketToAccount] Migration complete!`);
    return updatedPocket;
  }

  // Reorder pockets within an account
  async reorderPockets(pocketIds: string[]): Promise<void> {
    if (this.useBackend) {
      try {
        console.log('🔵 Backend API: POST /api/pockets/reorder', { pocketIds });
        await apiClient.post('/api/pockets/reorder', { pocketIds });
        return;
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.reorderPocketsDirect(pocketIds);
      }
    }
    return await this.reorderPocketsDirect(pocketIds);
  }

  // Direct Supabase implementation (fallback)
  private async reorderPocketsDirect(pocketIds: string[]): Promise<void> {
    const pockets = await this.getAllPocketsDirect();
    
    // Update display order for each pocket based on position in array
    const updatedPockets = pockets.map(pocket => {
      const newIndex = pocketIds.indexOf(pocket.id);
      if (newIndex !== -1) {
        return { ...pocket, displayOrder: newIndex };
      }
      return pocket;
    });
    
    await SupabaseStorageService.savePockets(updatedPockets);
  }
}

export const pocketService = new PocketService();

