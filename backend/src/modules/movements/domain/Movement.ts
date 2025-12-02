/**
 * Movement Domain Entity
 * 
 * Represents a financial transaction (income or expense) with business rules and invariants.
 * This is the core domain model - no dependencies on infrastructure.
 */

import type { Currency, MovementType } from '@shared-backend/types';

export class Movement {
  constructor(
    public readonly id: string,
    public type: MovementType,
    public accountId: string,
    public pocketId: string,
    public amount: number,
    public displayedDate: Date,
    public notes?: string,
    public subPocketId?: string,
    public isPending: boolean = false,
    public isOrphaned: boolean = false,
    public orphanedAccountName?: string,
    public orphanedAccountCurrency?: Currency,
    public orphanedPocketName?: string
  ) {
    this.validate();
  }

  /**
   * Domain invariants - business rules that must always be true
   */
  private validate(): void {
    // Validate amount
    if (this.amount <= 0) {
      throw new Error('Movement amount must be positive');
    }

    // Validate type
    const validTypes: MovementType[] = ['IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo'];
    if (!validTypes.includes(this.type)) {
      throw new Error(`Invalid movement type - must be one of: ${validTypes.join(', ')}`);
    }

    // Validate accountId (allow 'orphaned' placeholder for orphaned movements)
    if (!this.accountId?.trim()) {
      throw new Error('Movement must belong to an account');
    }

    // Validate pocketId (allow 'orphaned' placeholder for orphaned movements)
    if (!this.pocketId?.trim()) {
      throw new Error('Movement must belong to a pocket');
    }

    // Validate displayedDate
    if (!(this.displayedDate instanceof Date) || isNaN(this.displayedDate.getTime())) {
      throw new Error('Movement must have a valid displayed date');
    }

    // Validate orphaned data consistency
    // Note: We allow orphaned movements with missing metadata for backward compatibility
    // The mapper will provide defaults if needed
    if (this.isOrphaned) {
      // Set defaults if missing
      if (!this.orphanedAccountName) {
        this.orphanedAccountName = 'Unknown';
      }
      if (!this.orphanedAccountCurrency) {
        this.orphanedAccountCurrency = 'USD';
      }
      if (!this.orphanedPocketName) {
        this.orphanedPocketName = 'Unknown';
      }
    }
  }

  /**
   * Check if this is an income movement
   */
  isIncome(): boolean {
    return this.type === 'IngresoNormal' || this.type === 'IngresoFijo';
  }

  /**
   * Check if this is an expense movement
   */
  isExpense(): boolean {
    return this.type === 'EgresoNormal' || this.type === 'EgresoFijo';
  }

  /**
   * Get signed amount (positive for income, negative for expense)
   * This is used for balance calculations
   */
  getSignedAmount(): number {
    return this.isIncome() ? this.amount : -this.amount;
  }

  /**
   * Update movement details
   */
  update(
    type?: MovementType,
    amount?: number,
    displayedDate?: Date,
    notes?: string,
    subPocketId?: string | null,
    accountId?: string,
    pocketId?: string
  ): void {
    if (type !== undefined) this.type = type;
    if (amount !== undefined) this.amount = amount;
    if (displayedDate !== undefined) this.displayedDate = displayedDate;
    if (notes !== undefined) this.notes = notes;
    if (subPocketId !== undefined) {
      this.subPocketId = subPocketId === null ? undefined : subPocketId;
    }
    if (accountId !== undefined) this.accountId = accountId;
    if (pocketId !== undefined) this.pocketId = pocketId;
    this.validate();
  }

  /**
   * Mark movement as pending
   */
  markAsPending(): void {
    this.isPending = true;
  }

  /**
   * Apply pending movement (mark as not pending)
   */
  applyPending(): void {
    this.isPending = false;
  }

  /**
   * Mark movement as orphaned (when account/pocket is deleted)
   */
  markAsOrphaned(accountName: string, accountCurrency: Currency, pocketName: string): void {
    this.isOrphaned = true;
    this.orphanedAccountName = accountName;
    this.orphanedAccountCurrency = accountCurrency;
    this.orphanedPocketName = pocketName;
    this.validate();
  }

  /**
   * Restore orphaned movement (when matching account/pocket is found)
   */
  restoreFromOrphaned(accountId: string, pocketId: string, subPocketId?: string): void {
    this.isOrphaned = false;
    this.accountId = accountId;
    this.pocketId = pocketId;
    this.subPocketId = subPocketId;
    this.orphanedAccountName = undefined;
    this.orphanedAccountCurrency = undefined;
    this.orphanedPocketName = undefined;
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
      type: this.type,
      accountId: this.accountId,
      pocketId: this.pocketId,
      amount: this.amount,
      displayedDate: this.displayedDate.toISOString(),
      notes: this.notes,
      subPocketId: this.subPocketId,
      isPending: this.isPending,
      isOrphaned: this.isOrphaned,
      orphanedAccountName: this.orphanedAccountName,
      orphanedAccountCurrency: this.orphanedAccountCurrency,
      orphanedPocketName: this.orphanedPocketName,
    };
  }
}
