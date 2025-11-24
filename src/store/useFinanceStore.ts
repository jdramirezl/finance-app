import { create } from 'zustand';
import type { Account, Pocket, SubPocket, Movement, Settings, MovementType } from '../types';
import { accountService } from '../services/accountService';
import { pocketService } from '../services/pocketService';
import { subPocketService } from '../services/subPocketService';
import { movementService } from '../services/movementService';
import { StorageService } from '../services/storageService';

interface FinanceStore {
  // State
  accounts: Account[];
  pockets: Pocket[];
  subPockets: SubPocket[];
  movements: Movement[];
  settings: Settings;
  selectedAccountId: string | null;

  // Actions - Accounts
  loadAccounts: () => void;
  createAccount: (name: string, color: string, currency: Account['currency'], type?: Account['type'], stockSymbol?: string) => void;
  updateAccount: (id: string, updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>>) => void;
  deleteAccount: (id: string) => void;
  selectAccount: (id: string | null) => void;
  reorderAccounts: (accounts: Account[]) => void;

  // Actions - Pockets
  loadPockets: () => void;
  createPocket: (accountId: string, name: string, type: Pocket['type']) => void;
  updatePocket: (id: string, updates: Partial<Pick<Pocket, 'name'>>) => void;
  deletePocket: (id: string) => void;
  reorderPockets: (pockets: Pocket[]) => void;

  // Actions - SubPockets
  loadSubPockets: () => void;
  createSubPocket: (pocketId: string, name: string, valueTotal: number, periodicityMonths: number) => void;
  updateSubPocket: (id: string, updates: Partial<Pick<SubPocket, 'name' | 'valueTotal' | 'periodicityMonths'>>) => void;
  deleteSubPocket: (id: string) => void;
  toggleSubPocketEnabled: (id: string) => void;
  reorderSubPockets: (subPockets: SubPocket[]) => void;

  // Actions - Movements
  loadMovements: () => void;
  createMovement: (type: MovementType, accountId: string, pocketId: string, amount: number, notes?: string, displayedDate?: string, subPocketId?: string, isPending?: boolean) => Promise<void>;
  updateMovement: (id: string, updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  applyPendingMovement: (id: string) => Promise<void>;
  getMovementsGroupedByMonth: () => Map<string, Movement[]>;
  getPendingMovements: () => Movement[];
  getAppliedMovements: () => Movement[];

  // Actions - Settings
  loadSettings: () => void;
  updateSettings: (updates: Partial<Settings>) => void;

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
  loadAccounts: () => {
    const accounts = accountService.getAllAccounts();
    set({ accounts });
  },

  loadPockets: () => {
    const pockets = pocketService.getAllPockets();
    set({ pockets });
  },

  loadSubPockets: () => {
    const subPockets = StorageService.getSubPockets();
    set({ subPockets });
  },

  loadMovements: () => {
    const movements = StorageService.getMovements();
    set({ movements });
  },

  loadSettings: () => {
    const settings = StorageService.getSettings();
    set({ settings });
  },

  // Account actions
  createAccount: async (name, color, currency, type = 'normal', stockSymbol) => {
    try {
      const account = accountService.createAccount(name, color, currency, type, stockSymbol);
      set((state) => ({ accounts: [...state.accounts, account] }));
      get().loadPockets(); // Reload pockets to ensure sync
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
      get().loadPockets(); // Reload to sync balances
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
      get().loadPockets();
    } catch (error) {
      throw error;
    }
  },

  selectAccount: (id) => {
    set({ selectedAccountId: id });
  },

  reorderAccounts: (accounts) => {
    // Update display order for each account
    const accountsWithOrder = accounts.map((account, index) => ({
      ...account,
      displayOrder: index,
    }));
    
    // Save to storage
    StorageService.saveAccounts(accountsWithOrder);
    
    // Update state
    set({ accounts: accountsWithOrder });
  },

  // Pocket actions
  createPocket: async (accountId, name, type) => {
    try {
      const pocket = await pocketService.createPocket(accountId, name, type);
      set((state) => ({ pockets: [...state.pockets, pocket] }));
      get().loadAccounts(); // Reload accounts to update balances
    } catch (error) {
      throw error;
    }
  },

  updatePocket: async (id, updates) => {
    try {
      const updated = await pocketService.updatePocket(id, updates);
      set((state) => ({
        pockets: state.pockets.map((p) => (p.id === id ? updated : p)),
      }));
      get().loadAccounts(); // Reload accounts to update balances
    } catch (error) {
      throw error;
    }
  },

  deletePocket: async (id) => {
    try {
      await pocketService.deletePocket(id);
      set((state) => ({
        pockets: state.pockets.filter((p) => p.id !== id),
      }));
      get().loadAccounts(); // Reload accounts to update balances
    } catch (error) {
      throw error;
    }
  },

  reorderPockets: (pockets) => {
    // Update display order for each pocket
    const pocketsWithOrder = pockets.map((pocket, index) => ({
      ...pocket,
      displayOrder: index,
    }));
    
    // Save to storage
    StorageService.savePockets(pocketsWithOrder);
    
    // Update state
    set({ pockets: pocketsWithOrder });
    
    // Reload accounts to ensure consistency
    get().loadAccounts();
  },

  // SubPocket actions
  createSubPocket: async (pocketId, name, valueTotal, periodicityMonths) => {
    try {
      const subPocket = await subPocketService.createSubPocket(pocketId, name, valueTotal, periodicityMonths);
      set((state) => ({ subPockets: [...state.subPockets, subPocket] }));
      get().loadPockets(); // Reload pockets to update balances
      get().loadAccounts(); // Reload accounts to update balances
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
      get().loadPockets();
      get().loadAccounts();
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
      get().loadPockets();
      get().loadAccounts();
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

  reorderSubPockets: (subPockets) => {
    const subPocketsWithOrder = subPockets.map((subPocket, index) => ({
      ...subPocket,
      displayOrder: index,
    }));
    
    StorageService.saveSubPockets(subPocketsWithOrder);
    set({ subPockets: subPocketsWithOrder });
    get().loadPockets();
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
        get().loadAccounts();
        get().loadPockets();
        get().loadSubPockets();
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
      get().loadAccounts();
      get().loadPockets();
      get().loadSubPockets();
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
      get().loadAccounts();
      get().loadPockets();
      get().loadSubPockets();
    } catch (error) {
      throw error;
    }
  },

  getMovementsGroupedByMonth: () => {
    return movementService.getMovementsGroupedByMonth();
  },

  getPendingMovements: () => {
    return movementService.getPendingMovements();
  },

  getAppliedMovements: () => {
    return movementService.getAppliedMovements();
  },

  applyPendingMovement: async (id) => {
    try {
      const applied = await movementService.applyPendingMovement(id);
      set((state) => ({
        movements: state.movements.map((m) => (m.id === id ? applied : m)),
      }));
      // Reload accounts and pockets to update balances
      get().loadAccounts();
      get().loadPockets();
      get().loadSubPockets();
    } catch (error) {
      throw error;
    }
  },

  // Settings actions
  updateSettings: (updates) => {
    const newSettings = { ...get().settings, ...updates };
    StorageService.saveSettings(newSettings);
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

