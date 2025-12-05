/**
 * FixedExpenseGroup Domain Entity
 * 
 * Represents a group for organizing sub-pockets by payment period or category.
 * This is the core domain model - no dependencies on infrastructure.
 */

export class FixedExpenseGroup {
  constructor(
    public readonly id: string,
    public name: string,
    public color: string,
    public displayOrder: number = 0
  ) {
    this.validate();
  }

  /**
   * Domain invariants - business rules that must always be true
   */
  private validate(): void {
    // Validate name
    if (!this.name?.trim()) {
      throw new Error('Group name cannot be empty');
    }

    // Validate color format (hex color)
    if (!this.color?.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('Invalid color format - must be hex format like #3b82f6');
    }
  }

  /**
   * Update group details
   * Requirements 9.1: Update group
   */
  update(name?: string, color?: string): void {
    if (name !== undefined) {
      this.name = name;
    }
    if (color !== undefined) {
      this.color = color;
    }
    this.validate();
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
    };
  }
}
