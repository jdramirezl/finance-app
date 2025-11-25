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
  loadAccounts: async () => {
    const accounts = await accountService.getAllAccounts();
    set({ accounts: Array.isArray(accounts) ? accounts : [] });
  },

  loadPockets: async () => {
    const pockets = await pocketService.getAllPockets();
    set({ pockets: Array.isArray(pockets) ? pockets : [] });
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
      set((state) => ({ accounts: [...state.accounts, account] }));
      await get().loadPockets(); // Reload pockets to ensure sync
    } catch (error) {
      throw error;
    }
  },

  updateAccount: async (id, updates) => {
    try {
      const updated = await accountService.updateAccount(id, updates);
      set((state) => ({
        accounts: state.accounts.map((acc) => (acc.id === id ? updated : acc)),
      }));
      await get().loadPockets(); // Reload to sync balances
    } catch (error) {
      throw error;
    }
  },

  deleteAccount: async (id) => {
    try {
      await accountService.deleteAccount(id);
      set((state) => ({
        accounts: state.accounts.filter((acc) => acc.id !== id),
        selectedAccountId: state.selectedAccountId === id ? null : state.selectedAccountId,
      }));
      await get().loadPockets();
    } catch (error) {
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
      await pocketService.createPocket(accountId, name, type);
      // Reload both pockets and accounts to ensure consistency
      await get().loadPockets();
      await get().loadAccounts();
    } catch (error) {
      throw error;
    }
  },

  updatePocket: async (id, updates) => {
    try {
      await pocketService.updatePocket(id, updates);
      // Reload both pockets and accounts to ensure consistency
      await get().loadPockets();
      await get().loadAccounts();
    } catch (error) {
      throw error;
    }
  },

  deletePocket: async (id) => {
    try {
      await pocketService.deletePocket(id);
      // Reload both pockets and accounts to ensure consistency
      await get().loadPockets();
      await get().loadAccounts();
    } catch (error) {
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
    
    // Reload accounts to ensure consistency
    await get().loadAccounts();
  },

  // SubPocket actions
  createSubPocket: async (pocketId, name, valueTotal, periodicityMonths) => {
    try {
      const subPocket = await subPocketService.createSubPocket(pocketId, name, valueTotal, periodicityMonths);
      set((state) => ({ subPockets: [...state.subPockets, subPocket] }));
      await get().loadPockets(); // Reload pockets to update balances
      await get().loadAccounts(); // Reload accounts to update balances
    } catch (error) {
      throw error;
    }
  },

  updateSubPocket: async (id, updates) => {
    try {
      const updated = await subPocketService.updateSubPocket(id, updates);
      set((state) => ({
        subPockets: state.subPockets.map((sp) => (sp.id === id ? updated : sp)),
      }));
      await get().loadPockets();
      await get().loadAccounts();
    } catch (error) {
      throw error;
    }
  },

  deleteSubPocket: async (id) => {
    try {
      await subPocketService.deleteSubPocket(id);
      set((state) => ({
        subPockets: state.subPockets.filter((sp) => sp.id !== id),
      }));
      await get().loadPockets();
      await get().loadAccounts();
    } catch (error) {
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
    await get().loadPockets();
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
      set((state) => ({ movements: [...state.movements, movement] }));
      // Reload accounts and pockets to update balances (only if not pending)
      if (!isPending) {
        await get().loadAccounts();
        await get().loadPockets();
        await get().loadSubPockets();
      }
    } catch (error) {
      throw error;
    }
  },

  updateMovement: async (id, updates) => {
    try {
      const updated = await movementService.updateMovement(id, updates);
      set((state) => ({
        movements: state.movements.map((m) => (m.id === id ? updated : m)),
      }));
      // Reload accounts and pockets to update balances
      await get().loadAccounts();
      await get().loadPockets();
      await get().loadSubPockets();
    } catch (error) {
      throw error;
    }
  },

  deleteMovement: async (id) => {
    try {
      await movementService.deleteMovement(id);
      set((state) => ({
        movements: state.movements.filter((m) => m.id !== id),
      }));
      // Reload accounts and pockets to update balances
      await get().loadAccounts();
      await get().loadPockets();
      await get().loadSubPockets();
    } catch (error) {
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
      // Reload accounts and pockets to update balances
      await get().loadAccounts();
      await get().loadPockets();
      await get().loadSubPockets();
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

