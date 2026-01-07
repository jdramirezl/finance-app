import type { Account, Pocket, CDInvestmentAccount, InvestmentType, CompoundingFrequency } from '../types';
import { SupabaseStorageService } from './supabaseStorageService';
import { generateId } from '../utils/idGenerator';
import { apiClient } from './apiClient';
import { cdCalculationService } from './cdCalculationService';

// Lazy getters to avoid circular dependencies - using dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pocketServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let subPocketServiceCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let movementServiceCache: any = null;

const getPocketService = async () => {
  if (!pocketServiceCache) {
    const module = await import('./pocketService');
    pocketServiceCache = module.pocketService;
  }
  return pocketServiceCache;
};

const getSubPocketService = async () => {
  if (!subPocketServiceCache) {
    const module = await import('./subPocketService');
    subPocketServiceCache = module.subPocketService;
  }
  return subPocketServiceCache;
};

const getMovementService = async () => {
  if (!movementServiceCache) {
    const module = await import('./movementService');
    movementServiceCache = module.movementService;
  }
  return movementServiceCache;
};

class AccountService {
  // Feature flag to control backend usage
  private useBackend = import.meta.env.VITE_USE_BACKEND_ACCOUNTS === 'true';
  
  // Flag to temporarily disable migration during CD creation
  private skipMigration = false;

  constructor() {
    // Log which mode we're in
    console.log('🏗️ AccountService constructor called');
    console.log('🔧 Environment variables:', {
      VITE_USE_BACKEND_ACCOUNTS: import.meta.env.VITE_USE_BACKEND_ACCOUNTS,
      VITE_API_URL: import.meta.env.VITE_API_URL
    });
    
    if (this.useBackend) {
      console.log('🚀 AccountService: Using BACKEND API at', import.meta.env.VITE_API_URL);
    } else {
      console.log('📦 AccountService: Using DIRECT Supabase calls');
    }
  }

  // Get all accounts
  async getAllAccounts(): Promise<Account[]> {
    console.log('🔄 AccountService.getAllAccounts called');
    
    if (this.useBackend) {
      try {
        console.log('🌐 Attempting to use backend API at', import.meta.env.VITE_API_URL);
        const accounts = await apiClient.get<Account[]>('/api/accounts');
        console.log('✅ Backend API success! Received accounts:', accounts.length);
        console.log('📦 Raw accounts from backend API:', accounts);
        
        // Log each account's details
        accounts.forEach(account => {
          console.log('🏦 Backend account details:', {
            id: account.id,
            name: account.name,
            type: account.type,
            investmentType: account.investmentType,
            balance: account.balance,
            principal: account.principal,
            interestRate: account.interestRate,
            cdCreatedAt: account.cdCreatedAt,
            maturityDate: account.maturityDate,
            withholdingTaxRate: account.withholdingTaxRate,
            compoundingFrequency: account.compoundingFrequency,
            termMonths: account.termMonths,
            earlyWithdrawalPenalty: account.earlyWithdrawalPenalty
          });
        });
        
        return accounts;
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        console.log('🔄 Switching to Supabase direct mode...');
        return await this.getAllAccountsDirect();
      }
    }
    console.log('📦 Using Supabase direct mode (backend disabled)');
    return await this.getAllAccountsDirect();
  }

  // Direct Supabase implementation (fallback)
  private async getAllAccountsDirect(): Promise<Account[]> {
    const accounts = await SupabaseStorageService.getAccounts();
    
    // Fix CD accounts that are missing required fields (migration) - but skip during CD creation
    if (!this.skipMigration) {
      const fixedAccounts = await this.fixIncompleteCDAccounts(accounts);
      return fixedAccounts;
    }
    
    return accounts;
  }

  // Migration helper: Fix CD accounts that are missing required fields
  private async fixIncompleteCDAccounts(accounts: Account[]): Promise<Account[]> {
    const cdAccounts = accounts.filter(acc => acc.type === 'cd');
    let hasUpdates = false;
    
    for (const account of cdAccounts) {
      // Check if CD account is missing ALL required fields (indicates it's truly incomplete)
      // Don't fix accounts that are just being created (they might have some fields but not all yet)
      const isMissingAllCDFields = !account.principal && !account.interestRate && !account.maturityDate && !account.cdCreatedAt;
      
      if (isMissingAllCDFields) {
        console.log('🔧 Fixing incomplete CD account (missing all CD fields):', account.name);
        
        // Set default values for missing CD fields
        const now = new Date();
        const maturityDate = new Date();
        maturityDate.setFullYear(maturityDate.getFullYear() + 1); // Default 1 year term
        
        const updates: Partial<Account> = {
          investmentType: 'cd',
          principal: 1000, // Default principal
          interestRate: 5.0, // Default 5% APY
          termMonths: 12, // Default 1 year
          maturityDate: maturityDate.toISOString(),
          compoundingFrequency: 'monthly' as const,
          cdCreatedAt: now.toISOString(),
          withholdingTaxRate: 0,
          earlyWithdrawalPenalty: 3, // Default 3% penalty
        };
        
        // Update the account object
        Object.assign(account, updates);
        
        // Update in database
        try {
          await this.updateAccountDirect(account.id, updates);
          hasUpdates = true;
          console.log('✅ Fixed CD account:', account.name);
        } catch (error) {
          console.error('❌ Failed to fix CD account:', account.name, error);
        }
      } else if (account.principal || account.interestRate || account.maturityDate) {
        // Account has some CD fields, so it's probably being created or partially configured
        console.log('🔍 CD account has some fields, skipping migration:', account.name, {
          hasPrincipal: !!account.principal,
          hasInterestRate: !!account.interestRate,
          hasMaturityDate: !!account.maturityDate,
          hasCdCreatedAt: !!account.cdCreatedAt
        });
      }
    }
    
    if (hasUpdates) {
      console.log('🔄 CD accounts fixed, reloading...');
      // Return fresh data after updates
      return await SupabaseStorageService.getAccounts();
    }
    
    return accounts;
  }

  // Get account by ID
  async getAccount(id: string): Promise<Account | null> {
    if (this.useBackend) {
      try {
        return await apiClient.get<Account>(`/api/accounts/${id}`);
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.getAccountDirect(id);
      }
    }
    return await this.getAccountDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async getAccountDirect(id: string): Promise<Account | null> {
    const accounts = await this.getAllAccountsDirect();
    return accounts.find(acc => acc.id === id) || null;
  }

  // Validate account uniqueness (name + currency combination)
  async validateAccountUniqueness(name: string, currency: string, excludeId?: string): Promise<boolean> {
    const accounts = await this.getAllAccounts();
    const existing = accounts.find(
      acc => acc.name === name && acc.currency === currency && acc.id !== excludeId
    );
    return !existing; // Returns true if unique (no existing account found)
  }

  // Calculate account balance (sum of all pocket balances)
  // Note: This method should be called after pockets are loaded
  // IMPORTANT: This is the ONLY source of truth for account balances
  // Account.balance in storage may be stale - always recalculate from pockets
  async calculateAccountBalance(accountId: string): Promise<number> {
    // Import dynamically to avoid circular dependency
    const pocketService = await getPocketService();
    const pockets = await pocketService.getPocketsByAccount(accountId);
    
    // Check if this is an investment account
    const account = await this.getAccount(accountId);
    if (account?.type === 'investment') {
      // For investment accounts, balance = shares × current price (market value)
      // Find the shares pocket
      const sharesPocket = pockets.find((p: Pocket) => p.name === 'Shares');
      const shares = sharesPocket?.balance || 0;
      
      // Get current price from investment service
      if (account.stockSymbol && shares > 0) {
        try {
          const { investmentService } = await import('./investmentService');
          const currentPrice = await investmentService.getCurrentPrice(account.stockSymbol);
          return shares * currentPrice;
        } catch (error) {
          console.warn(`⚠️ Failed to get price for ${account.stockSymbol}, using 0 balance`, error);
          return 0;
        }
      }
      return 0;
    }
    
    // For normal accounts, sum all pocket balances
    return pockets.reduce((sum: number, pocket: { balance: number }) => sum + pocket.balance, 0);
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
    if (this.useBackend) {
      try {
        return await apiClient.post<Account>('/api/accounts', {
          name,
          color,
          currency,
          type,
          stockSymbol,
          investmentType,
        });
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.createAccountDirect(name, color, currency, type, stockSymbol, investmentType);
      }
    }
    return await this.createAccountDirect(name, color, currency, type, stockSymbol, investmentType);
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
    console.log('🏗️ Creating CD account with parameters:', {
      name, color, currency, principal, interestRate, termMonths, 
      compoundingFrequency, earlyWithdrawalPenalty, withholdingTaxRate
    });
    
    // Temporarily disable migration during CD creation to avoid interference
    this.skipMigration = true;
    
    try {
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

      console.log('📅 CD dates calculated:', {
        createdAt: now.toISOString(),
        maturityDate: maturityDate.toISOString()
      });

      const account = await this.createAccountDirect(
        name,
        color,
        currency,
        'cd', // Use 'cd' type instead of 'investment'
        undefined, // No stock symbol for CDs
        'cd'
      );

      console.log('✅ Basic CD account created:', account.id);

      // Update with CD-specific fields
      const cdAccount: CDInvestmentAccount = {
        ...account,
        type: 'cd', // Use 'cd' type
        investmentType: 'cd',
        principal,
        interestRate,
        termMonths,
        maturityDate: maturityDate.toISOString(),
        compoundingFrequency,
        earlyWithdrawalPenalty,
        withholdingTaxRate,
        cdCreatedAt: now.toISOString(), // Set CD creation date
      };

      console.log('💾 Updating CD account with fields:', {
        id: cdAccount.id,
        investmentType: 'cd',
        principal,
        interestRate,
        termMonths,
        maturityDate: cdAccount.maturityDate,
        compoundingFrequency,
        earlyWithdrawalPenalty,
        withholdingTaxRate,
        cdCreatedAt: cdAccount.cdCreatedAt,
      });

      // Update the account with CD fields
      await this.updateAccountDirect(cdAccount.id, {
        investmentType: 'cd',
        principal,
        interestRate,
        termMonths,
        maturityDate: cdAccount.maturityDate,
        compoundingFrequency,
        earlyWithdrawalPenalty,
        withholdingTaxRate,
        cdCreatedAt: cdAccount.cdCreatedAt,
      });

      console.log('✅ CD account created and updated successfully');
      return cdAccount;
    } finally {
      // Re-enable migration after CD creation is complete
      this.skipMigration = false;
      console.log('🔄 Re-enabled migration after CD creation');
    }
  }

  // Direct Supabase implementation (fallback)
  private async createAccountDirect(
    name: string,
    color: string,
    currency: Account['currency'],
    type: Account['type'] = 'normal',
    stockSymbol?: string,
    investmentType?: InvestmentType
  ): Promise<Account> {
    // Validate and sanitize input
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Account name cannot be empty.');
    }
    if (!color || !color.trim()) {
      throw new Error('Account color cannot be empty.');
    }

    // Validate uniqueness
    if (!(await this.validateAccountUniqueness(trimmedName, currency))) {
      throw new Error(`An account with name "${trimmedName}" and currency "${currency}" already exists.`);
    }

    const account: Account = {
      id: generateId(),
      name: trimmedName,
      color: color.trim(),
      currency,
      balance: 0,
      type,
      ...(type === 'investment' && {
        investmentType: investmentType || 'stock', // Default to stock for backward compatibility
        ...(investmentType !== 'cd' && {
          stockSymbol: stockSymbol?.trim() || 'VOO',
          montoInvertido: 0,
          shares: 0,
        }),
      }),
      ...(type === 'cd' && {
        investmentType: 'cd',
        // CD-specific fields will be set later via updateAccountDirect
      }),
    };

    // Insert directly - much faster
    await SupabaseStorageService.insertAccount(account);

    return account;
  }

  // Update account
  async updateAccount(id: string, updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>>): Promise<Account> {
    if (this.useBackend) {
      try {
        return await apiClient.put<Account>(`/api/accounts/${id}`, updates);
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.updateAccountDirect(id, updates);
      }
    }
    return await this.updateAccountDirect(id, updates);
  }

  // Direct Supabase implementation (fallback)
  private async updateAccountDirect(id: string, updates: Partial<Account>): Promise<Account> {
    const accounts = await this.getAllAccountsDirect();
    const index = accounts.findIndex(acc => acc.id === id);

    if (index === -1) {
      throw new Error(`Account with id "${id}" not found.`);
    }

    const account = accounts[index];

    // Validate and sanitize updates
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Account name cannot be empty.');
      }
      updates.name = trimmedName;
    }
    if (updates.color !== undefined) {
      const trimmedColor = updates.color.trim();
      if (!trimmedColor) {
        throw new Error('Account color cannot be empty.');
      }
      updates.color = trimmedColor;
    }

    const updatedAccount = { ...account, ...updates };

    // Validate uniqueness if name or currency changed
    if (updates.name || updates.currency) {
      const newName = updates.name || account.name;
      const newCurrency = updates.currency || account.currency;
      if (!(await this.validateAccountUniqueness(newName, newCurrency, id))) {
        throw new Error(`An account with name "${newName}" and currency "${newCurrency}" already exists.`);
      }
    }

    // If currency changed, update all pockets' currency
    if (updates.currency) {
      const pocketService = await getPocketService();
      const pockets = await pocketService.getPocketsByAccount(id);
      const allPockets = await pocketService.getAllPockets();
      pockets.forEach((pocket: { id: string }) => {
        const pocketIndex = allPockets.findIndex((p: { id: string }) => p.id === pocket.id);
        if (pocketIndex !== -1) {
          allPockets[pocketIndex].currency = updates.currency!;
        }
      });
      await SupabaseStorageService.savePockets(allPockets);
    }

    // Recalculate balance
    const newBalance = await this.calculateAccountBalance(id);
    updatedAccount.balance = newBalance;

    // Update directly - include balance in updates
    const finalUpdates = { ...updates, balance: newBalance };
    await SupabaseStorageService.updateAccount(id, finalUpdates);

    return updatedAccount;
  }

  // Delete account
  async deleteAccount(id: string): Promise<void> {
    if (this.useBackend) {
      try {
        await apiClient.delete(`/api/accounts/${id}`);
        return;
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.deleteAccountDirect(id);
      }
    }
    return await this.deleteAccountDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async deleteAccountDirect(id: string): Promise<void> {
    const account = await this.getAccountDirect(id);
    if (!account) {
      throw new Error(`Account with id "${id}" not found.`);
    }

    // Check if account has pockets
    const pocketService = await getPocketService();
    const pockets = await pocketService.getPocketsByAccount(id);
    if (pockets.length > 0) {
      throw new Error(`Cannot delete account "${account.name}" because it has ${pockets.length} pocket(s). Delete pockets first.`);
    }

    // Delete directly - much faster
    await SupabaseStorageService.deleteAccount(id);
  }

  // Cascade delete account with all pockets, sub-pockets, and optionally movements
  async deleteAccountCascade(id: string, deleteMovements: boolean = false): Promise<{
    account: string;
    pockets: number;
    subPockets: number;
    movements: number;
  }> {
    if (this.useBackend) {
      try {
        return await apiClient.post<{
          account: string;
          pockets: number;
          subPockets: number;
          movements: number;
        }>(`/api/accounts/${id}/cascade`, { deleteMovements });
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.deleteAccountCascadeDirect(id, deleteMovements);
      }
    }
    return await this.deleteAccountCascadeDirect(id, deleteMovements);
  }

  // Direct Supabase implementation (fallback)
  private async deleteAccountCascadeDirect(id: string, deleteMovements: boolean = false): Promise<{
    account: string;
    pockets: number;
    subPockets: number;
    movements: number;
  }> {

    const account = await this.getAccountDirect(id);
    if (!account) {
      throw new Error(`Account with id "${id}" not found.`);
    }


    const pocketService = await getPocketService();
    const subPocketService = await getSubPocketService();
    const movementService = await getMovementService();

    const pockets = await pocketService.getPocketsByAccount(id);

    let totalSubPockets = 0;
    let totalMovements = 0;

    // CRITICAL: Mark movements as orphaned FIRST (before deleting anything)
    // Otherwise CASCADE DELETE will remove movements before we can mark them
    if (!deleteMovements) {
      const markedCount = await movementService.markMovementsAsOrphaned(id, 'account');
      totalMovements += markedCount;
    }

    // Delete in order: movements (if hard delete) -> sub-pockets -> pockets -> account
    for (const pocket of pockets) {
      // Get sub-pockets for this pocket
      const subPockets = await subPocketService.getSubPocketsByPocket(pocket.id);
      totalSubPockets += subPockets.length;

      // Delete sub-pockets
      for (const subPocket of subPockets) {
        await subPocketService.deleteSubPocket(subPocket.id);
      }

      // Handle movements (only if hard delete)
      if (deleteMovements) {
        // Hard delete movements
        const deletedCount = await movementService.deleteMovementsByPocket(pocket.id);
        totalMovements += deletedCount;
      }

      // Delete pocket
      try {
        await SupabaseStorageService.deletePocket(pocket.id);
      } catch (error) {
        console.error(`❌ [deleteAccountCascade] Failed to delete pocket:`, error);
        throw error;
      }
    }

    // Handle any remaining movements by account (only if hard delete)
    if (deleteMovements) {
      // Hard delete remaining movements
      const remainingCount = await movementService.deleteMovementsByAccount(id);
      totalMovements += remainingCount;
    }

    // Delete account
    try {
      await SupabaseStorageService.deleteAccount(id);
    } catch (error) {
      console.error(`❌ [deleteAccountCascade] Failed to delete account:`, error);
      throw error;
    }

    const result = {
      account: account.name,
      pockets: pockets.length,
      subPockets: totalSubPockets,
      movements: totalMovements,
    };

    console.log(`🗑️ Deleted account "${result.account}": ${result.pockets} pockets, ${result.subPockets} sub-pockets, ${result.movements} movements ${deleteMovements ? 'deleted' : 'orphaned'}`);

    return result;
  }

  // Reorder accounts
  async reorderAccounts(accountIds: string[]): Promise<void> {
    if (this.useBackend) {
      try {
        await apiClient.post('/api/accounts/reorder', { accountIds });
        return;
      } catch (error) {
        console.error('Backend API failed, falling back to Supabase:', error);
        return await this.reorderAccountsDirect(accountIds);
      }
    }
    return await this.reorderAccountsDirect(accountIds);
  }

  // Direct Supabase implementation (fallback)
  private async reorderAccountsDirect(accountIds: string[]): Promise<void> {
    const accounts = await this.getAllAccountsDirect();

    // Update display order for each account based on position in array
    const updatedAccounts = accounts.map(account => {
      const newIndex = accountIds.indexOf(account.id);
      if (newIndex !== -1) {
        return { ...account, displayOrder: newIndex };
      }
      return account;
    });

    await SupabaseStorageService.saveAccounts(updatedAccounts);
  }

  // Recalculate single account balance
  async recalculateAccountBalance(accountId: string): Promise<void> {
    const account = await this.getAccount(accountId);
    if (account) {
      const newBalance = await this.calculateAccountBalance(accountId);
      await SupabaseStorageService.updateAccount(accountId, { balance: newBalance });
    }
  }

  // Recalculate all account balances (useful after movements)
  async recalculateAllBalances(): Promise<void> {
    const accounts = await this.getAllAccounts();
    const updatedAccounts = [];
    for (const account of accounts) {
      const newBalance = await this.calculateAccountBalance(account.id);
      updatedAccounts.push({ ...account, balance: newBalance });
    }
    await SupabaseStorageService.saveAccounts(updatedAccounts);
  }

  // ===== CD-SPECIFIC METHODS =====

  // Get all CD accounts
  async getCDAccounts(): Promise<CDInvestmentAccount[]> {
    const accounts = await this.getAllAccounts();
    return accounts.filter((account): account is CDInvestmentAccount => 
      account.type === 'cd' && account.investmentType === 'cd'
    ) as CDInvestmentAccount[];
  }

  // Update CD account with current value calculation
  async updateCDCurrentValue(cdId: string): Promise<CDInvestmentAccount> {
    const account = await this.getAccount(cdId);
    if (!account || account.type !== 'cd' || account.investmentType !== 'cd') {
      throw new Error('Account is not a CD investment account.');
    }

    const cdAccount = account as CDInvestmentAccount;
    const calculation = cdCalculationService.calculateCurrentValue(cdAccount);

    // Update the account with calculated values
    const updatedAccount: CDInvestmentAccount = {
      ...cdAccount,
      currentValue: calculation.currentValue,
      accruedInterest: calculation.accruedInterest,
      daysToMaturity: calculation.daysToMaturity,
    };

    // Update balance to reflect current value
    await this.updateAccountDirect(cdId, { 
      balance: calculation.currentValue,
      currentValue: calculation.currentValue,
      accruedInterest: calculation.accruedInterest,
      daysToMaturity: calculation.daysToMaturity,
    } as any); // Type assertion needed due to Partial<Account> limitations

    return updatedAccount;
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

  // Update all CD current values (should be called periodically)
  async updateAllCDCurrentValues(): Promise<void> {
    const cdAccounts = await this.getCDAccounts();
    
    for (const cd of cdAccounts) {
      try {
        await this.updateCDCurrentValue(cd.id);
      } catch (error) {
        console.error(`Failed to update CD ${cd.name}:`, error);
      }
    }
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

