/**
 * SubPocket Domain Entity
 * 
 * Represents a sub-pocket within a fixed expenses pocket with business rules and invariants.
 * SubPockets are used for recurring expenses with monthly contribution calculations.
 * This is the core domain model - no dependencies on infrastructure.
 */

export class SubPocket {
  constructor(
    public readonly id: string,
    public pocketId: string,
    public name: string,
    public valueTotal: number,
    public periodicityMonths: number,
    private _balance: number,
    public enabled: boolean = true,
    public groupId?: string,
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
      throw new Error('SubPocket name cannot be empty');
    }

    // Validate pocketId
    if (!this.pocketId?.trim()) {
      throw new Error('SubPocket must belong to a pocket');
    }

    // Validate valueTotal
    if (this.valueTotal <= 0) {
      throw new Error('Value total must be positive');
    }

    // Validate periodicityMonths
    if (this.periodicityMonths <= 0) {
      throw new Error('Periodicity months must be positive');
    }

    // Validate that periodicityMonths is an integer
    if (!Number.isInteger(this.periodicityMonths)) {
      throw new Error('Periodicity months must be an integer');
    }

    // Validate display order if provided
    if (this.displayOrder !== undefined && this.displayOrder < 0) {
      throw new Error('Display order cannot be negative');
    }
  }

  /**
   * Balance is read-only - calculated from movements
   */
  get balance(): number {
    return this._balance;
  }

  /**
   * Update balance (called by domain service after movement calculation)
   */
  updateBalance(newBalance: number): void {
    this._balance = newBalance;
  }

  /**
   * Calculate monthly contribution
   * This is a key business rule: monthly contribution = valueTotal / periodicityMonths
   * 
   * Requirements 8.2: Monthly contribution calculation
   */
  get monthlyContribution(): number {
    return this.valueTotal / this.periodicityMonths;
  }

  /**
   * Update sub-pocket details
   */
  update(
    name?: string,
    valueTotal?: number,
    periodicityMonths?: number
  ): void {
    if (name !== undefined) {
      this.name = name;
    }
    if (valueTotal !== undefined) {
      this.valueTotal = valueTotal;
    }
    if (periodicityMonths !== undefined) {
      this.periodicityMonths = periodicityMonths;
    }
    this.validate();
  }

  /**
   * Toggle enabled status
   * Requirements 8.4: Toggle sub-pocket enabled status
   */
  toggleEnabled(): void {
    this.enabled = !this.enabled;
  }

  /**
   * Set enabled status explicitly
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
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
   * Update group reference
   * Requirements 9.2: Moving sub-pocket to group
   */
  updateGroupId(newGroupId: string | undefined): void {
    this.groupId = newGroupId;
  }

  /**
   * Check if sub-pocket is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if sub-pocket belongs to a group
   */
  hasGroup(): boolean {
    return this.groupId !== undefined && this.groupId !== null;
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      id: this.id,
      pocketId: this.pocketId,
      name: this.name,
      valueTotal: this.valueTotal,
      periodicityMonths: this.periodicityMonths,
      balance: this._balance,
      enabled: this.enabled,
      groupId: this.groupId,
      displayOrder: this.displayOrder,
      monthlyContribution: this.monthlyContribution,
    };
  }
}
