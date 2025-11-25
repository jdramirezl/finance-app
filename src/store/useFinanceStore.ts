import { create } from 'zustand';
import type { Account, Pocket, SubPocket, Movement, Settings, MovementType } from '../types';
import { accountService } from '../services/accountService';
import { pocketService } from '../services/pocketService';
import { subPocketService } from '../services/subPocketService';
import { movementService } from '../services/movementService';
import { SupabaseStorageService } from '../services/supabaseStorageService';

interface FinanceStore {
  // State
  accounts: Account[];
  pockets: Pocket[];
  subPockets: SubPocket[];
  movements: Movement[];
  settings: Settings;
  selectedAccountId: string | null;

  // Actions - Accounts
  loadAccounts: () => Promise<void>;
  createAccount: (name: string, color: string, currency: Account['currency'], type?: Account['type'], stockSymbol?: string) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  selectAccount: (id: string | null) => void;
  reorderAccounts: (accounts: Account[]) => Promise<void>;

  // Actions - Pockets
  loadPockets: () => Promise<void>;
  createPocket: (accountId: string, name: string, type: Pocket['type']) => Promise<void>;
  updatePocket: (id: string, updates: Partial<Pick<Pocket, 'name'>>) => Promise<void>;
  deletePocket: (id: string) => Promise<void>;
  reorderPockets: (pockets: Pocket[]) => Promise<void>;

  // Actions - SubPockets
  loadSubPockets: () => Promise<void>;
  createSubPocket: (pocketId: string, name: string, valueTotal: number, periodicityMonths: number) => Promise<void>;
  updateSubPocket: (id: string, updates: Partial<Pick<SubPocket, 'name' | 'valueTotal' | 'periodicityMonths'>>) => Promise<void>;
  deleteSubPocket: (id: string) => Promise<void>;
  toggleSubPocketEnabled: (id: string) => Promise<void>;
  reorderSubPockets: (subPockets: SubPocket[]) => Promise<void>;

  // Actions - Movements
  loadMovements: () => Promise<void>;
  createMovement: (type: MovementType, accountId: string, pocketId: string, amount: number, notes?: string, displayedDate?: string, subPocketId?: string, isPending?: boolean) => Promise<void>;
  updateMovement: (id: string, updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  applyPendingMovement: (id: string) => Promise<void>;
  getMovementsGroupedByMonth: () => Promise<Map<string, Movement[]>>;
  getPendingMovements: () => Promise<Movement[]>;
  getAppliedMovements: () => Promise<Movement[]>;

  // Actions - Settings
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;

  // Computed getters (as methods)
  getPocketsByAccount: (accountId: string) => Pocket[];
  getSubPocketsByPocket: (pocketId: string) => SubPocket[];
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  // Initial state
  accounts: [],
  pockets: [],
  subPockets: [],
  movements: [],
  settings: { primaryCurrency: 'USD' },
  selectedAccountId: null,

  // Load data from storage
  // NOTE: This now loads accounts, pockets, AND subPockets in one call
  // to avoid duplicate loads and ensure all balances are calculated correctly
  loadAccounts: async () => {
    const accounts = await accountService.getAllAccounts();
    const pockets = await pocketService.getAllPockets();
    const subPockets = await SupabaseStorageService.getSubPockets();
    
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
    // - Investment accounts: use market value (shares × current price)
    // - Normal accounts: sum pocket balances
    const updatedAccountsPromises = accounts.map(async (account) => {
      if (account.type === 'investment' && account.stockSymbol) {
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
        // Normal account - sum pocket balances
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
    const movements = await SupabaseStorageService.getMovements();
    set({ movements: Array.isArray(movements) ? movements : [] });
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

  // SubPocket actions
  createSubPocket: async (pocketId, name, valueTotal, periodicityMonths) => {
    try {
      const subPocket = await subPocketService.createSubPocket(pocketId, name, valueTotal, periodicityMonths);
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
      // Optimistic update
      set((state) => ({ movements: [...state.movements, movement] }));
      // Selective reload: only reload affected entities (only if not pending)
      if (!isPending) {
        // Reload the affected pocket first
        const pocket = await pocketService.getPocket(pocketId);
        
        // If subPocket is involved, reload it too
        let subPocket = null;
        if (subPocketId) {
          subPocket = await subPocketService.getSubPocket(subPocketId);
        }
        
        // Update pocket, subPocket, and account balance in a single set call
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
          
          console.log('🔍 Movement created - Balance calculation:', {
            accountId,
            pocketId,
            pocketBalance: pocket?.balance,
            accountPocketsCount: accountPockets.length,
            accountPocketsBalances: accountPockets.map(p => ({ id: p.id, name: p.name, balance: p.balance })),
            calculatedBalance,
          });
          
          // Update account with calculated balance
          const updatedAccounts = state.accounts.map((a) => 
            a.id === accountId ? { ...a, balance: calculatedBalance } : a
          );
          
          return {
            pockets: updatedPockets,
            subPockets: updatedSubPockets,
            accounts: updatedAccounts,
          };
        });
      }
    } catch (error) {
      await get().loadMovements();
      throw error;
    }
  },

  updateMovement: async (id, updates) => {
    try {
      const updated = await movementService.updateMovement(id, updates);
      // Optimistic update
      set((state) => ({
        movements: state.movements.map((m) => (m.id === id ? updated : m)),
      }));
      // Selective reload: only reload affected entities
      const pocket = await pocketService.getPocket(updated.pocketId);
      
      // If subPocket is involved, reload it too
      let subPocket = null;
      if (updated.subPocketId) {
        subPocket = await subPocketService.getSubPocket(updated.subPocketId);
      }
      
      // Update pocket, subPocket, and account balance in a single set call
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
      // Optimistic update
      set((state) => ({
        movements: state.movements.filter((m) => m.id !== id),
      }));
      // Selective reload: only reload affected entities
      if (movement) {
        const pocket = await pocketService.getPocket(movement.pocketId);
        
        // If subPocket was involved, reload it too
        let subPocket = null;
        if (movement.subPocketId) {
          subPocket = await subPocketService.getSubPocket(movement.subPocketId);
        }
        
        // Update pocket, subPocket, and account balance in a single set call
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
            pockets: updatedPockets,
            subPockets: updatedSubPockets,
            accounts: updatedAccounts,
          };
        });
      }
    } catch (error) {
      await get().loadMovements();
      throw error;
    }
  },

  getMovementsGroupedByMonth: async () => {
    return await movementService.getMovementsGroupedByMonth();
  },

  getPendingMovements: async () => {
    return await movementService.getPendingMovements();
  },

  getAppliedMovements: async () => {
    return await movementService.getAppliedMovements();
  },

  applyPendingMovement: async (id) => {
    try {
      const applied = await movementService.applyPendingMovement(id);
      set((state) => ({
        movements: state.movements.map((m) => (m.id === id ? applied : m)),
      }));
      // Selective reload: only reload affected entities
      const pocket = await pocketService.getPocket(applied.pocketId);
      
      // If subPocket is involved, reload it too
      let subPocket = null;
      if (applied.subPocketId) {
        subPocket = await subPocketService.getSubPocket(applied.subPocketId);
      }
      
      // Update pocket, subPocket, and account balance in a single set call
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

  // Computed getters
  getPocketsByAccount: (accountId) => {
    return get().pockets.filter((p) => p.accountId === accountId);
  },

  getSubPocketsByPocket: (pocketId) => {
    return get().subPockets.filter((sp) => sp.pocketId === pocketId);
  },
}));

