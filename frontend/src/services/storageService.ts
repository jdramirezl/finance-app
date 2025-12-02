// Storage service for local persistence
// Designed to be easily replaceable with backend API later

const STORAGE_KEYS = {
  ACCOUNTS: 'finance_app_accounts',
  POCKETS: 'finance_app_pockets',
  SUB_POCKETS: 'finance_app_sub_pockets',
  MOVEMENTS: 'finance_app_movements',
  SETTINGS: 'finance_app_settings',
  BUDGET_PLANNING: 'finance_app_budget_planning',
} as const;

export class StorageService {
  // Generic get/set methods
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }

  // Accounts
  static getAccounts() {
    return this.get<any[]>(STORAGE_KEYS.ACCOUNTS) || [];
  }

  static saveAccounts(accounts: any[]) {
    this.set(STORAGE_KEYS.ACCOUNTS, accounts);
  }

  // Pockets
  static getPockets() {
    return this.get<any[]>(STORAGE_KEYS.POCKETS) || [];
  }

  static savePockets(pockets: any[]) {
    this.set(STORAGE_KEYS.POCKETS, pockets);
  }

  // SubPockets
  static getSubPockets() {
    return this.get<any[]>(STORAGE_KEYS.SUB_POCKETS) || [];
  }

  static saveSubPockets(subPockets: any[]) {
    this.set(STORAGE_KEYS.SUB_POCKETS, subPockets);
  }

  // Movements
  static getMovements() {
    return this.get<any[]>(STORAGE_KEYS.MOVEMENTS) || [];
  }

  static saveMovements(movements: any[]) {
    this.set(STORAGE_KEYS.MOVEMENTS, movements);
  }

  // Settings
  static getSettings() {
    return this.get<any>(STORAGE_KEYS.SETTINGS) || { primaryCurrency: 'USD' };
  }

  static saveSettings(settings: any) {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // Budget Planning
  static getBudgetPlanning() {
    return this.get<any>(STORAGE_KEYS.BUDGET_PLANNING) || { initialAmount: 0, distributionEntries: [] };
  }

  static saveBudgetPlanning(data: any) {
    this.set(STORAGE_KEYS.BUDGET_PLANNING, data);
  }

  // Clear all data (for testing/reset)
  static clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => this.remove(key));
  }
}

