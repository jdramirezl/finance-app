import { create } from 'zustand';
import type { Account, Pocket, SubPocket, Movement, Settings, MovementType, MovementTemplate, FixedExpenseGroup } from '../types';
import { accountService } from '../services/accountService';
import { pocketService } from '../services/pocketService';
import { subPocketService } from '../services/subPocketService';
import { movementService } from '../services/movementService';
import { movementTemplateService } from '../services/movementTemplateService';
import { fixedExpenseGroupService } from '../services/fixedExpenseGroupService';
import { SupabaseStorageService } from '../services/supabaseStorageService';

interface FinanceStore {
  // State
  accounts: Account[];
  pockets: Pocket[];
  subPockets: SubPocket[];
  movements: Movement[];
  movementTemplates: MovementTemplate[];
  fixedExpenseGroups: FixedExpenseGroup[];
  settings: Settings;
  selectedAccountId: string | null;
  orphanedCount: number;

  // Actions - Accounts
  loadAccounts: (skipInvestmentPrices?: boolean) => Promise<void>;
  createAccount: (name: string, color: string, currency: Account['currency'], type?: Account['type'], stockSymbol?: string) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  deleteAccountCascade: (id: string, deleteMovements?: boolean) => Promise<{ account: string; pockets: number; subPockets: number; movements: number }>;
  selectAccount: (id: string | null) => void;
  reorderAccounts: (accounts: Account[]) => Promise<void>;

  // Actions - Pockets
  loadPockets: () => Promise<void>;
  createPocket: (accountId: string, name: string, type: Pocket['type']) => Promise<void>;
  updatePocket: (id: string, updates: Partial<Pick<Pocket, 'name'>>) => Promise<void>;
  deletePocket: (id: string) => Promise<void>;
  reorderPockets: (pockets: Pocket[]) => Promise<void>;
  migrateFixedPocketToAccount: (pocketId: string, targetAccountId: string) => Promise<void>;

  // Actions - SubPockets
  loadSubPockets: () => Promise<void>;
  createSubPocket: (pocketId: string, name: string, valueTotal: number, periodicityMonths: number, groupId?: string) => Promise<void>;
  updateSubPocket: (id: string, updates: Partial<Pick<SubPocket, 'name' | 'valueTotal' | 'periodicityMonths' | 'groupId'>>) => Promise<void>;
  deleteSubPocket: (id: string) => Promise<void>;
  toggleSubPocketEnabled: (id: string) => Promise<void>;
  moveSubPocketToGroup: (subPocketId: string, groupId: string) => Promise<void>;
  reorderSubPockets: (subPockets: SubPocket[]) => Promise<void>;

  // Actions - Fixed Expense Groups
  loadFixedExpenseGroups: () => Promise<void>;
  createFixedExpenseGroup: (name: string, color: string) => Promise<void>;
  updateFixedExpenseGroup: (id: string, name: string, color: string) => Promise<void>;
  deleteFixedExpenseGroup: (id: string) => Promise<void>;
  toggleFixedExpenseGroup: (groupId: string, enabled: boolean) => Promise<void>;

  // Actions - Movements
  loadMovements: () => Promise<void>;
  createMovement: (type: MovementType, accountId: string, pocketId: string, amount: number, notes?: string, displayedDate?: string, subPocketId?: string, isPending?: boolean) => Promise<void>;
  updateMovement: (id: string, updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  applyPendingMovement: (id: string) => Promise<void>;
  markAsPending: (id: string) => Promise<void>;
  getMovementsGroupedByMonth: () => Promise<Map<string, Movement[]>>;
  getMonthKeysWithCounts: () => Promise<Map<string, number>>;
  getMovementsByMonthPaginated: (monthKey: string, offset: number, limit: number) => Promise<Movement[]>;
  getPendingMovements: () => Promise<Movement[]>;
  getAppliedMovements: () => Promise<Movement[]>;
  getOrphanedMovements: () => Promise<Movement[]>;
  getOrphanedMovementsCount: () => Promise<number>;
  findMatchingOrphanedMovements: (accountName: string, accountCurrency: string, pocketName?: string) => Promise<Movement[]>;
  restoreOrphanedMovements: (movementIds: string[], accountId: string, pocketId: string) => Promise<number>;
  recalculateAllBalances: () => Promise<void>;

  // Actions - Settings
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;

  // Actions - Movement Templates
  loadMovementTemplates: () => Promise<void>;
  createMovementTemplate: (name: string, type: MovementType, accountId: string, pocketId: string, defaultAmount?: number, notes?: string, subPocketId?: string) => Promise<void>;
  updateMovementTemplate: (id: string, updates: Partial<Pick<MovementTemplate, 'name' | 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'defaultAmount' | 'notes'>>) => Promise<void>;
  deleteMovementTemplate: (id: string) => Promise<void>;

  // Computed getters (as methods)
  getPocketsByAccount: (accountId: string) => Pocket[];
  getSubPocketsByPocket: (pocketId: string) => SubPocket[];
  getSubPocketsByGroup: (groupId: string) => SubPocket[];
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  // Initial state
  accounts: [],
  pockets: [],
  subPockets: [],
  fixedExpenseGroups: [],
  movements: [],
  movementTemplates: [],
  settings: { primaryCurrency: 'USD' },
  selectedAccountId: null,
  orphanedCount: 0,

  // Load data from storage
  // NOTE: This now loads accounts, pockets, AND subPockets in one call
  // to avoid duplicate loads and ensure all balances are calculated correctly
  // OPTIMIZATION: skipInvestmentPrices=true to avoid fetching stock prices when not needed
  loadAccounts: async (skipInvestmentPrices = false) => {
    // OPTIMIZATION: Fetch all data in parallel instead of sequentially
    const [accounts, pockets, subPockets] = await Promise.all([
      accountService.getAllAccounts(),
      pocketService.getAllPockets(),
      SupabaseStorageService.getSubPockets(),
    ]);
    
    // STEP 1: Recalculate fixed pocket balances from sub-pockets
    const updatedPockets = pockets.map((pocket) => {
      if (pocket.type === 'fixed') {
        const pocketSubPockets = subPockets.filter(sp => sp.pocketId === pocket.id);
        const calculatedBalance = pocketSubPockets.reduce((sum, sp) => sum + sp.balance, 0);
        return { ...pocket, balance: calculatedBalance };
      }
      return pocket;
    });
    
    // STEP 2: Calculate account balances
    // - Investment accounts: use market value (shares × current price) - ONLY if not skipped
    // - Normal accounts: sum pocket balances
    const updatedAccountsPromises = accounts.map(async (account) => {
      if (account.type === 'investment' && account.stockSymbol && !skipInvestmentPrices) {
        try {
          const { investmentService } = await import('../services/investmentService');
          const invData = await investmentService.updateInvestmentAccount(account);
          return { ...account, balance: invData.totalValue };
        } catch (error) {
          console.error(`Error loading investment data for ${account.name}:`, error);
          // Fallback to pocket balances on error
          const accountPockets = updatedPockets.filter(p => p.accountId === account.id);
          const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
          return { ...account, balance: calculatedBalance };
        }
      } else {
        // Normal account OR skipping investment prices - sum pocket balances
        const accountPockets = updatedPockets.filter(p => p.accountId === account.id);
        const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
        return { ...account, balance: calculatedBalance };
      }
    });
    
    const updatedAccounts = await Promise.all(updatedAccountsPromises);
    
    // STEP 3: Update all state in a single set() call to avoid multiple re-renders
    set({ 
      accounts: updatedAccounts,
      pockets: updatedPockets,
      subPockets: Array.isArray(subPockets) ? subPockets : [],
    });
  },

  loadPockets: async () => {
    const pockets = await pocketService.getAllPockets();
    
    // CRITICAL: Recalculate fixed pocket balances from sub-pockets
    // Fixed pocket balances in storage may be stale - sub-pockets are the source of truth
    const subPockets = await SupabaseStorageService.getSubPockets();
    const updatedPockets = pockets.map((pocket) => {
      if (pocket.type === 'fixed') {
        const pocketSubPockets = subPockets.filter(sp => sp.pocketId === pocket.id);
        const calculatedBalance = pocketSubPockets.reduce((sum, sp) => sum + sp.balance, 0);
        return { ...pocket, balance: calculatedBalance };
      }
      return pocket;
    });
    
    set({ pockets: Array.isArray(updatedPockets) ? updatedPockets : [] });
    
    // Recalculate account balances from updated pockets
    set((state) => {
      const updatedAccounts = state.accounts.map((account) => {
        const accountPockets = updatedPockets.filter(p => p.accountId === account.id);
        const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
        return { ...account, balance: calculatedBalance };
      });
      return { accounts: updatedAccounts };
    });
  },

  loadSubPockets: async () => {
    const subPockets = await SupabaseStorageService.getSubPockets();
    set({ subPockets: Array.isArray(subPockets) ? subPockets : [] });
  },

  loadMovements: async () => {
    // OPTIMIZATION: Load movements and orphan count in parallel
    const [movements, orphanedCount] = await Promise.all([
      movementService.getActiveMovements(),
      movementService.getOrphanedMovements().then(orphaned => orphaned.length),
    ]);
    
    set({ 
      movements: Array.isArray(movements) ? movements : [],
      orphanedCount,
    });
  },

  loadSettings: async () => {
    const settings = await SupabaseStorageService.getSettings();
    if (settings) {
      set({ settings });
    }
  },

  // Account actions
  createAccount: async (name, color, currency, type = 'normal', stockSymbol) => {
    try {
      const account = await accountService.createAccount(name, color, currency, type, stockSymbol);
      // Optimistic update
      set((state) => ({ accounts: [...state.accounts, account] }));
      // Reload pockets in background (for investment accounts)
      get().loadPockets();
    } catch (error) {
      await get().loadAccounts();
      throw error;
    }
  },

  updateAccount: async (id, updates) => {
    try {
      const updated = await accountService.updateAccount(id, updates);
      // Optimistic update
      set((state) => ({
        accounts: state.accounts.map((acc) => (acc.id === id ? updated : acc)),
      }));
    } catch (error) {
      await get().loadAccounts();
      throw error;
    }
  },

  deleteAccount: async (id) => {
    try {
      await accountService.deleteAccount(id);
      // Optimistic update
      set((state) => ({
        accounts: state.accounts.filter((acc) => acc.id !== id),
        selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId,
      }));
      // Reload pockets in background (cascade delete)
      get().loadPockets();
    } catch (error) {
      await get().loadAccounts();
      throw error;
    }
  },

  deleteAccountCascade: async (id: string, deleteMovements: boolean = false) => {
    try {
      const result = await accountService.deleteAccountCascade(id, deleteMovements);
      // Optimistic update - remove account and reload everything
      set((state) => ({
        accounts: state.accounts.filter((acc) => acc.id !== id),
        selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId,
      }));
      // Reload all data to reflect cascade deletions (including movements for orphan filtering)
      await Promise.all([
        get().loadAccounts(),
        get().loadMovements(), // CRITICAL: Reload movements so orphan filtering works
      ]);
      return result;
    } catch (error) {
      await Promise.all([
        get().loadAccounts(),
        get().loadMovements(),
      ]);
      throw error;
    }
  },

  selectAccount: (id) => {
    set({ selectedAccountId: id });
  },

  reorderAccounts: async (accounts) => {
    // Update display order for each account
    const accountsWithOrder = accounts.map((account, index) => ({
      ...account,
      displayOrder: index,
    }));
    
    // Save to storage
    await SupabaseStorageService.saveAccounts(accountsWithOrder);
    
    // Update state
    set({ accounts: accountsWithOrder });
  },

  // Pocket actions
  createPocket: async (accountId, name, type) => {
    try {
      const pocket = await pocketService.createPocket(accountId, name, type);
      
      // Update pockets and account balance in a single set call
      set((state) => {
        const updatedPockets = [...state.pockets, pocket];
        
        // Calculate account balance from updated pockets
        const accountPockets = updatedPockets.filter(p => p.accountId === accountId);
        const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
        
        // Update account with calculated balance
        const updatedAccounts = state.accounts.map((a) => 
          a.id === accountId ? { ...a, balance: calculatedBalance } : a
        );
        
        return {
          pockets: updatedPockets,
          accounts: updatedAccounts,
        };
      });
    } catch (error) {
      // On error, reload to ensure consistency
      await get().loadPockets();
      throw error;
    }
  },

  updatePocket: async (id, updates) => {
    try {
      const updated = await pocketService.updatePocket(id, updates);
      
      // Update pockets and account balance in a single set call
      set((state) => {
        const updatedPockets = state.pockets.map((p) => (p.id === id ? updated : p));
        
        // Calculate account balance from updated pockets
        const accountPockets = updatedPockets.filter(p => p.accountId === updated.accountId);
        const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
        
        // Update account with calculated balance
        const updatedAccounts = state.accounts.map((a) => 
          a.id === updated.accountId ? { ...a, balance: calculatedBalance } : a
        );
        
        return {
          pockets: updatedPockets,
          accounts: updatedAccounts,
        };
      });
    } catch (error) {
      // On error, reload to ensure consistency
      await get().loadPockets();
      throw error;
    }
  },

  deletePocket: async (id) => {
    try {
      // Get pocket before deleting to know which account to reload
      const pocket = get().pockets.find((p) => p.id === id);
      await pocketService.deletePocket(id);
      
      // Update pockets and account balance in a single set call
      if (pocket) {
        set((state) => {
          const updatedPockets = state.pockets.filter((p) => p.id !== id);
          
          // Calculate account balance from remaining pockets
          const accountPockets = updatedPockets.filter(p => p.accountId === pocket.accountId);
          const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
          
          // Update account with calculated balance
          const updatedAccounts = state.accounts.map((a) => 
            a.id === pocket.accountId ? { ...a, balance: calculatedBalance } : a
          );
          
          return {
            pockets: updatedPockets,
            accounts: updatedAccounts,
          };
        });
      } else {
        // If pocket not found, just remove it
        set((state) => ({
          pockets: state.pockets.filter((p) => p.id !== id),
        }));
      }
    } catch (error) {
      // On error, reload to ensure consistency
      await get().loadPockets();
      throw error;
    }
  },

  reorderPockets: async (pockets) => {
    // Update display order for each pocket
    const pocketsWithOrder = pockets.map((pocket, index) => ({
      ...pocket,
      displayOrder: index,
    }));
    
    // Save to storage
    await SupabaseStorageService.savePockets(pocketsWithOrder);
    
    // Update state
    set({ pockets: pocketsWithOrder });
    
    // Selective reload: only reload affected accounts (pockets might belong to different accounts)
    const affectedAccountIds = [...new Set(pockets.map(p => p.accountId))];
    for (const accountId of affectedAccountIds) {
      const account = await accountService.getAccount(accountId);
      if (account) {
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === accountId ? account : a)),
        }));
      }
    }
  },

  migrateFixedPocketToAccount: async (pocketId, targetAccountId) => {
    console.log(`🏪 [Store] migrateFixedPocketToAccount called - pocketId: ${pocketId}, targetAccountId: ${targetAccountId}`);
    try {
      // Migrate pocket and all movements
      console.log(`🏪 [Store] Calling pocketService.migrateFixedPocketToAccount`);
      await pocketService.migrateFixedPocketToAccount(pocketId, targetAccountId);
      console.log(`🏪 [Store] Migration service call complete`);
      
      // Reload everything to reflect changes
      console.log(`🏪 [Store] Reloading accounts and movements`);
      await Promise.all([
        get().loadAccounts(),
        get().loadMovements(),
      ]);
      console.log(`🏪 [Store] Reload complete`);
      
      // Select the target account to show the migrated pocket
      console.log(`🏪 [Store] Selecting target account: ${targetAccountId}`);
      set({ selectedAccountId: targetAccountId });
      console.log(`🏪 [Store] Migration complete!`);
    } catch (error) {
      console.error(`❌ [Store] Migration failed:`, error);
      await Promise.all([
        get().loadAccounts(),
        get().loadMovements(),
      ]);
      throw error;
    }
  },

  // SubPocket actions
  createSubPocket: async (pocketId, name, valueTotal, periodicityMonths, groupId) => {
    try {
      const subPocket = await subPocketService.createSubPocket(pocketId, name, valueTotal, periodicityMonths, groupId);
      // Optimistic update
      set((state) => ({ subPockets: [...state.subPockets, subPocket] }));
      
      // Selective reload: batch all updates into a single set() call
      const pocket = await pocketService.getPocket(pocketId);
      if (pocket) {
        const account = await accountService.getAccount(pocket.accountId);
        
        // Single batched update - only one re-render
        set((state) => ({
          pockets: state.pockets.map((p) => (p.id === pocketId ? pocket : p)),
          accounts: account 
            ? state.accounts.map((a) => (a.id === pocket.accountId ? account : a))
            : state.accounts,
        }));
      }
    } catch (error) {
      await get().loadSubPockets();
      throw error;
    }
  },

  updateSubPocket: async (id, updates) => {
    try {
      const updated = await subPocketService.updateSubPocket(id, updates);
      // Optimistic update
      set((state) => ({
        subPockets: state.subPockets.map((sp) => (sp.id === id ? updated : sp)),
      }));
      
      // Selective reload: batch all updates into a single set() call
      const pocket = await pocketService.getPocket(updated.pocketId);
      if (pocket) {
        const account = await accountService.getAccount(pocket.accountId);
        
        // Single batched update - only one re-render
        set((state) => ({
          pockets: state.pockets.map((p) => (p.id === updated.pocketId ? pocket : p)),
          accounts: account 
            ? state.accounts.map((a) => (a.id === pocket.accountId ? account : a))
            : state.accounts,
        }));
      }
    } catch (error) {
      await get().loadSubPockets();
      throw error;
    }
  },

  deleteSubPocket: async (id) => {
    try {
      // Get subPocket before deleting to know what to reload
      const subPocket = get().subPockets.find((sp) => sp.id === id);
      await subPocketService.deleteSubPocket(id);
      // Optimistic update
      set((state) => ({
        subPockets: state.subPockets.filter((sp) => sp.id !== id),
      }));
      
      // Selective reload: batch all updates into a single set() call
      if (subPocket) {
        const pocket = await pocketService.getPocket(subPocket.pocketId);
        if (pocket) {
          const account = await accountService.getAccount(pocket.accountId);
          
          // Single batched update - only one re-render
          set((state) => ({
            pockets: state.pockets.map((p) => (p.id === subPocket.pocketId ? pocket : p)),
            accounts: account 
              ? state.accounts.map((a) => (a.id === pocket.accountId ? account : a))
              : state.accounts,
          }));
        }
      }
    } catch (error) {
      await get().loadSubPockets();
      throw error;
    }
  },

  toggleSubPocketEnabled: async (id) => {
    try {
      const updated = await subPocketService.toggleSubPocketEnabled(id);
      set((state) => ({
        subPockets: state.subPockets.map((sp) => (sp.id === id ? updated : sp)),
      }));
    } catch (error) {
      throw error;
    }
  },

  reorderSubPockets: async (subPockets) => {
    const subPocketsWithOrder = subPockets.map((subPocket, index) => ({
      ...subPocket,
      displayOrder: index,
    }));
    
    await SupabaseStorageService.saveSubPockets(subPocketsWithOrder);
    set({ subPockets: subPocketsWithOrder });
    
    // Selective reload: only reload affected pockets (all subPockets should belong to same pocket)
    const affectedPocketIds = [...new Set(subPockets.map(sp => sp.pocketId))];
    for (const pocketId of affectedPocketIds) {
      const pocket = await pocketService.getPocket(pocketId);
      if (pocket) {
        set((state) => ({
          pockets: state.pockets.map((p) => (p.id === pocketId ? pocket : p)),
        }));
        // Also reload the affected account
        const account = await accountService.getAccount(pocket.accountId);
        if (account) {
          set((state) => ({
            accounts: state.accounts.map((a) => (a.id === pocket.accountId ? account : a)),
          }));
        }
      }
    }
  },

  // Movement actions
  createMovement: async (type, accountId, pocketId, amount, notes, displayedDate, subPocketId, isPending) => {
    try {
      const movement = await movementService.createMovement(
        type,
        accountId,
        pocketId,
        amount,
        notes,
        displayedDate,
        subPocketId,
        isPending
      );
      
      // Selective reload: only reload affected entities (only if not pending)
      if (!isPending) {
        // Reload the affected pocket first
        const pocket = await pocketService.getPocket(pocketId);
        
        // If subPocket is involved, reload it too
        let subPocket = null;
        if (subPocketId) {
          subPocket = await subPocketService.getSubPocket(subPocketId);
        }
        
        // SINGLE set() call: Update movement, pocket, subPocket, and account balance together
        set((state) => {
          // Update pocket
          const updatedPockets = pocket 
            ? state.pockets.map((p) => (p.id === pocketId ? pocket : p))
            : state.pockets;
          
          // Update subPocket if needed
          const updatedSubPockets = subPocket
            ? state.subPockets.map((sp) => (sp.id === subPocketId ? subPocket : sp))
            : state.subPockets;
          
          // Calculate account balance from updated pockets
          const accountPockets = updatedPockets.filter(p => p.accountId === accountId);
          const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
          
          // Update account with calculated balance
          const updatedAccounts = state.accounts.map((a) => 
            a.id === accountId ? { ...a, balance: calculatedBalance } : a
          );
          
          return {
            movements: [...state.movements, movement],
            pockets: updatedPockets,
            subPockets: updatedSubPockets,
            accounts: updatedAccounts,
          };
        });
      } else {
        // Pending movement - only update movements
        set((state) => ({ movements: [...state.movements, movement] }));
      }
    } catch (error) {
      await get().loadMovements();
      throw error;
    }
  },

  updateMovement: async (id, updates) => {
    try {
      const updated = await movementService.updateMovement(id, updates);
      
      // Selective reload: only reload affected entities
      const pocket = await pocketService.getPocket(updated.pocketId);
      
      // If subPocket is involved, reload it too
      let subPocket = null;
      if (updated.subPocketId) {
        subPocket = await subPocketService.getSubPocket(updated.subPocketId);
      }
      
      // SINGLE set() call: Update movement, pocket, subPocket, and account balance together
      set((state) => {
        // Update pocket
        const updatedPockets = pocket 
          ? state.pockets.map((p) => (p.id === updated.pocketId ? pocket : p))
          : state.pockets;
        
        // Update subPocket if needed
        const updatedSubPockets = subPocket
          ? state.subPockets.map((sp) => (sp.id === updated.subPocketId ? subPocket : sp))
          : state.subPockets;
        
        // Calculate account balance from updated pockets
        const accountPockets = updatedPockets.filter(p => p.accountId === updated.accountId);
        const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
        
        // Update account with calculated balance
        const updatedAccounts = state.accounts.map((a) => 
          a.id === updated.accountId ? { ...a, balance: calculatedBalance } : a
        );
        
        return {
          movements: state.movements.map((m) => (m.id === id ? updated : m)),
          pockets: updatedPockets,
          subPockets: updatedSubPockets,
          accounts: updatedAccounts,
        };
      });
    } catch (error) {
      await get().loadMovements();
      throw error;
    }
  },

  deleteMovement: async (id) => {
    try {
      // Get movement before deleting to know what to reload
      const movement = get().movements.find((m) => m.id === id);
      await movementService.deleteMovement(id);
      
      // Selective reload: only reload affected entities
      if (movement) {
        const pocket = await pocketService.getPocket(movement.pocketId);
        
        // If subPocket was involved, reload it too
        let subPocket = null;
        if (movement.subPocketId) {
          subPocket = await subPocketService.getSubPocket(movement.subPocketId);
        }
        
        // SINGLE set() call: Update movement, pocket, subPocket, and account balance together
        set((state) => {
          // Update pocket
          const updatedPockets = pocket 
            ? state.pockets.map((p) => (p.id === movement.pocketId ? pocket : p))
            : state.pockets;
          
          // Update subPocket if needed
          const updatedSubPockets = subPocket
            ? state.subPockets.map((sp) => (sp.id === movement.subPocketId ? subPocket : sp))
            : state.subPockets;
          
          // Calculate account balance from updated pockets
          const accountPockets = updatedPockets.filter(p => p.accountId === movement.accountId);
          const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
          
          // Update account with calculated balance
          const updatedAccounts = state.accounts.map((a) => 
            a.id === movement.accountId ? { ...a, balance: calculatedBalance } : a
          );
          
          return {
            movements: state.movements.filter((m) => m.id !== id),
            pockets: updatedPockets,
            subPockets: updatedSubPockets,
            accounts: updatedAccounts,
          };
        });
      } else {
        // Movement not found, just remove it
        set((state) => ({
          movements: state.movements.filter((m) => m.id !== id),
        }));
      }
    } catch (error) {
      await get().loadMovements();
      throw error;
    }
  },

  getMovementsGroupedByMonth: async () => {
    return await movementService.getMovementsGroupedByMonth();
  },

  getMonthKeysWithCounts: async () => {
    return await movementService.getMonthKeysWithCounts();
  },

  getMovementsByMonthPaginated: async (monthKey: string, offset: number, limit: number) => {
    return await movementService.getMovementsByMonthPaginated(monthKey, offset, limit);
  },

  getPendingMovements: async () => {
    return await movementService.getPendingMovements();
  },

  getAppliedMovements: async () => {
    return await movementService.getAppliedMovements();
  },

  getOrphanedMovements: async () => {
    return await movementService.getOrphanedMovements();
  },

  getOrphanedMovementsCount: async () => {
    const orphaned = await movementService.getOrphanedMovements();
    return orphaned.length;
  },

  findMatchingOrphanedMovements: async (accountName, accountCurrency, pocketName) => {
    return await movementService.findMatchingOrphanedMovements(accountName, accountCurrency, pocketName);
  },

  restoreOrphanedMovements: async (movementIds, accountId, pocketId) => {
    const count = await movementService.restoreOrphanedMovements(movementIds, accountId, pocketId);
    
    // CRITICAL: Recalculate balances after restoration
    // The movements are now active and need to be counted
    await movementService.recalculateBalancesForPocket(pocketId);
    
    // Reload everything to reflect restoration
    await Promise.all([
      get().loadAccounts(),
      get().loadMovements(),
    ]);
    
    return count;
  },

  recalculateAllBalances: async () => {
    console.log('🔄 Starting full balance recalculation...');
    await movementService.recalculateAllPocketBalances();
    
    // Reload everything to reflect new balances
    await Promise.all([
      get().loadAccounts(),
      get().loadPockets(),
      get().loadSubPockets(),
    ]);
    
    console.log('✅ Balance recalculation complete!');
  },

  applyPendingMovement: async (id) => {
    try {
      const applied = await movementService.applyPendingMovement(id);
      
      // Selective reload: only reload affected entities
      const pocket = await pocketService.getPocket(applied.pocketId);
      
      // If subPocket is involved, reload it too
      let subPocket = null;
      if (applied.subPocketId) {
        subPocket = await subPocketService.getSubPocket(applied.subPocketId);
      }
      
      // SINGLE set() call: Update movement, pocket, subPocket, and account balance together
      set((state) => {
        // Update pocket
        const updatedPockets = pocket 
          ? state.pockets.map((p) => (p.id === applied.pocketId ? pocket : p))
          : state.pockets;
        
        // Update subPocket if needed
        const updatedSubPockets = subPocket
          ? state.subPockets.map((sp) => (sp.id === applied.subPocketId ? subPocket : sp))
          : state.subPockets;
        
        // Calculate account balance from updated pockets
        const accountPockets = updatedPockets.filter(p => p.accountId === applied.accountId);
        const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
        
        // Update account with calculated balance
        const updatedAccounts = state.accounts.map((a) => 
          a.id === applied.accountId ? { ...a, balance: calculatedBalance } : a
        );
        
        return {
          movements: state.movements.map((m) => (m.id === id ? applied : m)),
          pockets: updatedPockets,
          subPockets: updatedSubPockets,
          accounts: updatedAccounts,
        };
      });
    } catch (error) {
      throw error;
    }
  },

  markAsPending: async (id) => {
    try {
      const pending = await movementService.markAsPending(id);
      
      // Selective reload: only reload affected entities
      const pocket = await pocketService.getPocket(pending.pocketId);
      
      // If subPocket is involved, reload it too
      let subPocket = null;
      if (pending.subPocketId) {
        subPocket = await subPocketService.getSubPocket(pending.subPocketId);
      }
      
      // SINGLE set() call: Update movement, pocket, subPocket, and account balance together
      set((state) => {
        // Update pocket
        const updatedPockets = pocket 
          ? state.pockets.map((p) => (p.id === pending.pocketId ? pocket : p))
          : state.pockets;
        
        // Update subPocket if needed
        const updatedSubPockets = subPocket
          ? state.subPockets.map((sp) => (sp.id === pending.subPocketId ? subPocket : sp))
          : state.subPockets;
        
        // Calculate account balance from updated pockets
        const accountPockets = updatedPockets.filter(p => p.accountId === pending.accountId);
        const calculatedBalance = accountPockets.reduce((sum, p) => sum + p.balance, 0);
        
        // Update account with calculated balance
        const updatedAccounts = state.accounts.map((a) => 
          a.id === pending.accountId ? { ...a, balance: calculatedBalance } : a
        );
        
        return {
          movements: state.movements.map((m) => (m.id === id ? pending : m)),
          pockets: updatedPockets,
          subPockets: updatedSubPockets,
          accounts: updatedAccounts,
        };
      });
    } catch (error) {
      throw error;
    }
  },

  // Settings actions
  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    await SupabaseStorageService.saveSettings(newSettings);
    set({ settings: newSettings });
  },

  // Movement Template actions
  loadMovementTemplates: async () => {
    const templates = await movementTemplateService.getAllTemplates();
    set({ movementTemplates: templates });
  },

  createMovementTemplate: async (name, type, accountId, pocketId, defaultAmount, notes, subPocketId) => {
    await movementTemplateService.createTemplate(name, type, accountId, pocketId, defaultAmount, notes, subPocketId);
    await get().loadMovementTemplates();
  },

  updateMovementTemplate: async (id, updates) => {
    await movementTemplateService.updateTemplate(id, updates);
    await get().loadMovementTemplates();
  },

  deleteMovementTemplate: async (id) => {
    await movementTemplateService.deleteTemplate(id);
    await get().loadMovementTemplates();
  },

  // Move sub-pocket to group
  moveSubPocketToGroup: async (subPocketId, groupId) => {
    try {
      await subPocketService.moveToGroup(subPocketId, groupId);
      await get().loadSubPockets();
    } catch (error) {
      console.error('Error moving sub-pocket to group:', error);
      throw error;
    }
  },

  // Fixed Expense Groups Actions
  loadFixedExpenseGroups: async () => {
    try {
      const groups = await fixedExpenseGroupService.getAll();
      set({ fixedExpenseGroups: groups });
    } catch (error) {
      console.error('Error loading fixed expense groups:', error);
      throw error;
    }
  },

  createFixedExpenseGroup: async (name, color) => {
    try {
      await fixedExpenseGroupService.create(name, color);
      await get().loadFixedExpenseGroups();
    } catch (error) {
      console.error('Error creating fixed expense group:', error);
      throw error;
    }
  },

  updateFixedExpenseGroup: async (id, name, color) => {
    try {
      await fixedExpenseGroupService.update(id, name, color);
      await get().loadFixedExpenseGroups();
    } catch (error) {
      console.error('Error updating fixed expense group:', error);
      throw error;
    }
  },

  deleteFixedExpenseGroup: async (id) => {
    try {
      await fixedExpenseGroupService.delete(id);
      await Promise.all([
        get().loadFixedExpenseGroups(),
        get().loadSubPockets(), // Reload to show moved expenses
      ]);
    } catch (error) {
      console.error('Error deleting fixed expense group:', error);
      throw error;
    }
  },

  toggleFixedExpenseGroup: async (groupId, enabled) => {
    try {
      await subPocketService.toggleGroup(groupId, enabled);
      await get().loadSubPockets();
      await get().loadPockets(); // Reload to update fixed pocket balance
    } catch (error) {
      console.error('Error toggling fixed expense group:', error);
      throw error;
    }
  },

  // Computed getters
  getPocketsByAccount: (accountId) => {
    return get().pockets.filter((p) => p.accountId === accountId);
  },

  getSubPocketsByPocket: (pocketId) => {
    return get().subPockets.filter((sp) => sp.pocketId === pocketId);
  },

  getSubPocketsByGroup: (groupId: string) => {
    return get().subPockets.filter((sp) => sp.groupId === groupId);
  },
}));

