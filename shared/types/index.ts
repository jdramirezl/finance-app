// Currency types
export type Currency = 'USD' | 'MXN' | 'COP' | 'EUR' | 'GBP';

// Pocket types
export type PocketType = 'normal' | 'fixed';

// Movement types
export type MovementType = 
  | 'IngresoNormal' 
  | 'EgresoNormal' 
  | 'IngresoFijo' 
  | 'EgresoFijo';

// Account interface
export interface Account {
  id: string;
  name: string;
  color: string;
  currency: Currency;
  balance: number; // Calculated: sum of pocket balances
  type?: 'normal' | 'investment'; // Default: 'normal'
  stockSymbol?: string; // For investment accounts (e.g., 'VOO')
  montoInvertido?: number; // Total money invested (for investment accounts)
  shares?: number; // Total shares owned (for investment accounts)
  displayOrder?: number; // For drag & drop reordering
}

// Pocket interface
export interface Pocket {
  id: string;
  accountId: string;
  name: string;
  type: PocketType;
  balance: number;
  currency: Currency; // Inherited from account
  displayOrder?: number; // For drag & drop reordering
}

// Fixed Expense Group interface
export interface FixedExpenseGroup {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt?: string;
}

// SubPocket interface (only for fixed expenses)
export interface SubPocket {
  id: string;
  pocketId: string; // References the fixed expenses pocket
  name: string;
  valueTotal: number; // Total amount to save
  periodicityMonths: number; // How many months to divide
  balance: number; // Current balance
  enabled: boolean; // For toggling in budget planning
  groupId?: string; // References fixed_expense_groups, NULL = Default group
  displayOrder?: number; // For drag & drop reordering
}

// Movement interface
export interface Movement {
  id: string;
  type: MovementType;
  accountId: string;
  pocketId: string;
  subPocketId?: string; // Optional, only for fixed expenses
  amount: number;
  notes?: string;
  displayedDate: string; // User-assigned date (ISO string)
  createdAt: string; // Registration date (ISO string)
  isPending?: boolean; // If true, movement is registered but not applied to balances
  isOrphaned?: boolean; // If true, account or pocket was deleted (soft delete)
  // Orphan restoration fields - store original info for matching (NOT by ID!)
  orphanedAccountName?: string; // Original account name (for matching + display)
  orphanedAccountCurrency?: string; // Original account currency (for matching)
  orphanedPocketName?: string; // Original pocket name (for matching + display)
}

// Investment-specific properties (extends Account)
export interface InvestmentAccount extends Account {
  type: 'investment';
  montoInvertido: number; // Total money invested
  shares: number; // Number of shares owned
  precioActual: number; // Current price per share
  gananciasUSD: number; // Current gains in USD
  gananciasPct: number; // Percentage gain/loss
}

// Movement Template interface
export interface MovementTemplate {
  id: string;
  name: string; // User-defined name (e.g., "Monthly Rent", "Grocery Shopping")
  type: MovementType;
  accountId: string;
  pocketId: string;
  subPocketId?: string;
  defaultAmount?: number; // Optional default amount (user can override)
  notes?: string; // Template notes
  createdAt: string;
  updatedAt?: string;
}

// Settings
export interface Settings {
  primaryCurrency: Currency;
  alphaVantageApiKey?: string; // API key for stock prices
}

