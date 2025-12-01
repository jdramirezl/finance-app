/**
 * Account Domain Entity
 * 
 * Represents a financial account with business rules and invariants.
 * This is the core domain model - no dependencies on infrastructure.
 */

import type { Currency } from '@shared-backend/types';

export class Account {
  constructor(
    public readonly id: string,
    public name: string,
    public color: string,
    public currency: Currency,
    private _balance: number,
    public type: 'normal' | 'investment' = 'normal',
    public stockSymbol?: string,
    public montoInvertido?: number,
    public shares?: number,
    public displayOrder?: number
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

    // Validate investment account requirements
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

    // Validate type
    if (this.type !== 'normal' && this.type !== 'investment') {
      throw new Error('Account type must be either "normal" or "investment"');
    }

    // Validate display order if provided
    if (this.displayOrder !== undefined && this.displayOrder < 0) {
      throw new Error('Display order cannot be negative');
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
   * Check if this is an investment account
   */
  isInvestment(): boolean {
    return this.type === 'investment';
  }

  /**
   * Check if this is a normal account
   */
  isNormal(): boolean {
    return this.type === 'normal';
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
    };
  }
}
