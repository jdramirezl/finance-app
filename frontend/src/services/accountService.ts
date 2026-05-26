import type { Account, CDInvestmentAccount, InvestmentType, CompoundingFrequency } from '../types';
import { apiClient } from './apiClient';
import { cdCalculationService } from './cdCalculationService';

class AccountService {
  // Get all accounts.
  // When includeArchived is true, soft-archived accounts (archived_at IS NOT NULL)
  // are included — used by the Accounts page to render the "Archived" section.
  async getAllAccounts(includeArchived: boolean = false): Promise<Account[]> {
    // TEST: Direct Supabase call to bypass backend
    const { supabase } = await import('../lib/supabase');
    let query = supabase.from('accounts').select('*').order('display_order', { ascending: true });
    if (!includeArchived) {
      query = query.is('archived_at', null);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      currency: row.currency,
      type: row.type,
      balance: row.balance,
      displayOrder: row.display_order,
      stockSymbol: row.stock_symbol,
      montoInvertido: row.monto_invertido,
      shares: row.shares,
      investmentType: row.investment_type,
      principal: row.principal,
      interestRate: row.interest_rate,
      termMonths: row.term_months,
      maturityDate: row.maturity_date,
      compoundingFrequency: row.compounding_frequency,
      earlyWithdrawalPenalty: row.early_withdrawal_penalty,
      withholdingTaxRate: row.withholding_tax_rate,
      cdCreatedAt: row.cd_created_at,
      archivedAt: row.archived_at,
    }));
  }

  // Get account by ID
  async getAccount(id: string): Promise<Account | null> {
    return await apiClient.get<Account>(`/api/accounts/${id}`);
  }

  // Validate account uniqueness (name + currency combination).
  // Includes archived accounts so that users can't create a new account with
  // a name+currency colliding with an archived one — the DB UNIQUE constraint
  // (user_id, name, currency) is full-table and would reject the insert anyway.
  async validateAccountUniqueness(name: string, currency: string, excludeId?: string): Promise<boolean> {
    const accounts = await this.getAllAccounts(true);
    const existing = accounts.find(
      acc => acc.name === name && acc.currency === currency && acc.id !== excludeId
    );
    return !existing; // Returns true if unique (no existing account found)
  }

  // Create new account (extended to support investment subtypes)
  async createAccount(
    name: string,
    color: string,
    currency: Account['currency'],
    type: Account['type'] = 'normal',
    stockSymbol?: string,
    investmentType?: InvestmentType
  ): Promise<Account> {
    return await apiClient.post<Account>('/api/accounts', {
      name,
      color,
      currency,
      type,
      stockSymbol,
      investmentType,
    });
  }

  // Create CD investment account with specific parameters
  async createCDAccount(
    name: string,
    color: string,
    currency: Account['currency'],
    principal: number,
    interestRate: number,
    termMonths: number,
    compoundingFrequency: CompoundingFrequency = 'monthly',
    earlyWithdrawalPenalty?: number,
    withholdingTaxRate?: number
  ): Promise<CDInvestmentAccount> {
    // Validate CD-specific parameters
    if (principal <= 0) {
      throw new Error('Principal amount must be greater than 0.');
    }
    if (interestRate <= 0 || interestRate > 100) {
      throw new Error('Interest rate must be between 0 and 100.');
    }
    if (termMonths <= 0 || termMonths > 600) { // Max 50 years
      throw new Error('Term must be between 1 and 600 months.');
    }

    // Calculate maturity date
    const now = new Date();
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + termMonths);

    // Backend creates the CD account with all CD fields in a single request
    const account = await apiClient.post<Account>('/api/accounts', {
      name,
      color,
      currency,
      type: 'cd',
      investmentType: 'cd',
      principal,
      interestRate,
      termMonths,
      maturityDate: maturityDate.toISOString(),
      compoundingFrequency,
      earlyWithdrawalPenalty,
      withholdingTaxRate,
      cdCreatedAt: now.toISOString(),
    });

    return account as CDInvestmentAccount;
  }

  // Update account
  async updateAccount(id: string, updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>>): Promise<Account> {
    // TEST: Direct Supabase call to bypass backend
    const { supabase } = await import('../lib/supabase');
    const { data, error } = await supabase.from('accounts').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as any;
  }

  // Delete account
  async deleteAccount(id: string): Promise<void> {
    await apiClient.delete(`/api/accounts/${id}`);
  }

  // Soft-delete (archive) an account.
  // Cascades on the backend: associated active pockets are also archived.
  async archiveAccount(id: string): Promise<void> {
    await apiClient.patch(`/api/accounts/${id}/archive`);
  }

  // Restore a previously archived account.
  // Cascades on the backend: associated archived pockets are also unarchived.
  async unarchiveAccount(id: string): Promise<void> {
    await apiClient.patch(`/api/accounts/${id}/unarchive`);
  }

  // Cascade delete account with all pockets, sub-pockets, and optionally movements
  async deleteAccountCascade(id: string, deleteMovements: boolean = false): Promise<{
    account: string;
    pockets: number;
    subPockets: number;
    movements: number;
  }> {
    return await apiClient.post<{
      account: string;
      pockets: number;
      subPockets: number;
      movements: number;
    }>(`/api/accounts/${id}/cascade`, { deleteMovements });
  }

  // Reorder accounts
  async reorderAccounts(accountIds: string[]): Promise<void> {
    await apiClient.post('/api/accounts/reorder', { accountIds });
  }

  // ===== CD-SPECIFIC METHODS =====

  // Get all CD accounts
  async getCDAccounts(): Promise<CDInvestmentAccount[]> {
    const accounts = await this.getAllAccounts();
    return accounts.filter((account): account is CDInvestmentAccount =>
      account.type === 'cd' && account.investmentType === 'cd'
    ) as CDInvestmentAccount[];
  }

  // Get CDs that are near maturity
  async getCDsNearMaturity(daysThreshold: number = 30): Promise<CDInvestmentAccount[]> {
    const cdAccounts = await this.getCDAccounts();
    return cdAccounts.filter(cd => cdCalculationService.isNearMaturity(cd, daysThreshold));
  }

  // Get matured CDs
  async getMaturedCDs(): Promise<CDInvestmentAccount[]> {
    const cdAccounts = await this.getCDAccounts();
    return cdAccounts.filter(cd => {
      const calculation = cdCalculationService.calculateCurrentValue(cd);
      return calculation.isMatured;
    });
  }

  // Calculate early withdrawal amount for a CD
  async calculateCDEarlyWithdrawal(cdId: string, withdrawalDate?: Date): Promise<{
    currentValue: number;
    penalty: number;
    withholdingTax: number;
    netAmount: number;
    penaltyPercentage: number;
    withholdingTaxPercentage: number;
  }> {
    const account = await this.getAccount(cdId);
    if (!account || account.type !== 'cd' || account.investmentType !== 'cd') {
      throw new Error('Account is not a CD investment account.');
    }

    const cdAccount = account as CDInvestmentAccount;
    const currentValue = cdCalculationService.calculateCurrentValue(cdAccount, withdrawalDate);
    const penalty = cdCalculationService.calculateEarlyWithdrawalPenalty(cdAccount, withdrawalDate);
    const netAmount = cdCalculationService.calculateEarlyWithdrawalAmount(cdAccount, withdrawalDate);

    // Calculate withholding tax on net interest after penalty
    const netInterestAfterPenalty = Math.max(0, currentValue.accruedInterest - penalty);
    const withholdingTaxRate = (cdAccount.withholdingTaxRate || 0) / 100;
    const withholdingTax = netInterestAfterPenalty * withholdingTaxRate;

    return {
      currentValue: currentValue.currentValue,
      penalty,
      withholdingTax,
      netAmount,
      penaltyPercentage: cdAccount.earlyWithdrawalPenalty || 0,
      withholdingTaxPercentage: cdAccount.withholdingTaxRate || 0,
    };
  }
}

export const accountService = new AccountService();
