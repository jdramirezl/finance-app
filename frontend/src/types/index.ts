// Currency types — re-exported from the constants module so that
// `constants/currencies.ts` remains the single source of truth. Existing
// `import type { Currency } from '../types'` consumers continue to work.
export type { Currency } from '../constants/currencies';

import type { Currency } from '../constants/currencies';

// Pocket types
export type PocketType = 'normal' | 'fixed';

// Investment subtypes
export type InvestmentType = 'stock' | 'etf' | 'cd';

// CD compounding frequency
export type CompoundingFrequency = 'daily' | 'monthly' | 'quarterly' | 'annually';

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
  readonly balance: number; // Calculated by backend triggers
  type?: 'normal' | 'investment' | 'cd'; // Default: 'normal'
  investmentType?: InvestmentType; // Subtype for investment accounts
  // Legacy stock/ETF fields (will be deprecated in favor of specific interfaces)
  stockSymbol?: string; // For investment accounts (e.g., 'VOO')
  montoInvertido?: number; // Total money invested (for investment accounts)
  shares?: number; // Total shares owned (for investment accounts)
  // CD-specific fields (only when type === 'cd')
  principal?: number; // Initial investment amount for CDs
  interestRate?: number; // Annual interest rate (as percentage, e.g., 4.5)
  termMonths?: number; // Term duration in months
  maturityDate?: string; // ISO date string when CD matures
  compoundingFrequency?: CompoundingFrequency; // How often interest compounds
  earlyWithdrawalPenalty?: number; // Penalty percentage for early withdrawal
  withholdingTaxRate?: number; // Retención en la fuente (percentage of gains withheld by bank)
  cdCreatedAt?: string; // ISO date string when CD was opened
  displayOrder?: number; // For drag & drop reordering
  // Soft-delete (archive) timestamp. When non-null the account is archived
  // and excluded from default listings; the API still returns it via
  // `?include_archived=true` so the UI can offer restore / permanent delete.
  archivedAt?: string | null; // ISO date string or null
}

// Pocket interface
export interface Pocket {
  id: string;
  accountId: string;
  name: string;
  type: PocketType;
  readonly balance: number; // Calculated by backend triggers
  currency: Currency; // Inherited from account
  displayOrder?: number; // For drag & drop reordering
  // Soft-delete (archive) timestamp. Mirrors `Account.archivedAt`. When the
  // parent account is archived the backend cascades the archive to its
  // pockets; either field being non-null hides the row from default views.
  archivedAt?: string | null; // ISO date string or null
}

// Fixed Expense Group interface
export interface FixedExpenseGroup {
  id: string;
  name: string;
  color: string;
  displayOrder: number;
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
  category?: string;
  tags?: string[];
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

// Stock/ETF Investment Account (specific subtype)
export interface StockInvestmentAccount extends Account {
  type: 'investment';
  investmentType: 'stock' | 'etf';
  stockSymbol: string; // Required for stocks/ETFs
  montoInvertido: number; // Total money invested
  shares: number; // Number of shares owned
  precioActual: number; // Current price per share
  gananciasUSD: number; // Current gains in USD
  gananciasPct: number; // Percentage gain/loss
}

// Certificate of Deposit Account (specific subtype)
export interface CDInvestmentAccount extends Account {
  type: 'cd';
  investmentType: 'cd';
  principal: number; // Initial investment amount
  interestRate: number; // Annual interest rate (as percentage)
  termMonths: number; // Term duration in months
  maturityDate: string; // ISO date string when CD matures
  compoundingFrequency: CompoundingFrequency; // How often interest compounds
  earlyWithdrawalPenalty?: number; // Optional penalty percentage
  withholdingTaxRate?: number; // Retención en la fuente (percentage of gains withheld by bank)
  cdCreatedAt?: string; // ISO date string when CD was opened (separate from account creation)
  // Calculated fields
  currentValue?: number; // Current value including accrued interest
  accruedInterest?: number; // Interest earned so far
  daysToMaturity?: number; // Days remaining until maturity
}

// Movement Template interface
export interface MovementTemplate {
  id: string;
  name: string; // User-defined name (e.g., "Monthly Rent", "Grocery Shopping")
  type: MovementType;
  accountId: string;
  pocketId: string;
  subPocketId?: string | null;
  defaultAmount?: number | null; // Optional default amount (user can override)
  notes?: string | null; // Template notes
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Type guards and utility types for investment accounts
export type AnyInvestmentAccount = StockInvestmentAccount | CDInvestmentAccount;

// Type guard functions
export const isInvestmentAccount = (account: Account): account is Account & { type: 'investment' } => {
  return account.type === 'investment';
};

export const isStockInvestmentAccount = (account: Account): account is StockInvestmentAccount => {
  return account.type === 'investment' && (account.investmentType === 'stock' || account.investmentType === 'etf');
};

export const isCDInvestmentAccount = (account: Account): account is CDInvestmentAccount => {
  return account.type === 'cd' && account.investmentType === 'cd';
};

// CD calculation utilities types
export interface CDCalculationResult {
  currentValue: number;
  accruedInterest: number;
  totalInterest: number;
  daysToMaturity: number;
  isMatured: boolean;
  effectiveYield: number; // Actual yield considering compounding
  withholdingTax: number; // Tax withheld on interest earned
  netInterest: number; // Interest after withholding tax
  netCurrentValue: number; // Current value after withholding tax
}

// Settings
export type SnapshotFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';
export type AccountCardDisplayMode = 'compact' | 'detailed';
export type DateFormatPreference = 'MMM d, yyyy' | 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';

export const DATE_FORMAT_OPTIONS: { value: DateFormatPreference; label: string }[] = [
  { value: 'MMM d, yyyy', label: 'Jan 1, 2025' },
  { value: 'dd/MM/yyyy', label: '01/01/2025' },
  { value: 'MM/dd/yyyy', label: '01/01/2025 (US)' },
  { value: 'yyyy-MM-dd', label: '2025-01-01 (ISO)' },
];

export interface AccountCardDisplaySettings {
  normal: AccountCardDisplayMode;
  investment: AccountCardDisplayMode;
  cd: AccountCardDisplayMode;
}

export interface Settings {
  primaryCurrency: Currency;
  alphaVantageApiKey?: string;
  snapshotFrequency?: SnapshotFrequency;
  accountCardDisplay?: AccountCardDisplaySettings;
  defaultExpenseAccountId?: string;
  defaultExpensePocketId?: string;
  defaultIncomeAccountId?: string;
  defaultIncomePocketId?: string;
  dateFormat: DateFormatPreference;
  movementsPerPage: number;
  reminderAdvanceDays: number;
  defaultCurrencyForNewAccounts: Currency;
  googleSheetId?: string;
}
