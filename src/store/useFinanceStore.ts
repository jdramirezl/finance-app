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

  // Actions - Pockets
  loadPockets: () => void;
  createPocket: (accountId: string, name: string, type: Pocket['type']) => void;
  updatePocket: (id: string, updates: Partial<Pick<Pocket, 'name'>>) => void;
  deletePocket: (id: string) => void;

  // Actions - SubPockets
  loadSubPockets: () => void;
  createSubPocket: (pocketId: string, name: string, valueTotal: number, periodicityMonths: number) => void;
  updateSubPocket: (id: string, updates: Partial<Pick<SubPocket, 'name' | 'valueTotal' | 'periodicityMonths'>>) => void;
  deleteSubPocket: (id: string) => void;
  toggleSubPocketEnabled: (id: string) => void;

  // Actions - Movements
  loadMovements: () => void;
  createMovement: (type: MovementType, accountId: string, pocketId: string, amount: number, notes?: string, displayedDate?: string, subPocketId?: string) => Promise<void>;
  updateMovement: (id: string, updates: Partial<Pick<Movement, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount' | 'notes' | 'displayedDate'>>) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  getMovementsGroupedByMonth: () => Map<string, Movement[]>;

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

  // Movement actions
  createMovement: async (type, accountId, pocketId, amount, notes, displayedDate, subPocketId) => {
    try {
      const movement = await movementService.createMovement(
        type,
        accountId,
        pocketId,
        amount,
        notes,
        displayedDate,
        subPocketId
      );
      set((state) => ({ movements: [...state.movements, movement] }));
      // Reload accounts and pockets to update balances
      get().loadAccounts();
      get().loadPockets();
      get().loadSubPockets();
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

