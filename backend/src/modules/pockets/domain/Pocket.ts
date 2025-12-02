/**
 * Pocket Domain Entity
 * 
 * Represents a pocket (sub-container) within an account with business rules and invariants.
 * This is the core domain model - no dependencies on infrastructure.
 */

import type { Currency, PocketType } from '@shared-backend/types';

export class Pocket {
  constructor(
    public readonly id: string,
    public accountId: string,
    public name: string,
    public type: PocketType,
    private _balance: number,
    public currency: Currency,
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
      throw new Error('Pocket name cannot be empty');
    }

    // Validate type
    if (this.type !== 'normal' && this.type !== 'fixed') {
      throw new Error('Pocket type must be either "normal" or "fixed"');
    }

    // Validate currency
    const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
    if (!validCurrencies.includes(this.currency)) {
      throw new Error(`Invalid currency - must be one of: ${validCurrencies.join(', ')}`);
    }

    // Validate accountId
    if (!this.accountId?.trim()) {
      throw new Error('Pocket must belong to an account');
    }

    // Validate display order if provided
    if (this.displayOrder !== undefined && this.displayOrder < 0) {
      throw new Error('Display order cannot be negative');
    }
  }

  /**
   * Balance is read-only - calculated from movements or sub-pocket balances
   */
  get balance(): number {
    return this._balance;
  }

  /**
   * Update balance (called by domain service after calculation)
   * For normal pockets: sum of movement amounts
   * For fixed pockets: sum of sub-pocket balances
   */
  updateBalance(newBalance: number): void {
    this._balance = newBalance;
  }

  /**
   * Update pocket details
   */
  update(name?: string): void {
    if (name !== undefined) {
      this.name = name;
    }
    this.validate();
  }

  /**
   * Check if this is a fixed pocket
   */
  isFixed(): boolean {
    return this.type === 'fixed';
  }

  /**
   * Check if this is a normal pocket
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
   * Update account reference (used during pocket migration)
   */
  updateAccountId(newAccountId: string): void {
    if (!newAccountId?.trim()) {
      throw new Error('Account ID cannot be empty');
    }
    this.accountId = newAccountId;
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      name: this.name,
      type: this.type,
      balance: this._balance,
      currency: this.currency,
      displayOrder: this.displayOrder,
    };
  }
}
