/**
 * Account Domain Entity
 * 
 * Represents a financial account with business rules and invariants.
 * This is the core domain model - no dependencies on infrastructure.
 */

import type { Currency } from '@shared-backend/types';

export type AccountType = 'normal' | 'investment' | 'cd';
export type InvestmentType = 'stock' | 'etf' | 'cd';
export type CompoundingFrequency = 'daily' | 'monthly' | 'quarterly' | 'annually';

export class Account {
  constructor(
    public readonly id: string,
    public name: string,
    public color: string,
    public currency: Currency,
    private _balance: number,
    public type: AccountType = 'normal',
    public stockSymbol?: string,
    public montoInvertido?: number,
    public shares?: number,
    public displayOrder?: number,
    // CD-specific fields
    public investmentType?: InvestmentType,
    public principal?: number,
    public interestRate?: number,
    public termMonths?: number,
    public maturityDate?: Date,
    public compoundingFrequency?: CompoundingFrequency,
    public earlyWithdrawalPenalty?: number,
    public withholdingTaxRate?: number,
    public cdCreatedAt?: Date
  ) {
    this.validate();
  }

  /**
   * Domain invariants - business rules that must always be true
   */
  private validate(): void {
    // Validate name
    if (!this.name?.trim()) {
      throw new Error('Account name cannot be empty');
    }

    // Validate color format (hex color)
    if (!this.color?.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('Invalid color format - must be hex format like #3b82f6');
    }

    // Validate currency
    const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
    if (!validCurrencies.includes(this.currency)) {
      throw new Error(`Invalid currency - must be one of: ${validCurrencies.join(', ')}`);
    }

    // Validate account type
    const validTypes: AccountType[] = ['normal', 'investment', 'cd'];
    if (!validTypes.includes(this.type)) {
      throw new Error(`Account type must be one of: ${validTypes.join(', ')}`);
    }

    // Validate investment account requirements (stock/ETF)
    if (this.type === 'investment') {
      if (!this.stockSymbol?.trim()) {
        throw new Error('Investment accounts must have a stock symbol');
      }
      
      // Validate shares if provided
      if (this.shares !== undefined && this.shares < 0) {
        throw new Error('Shares cannot be negative');
      }
      
      // Validate montoInvertido if provided
      if (this.montoInvertido !== undefined && this.montoInvertido < 0) {
        throw new Error('Investment amount cannot be negative');
      }
    }

    // Validate CD account requirements
    if (this.type === 'cd') {
      this.validateCDFields();
    }

    // Validate display order if provided
    if (this.displayOrder !== undefined && this.displayOrder < 0) {
      throw new Error('Display order cannot be negative');
    }
  }

  /**
   * Validate CD-specific fields
   */
  private validateCDFields(): void {
    if (this.principal !== undefined && this.principal <= 0) {
      throw new Error('CD principal must be positive');
    }

    if (this.interestRate !== undefined && (this.interestRate < 0 || this.interestRate > 100)) {
      throw new Error('CD interest rate must be between 0 and 100');
    }

    if (this.termMonths !== undefined && (this.termMonths < 1 || this.termMonths > 600)) {
      throw new Error('CD term must be between 1 and 600 months');
    }

    if (this.earlyWithdrawalPenalty !== undefined && (this.earlyWithdrawalPenalty < 0 || this.earlyWithdrawalPenalty > 100)) {
      throw new Error('CD early withdrawal penalty must be between 0 and 100');
    }

    if (this.withholdingTaxRate !== undefined && (this.withholdingTaxRate < 0 || this.withholdingTaxRate > 100)) {
      throw new Error('CD withholding tax rate must be between 0 and 100');
    }

    if (this.compoundingFrequency !== undefined) {
      const validFrequencies: CompoundingFrequency[] = ['daily', 'monthly', 'quarterly', 'annually'];
      if (!validFrequencies.includes(this.compoundingFrequency)) {
        throw new Error(`CD compounding frequency must be one of: ${validFrequencies.join(', ')}`);
      }
    }

    if (this.investmentType !== undefined) {
      const validInvestmentTypes: InvestmentType[] = ['stock', 'etf', 'cd'];
      if (!validInvestmentTypes.includes(this.investmentType)) {
        throw new Error(`Investment type must be one of: ${validInvestmentTypes.join(', ')}`);
      }
    }
  }

  /**
   * Balance is read-only - calculated from pockets or investment value
   */
  get balance(): number {
    return this._balance;
  }

  /**
   * Update balance (called by domain service after pocket calculation)
   * For normal accounts: sum of pocket balances
   * For investment accounts: shares * current price
   */
  updateBalance(newBalance: number): void {
    this._balance = newBalance;
  }

  /**
   * Update account details
   */
  update(name?: string, color?: string, currency?: Currency): void {
    if (name !== undefined) this.name = name;
    if (color !== undefined) this.color = color;
    if (currency !== undefined) this.currency = currency;
    this.validate();
  }

  /**
   * Update investment-specific fields
   */
  updateInvestmentDetails(shares?: number, montoInvertido?: number): void {
    if (!this.isInvestment()) {
      throw new Error('Cannot update investment details on non-investment account');
    }
    
    if (shares !== undefined) {
      if (shares < 0) {
        throw new Error('Shares cannot be negative');
      }
      this.shares = shares;
    }
    
    if (montoInvertido !== undefined) {
      if (montoInvertido < 0) {
        throw new Error('Investment amount cannot be negative');
      }
      this.montoInvertido = montoInvertido;
    }
  }

  /**
   * Update CD-specific details
   */
  updateCDDetails(
    principal?: number,
    interestRate?: number,
    termMonths?: number,
    maturityDate?: Date,
    compoundingFrequency?: CompoundingFrequency,
    earlyWithdrawalPenalty?: number,
    withholdingTaxRate?: number,
    cdCreatedAt?: Date
  ): void {
    if (!this.isCD()) {
      throw new Error('Cannot update CD details on non-CD account');
    }
    
    if (principal !== undefined) this.principal = principal;
    if (interestRate !== undefined) this.interestRate = interestRate;
    if (termMonths !== undefined) this.termMonths = termMonths;
    if (maturityDate !== undefined) this.maturityDate = maturityDate;
    if (compoundingFrequency !== undefined) this.compoundingFrequency = compoundingFrequency;
    if (earlyWithdrawalPenalty !== undefined) this.earlyWithdrawalPenalty = earlyWithdrawalPenalty;
    if (withholdingTaxRate !== undefined) this.withholdingTaxRate = withholdingTaxRate;
    if (cdCreatedAt !== undefined) this.cdCreatedAt = cdCreatedAt;
    
    this.validateCDFields();
  }

  /**
   * Calculate CD balance with compound interest
   * Formula: A = P(1 + r/n)^(nt)
   * Where: A = final amount, P = principal, r = annual rate, n = compounding frequency, t = time in years
   */
  calculateCDBalance(): number {
    if (!this.isCD()) {
      throw new Error('Cannot calculate CD balance for non-CD account');
    }

    if (!this.principal || !this.interestRate || !this.termMonths || !this.cdCreatedAt) {
      return this.principal || 0;
    }

    const principal = this.principal;
    const annualRate = this.interestRate / 100;
    
    // Calculate time elapsed since CD creation
    const now = new Date();
    const createdAt = this.cdCreatedAt;
    const maturityDate = this.maturityDate;
    
    // Use the earlier of current date or maturity date (don't compound beyond maturity)
    const effectiveDate = maturityDate && now > maturityDate ? maturityDate : now;
    
    // Calculate time elapsed in years
    const timeElapsedMs = effectiveDate.getTime() - createdAt.getTime();
    const timeElapsedYears = timeElapsedMs / (1000 * 60 * 60 * 24 * 365.25);
    
    // Don't allow negative time (shouldn't happen, but safety check)
    if (timeElapsedYears <= 0) {
      return principal;
    }
    
    // Determine compounding frequency (n)
    let n = 12; // Default to monthly
    switch (this.compoundingFrequency) {
      case 'daily': n = 365; break;
      case 'monthly': n = 12; break;
      case 'quarterly': n = 4; break;
      case 'annually': n = 1; break;
    }

    // Calculate compound interest: A = P(1 + r/n)^(nt)
    const grossAmount = principal * Math.pow(1 + annualRate / n, n * timeElapsedYears);
    
    // Apply withholding tax if specified
    if (this.withholdingTaxRate) {
      const gains = grossAmount - principal;
      const tax = gains * (this.withholdingTaxRate / 100);
      return Math.round((grossAmount - tax) * 100) / 100; // Round to 2 decimal places
    }

    return Math.round(grossAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if this is an investment account (stock/ETF)
   */
  isInvestment(): boolean {
    return this.type === 'investment';
  }

  /**
   * Check if this is a CD account
   */
  isCD(): boolean {
    return this.type === 'cd';
  }

  /**
   * Check if this is a normal account
   */
  isNormal(): boolean {
    return this.type === 'normal';
  }

  /**
   * Check if this account has investment-like behavior (investment or CD)
   */
  isInvestmentLike(): boolean {
    return this.isInvestment() || this.isCD();
  }

  /**
   * Calculate investment account balance from shares and current price
   * For investment accounts: balance = shares * currentPrice
   * 
   * @param currentPrice - Current stock price
   * @returns Calculated balance
   */
  calculateInvestmentBalance(currentPrice: number): number {
    if (!this.isInvestment()) {
      throw new Error('Cannot calculate investment balance for non-investment account');
    }

    if (currentPrice < 0) {
      throw new Error('Stock price cannot be negative');
    }

    if (!this.shares || this.shares === 0) {
      return 0;
    }

    return this.shares * currentPrice;
  }

  /**
   * Update balance with investment calculation
   * This is a convenience method that combines calculation and update
   * 
   * @param currentPrice - Current stock price
   */
  updateBalanceFromStockPrice(currentPrice: number): void {
    const calculatedBalance = this.calculateInvestmentBalance(currentPrice);
    this.updateBalance(calculatedBalance);
  }

  /**
   * Update display order
   */
  updateDisplayOrder(order: number): void {
    if (order < 0) {
      throw new Error('Display order cannot be negative');
    }
    this.displayOrder = order;
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      currency: this.currency,
      balance: this._balance,
      type: this.type,
      stockSymbol: this.stockSymbol,
      montoInvertido: this.montoInvertido,
      shares: this.shares,
      displayOrder: this.displayOrder,
      // CD-specific fields
      investmentType: this.investmentType,
      principal: this.principal,
      interestRate: this.interestRate,
      termMonths: this.termMonths,
      maturityDate: this.maturityDate,
      compoundingFrequency: this.compoundingFrequency,
      earlyWithdrawalPenalty: this.earlyWithdrawalPenalty,
      withholdingTaxRate: this.withholdingTaxRate,
      cdCreatedAt: this.cdCreatedAt,
    };
  }
}
