/**
 * StockPrice Value Object
 * 
 * Represents a stock price with caching metadata.
 * Value objects are immutable and defined by their attributes.
 */

export class StockPrice {
  private static readonly CACHE_EXPIRATION_HOURS = 24;

  constructor(
    public readonly symbol: string,
    public readonly price: number,
    public readonly cachedAt: Date,
    public readonly source?: 'cache' | 'db' | 'api'
  ) {
    this.validate();
  }

  /**
   * Validate stock price invariants
   */
  private validate(): void {
    // Validate symbol
    if (!this.symbol?.trim()) {
      throw new Error('Stock symbol cannot be empty');
    }

    // Validate symbol format (uppercase letters, 1-5 characters)
    if (!this.symbol.match(/^[A-Z]{1,5}$/)) {
      throw new Error('Stock symbol must be 1-5 uppercase letters');
    }

    // Validate price
    if (typeof this.price !== 'number' || isNaN(this.price)) {
      throw new Error('Stock price must be a valid number');
    }

    if (this.price < 0) {
      throw new Error('Stock price cannot be negative');
    }

    // Validate cachedAt
    if (!(this.cachedAt instanceof Date) || isNaN(this.cachedAt.getTime())) {
      throw new Error('Cached date must be a valid Date');
    }
  }

  /**
   * Check if the cached price has expired (older than 24 hours)
   */
  isExpired(): boolean {
    const now = new Date();
    const expirationTime = new Date(this.cachedAt);
    expirationTime.setHours(expirationTime.getHours() + StockPrice.CACHE_EXPIRATION_HOURS);

    return now > expirationTime;
  }

  /**
   * Get the age of the cached price in hours
   */
  getAgeInHours(): number {
    const now = new Date();
    const ageInMs = now.getTime() - this.cachedAt.getTime();
    return ageInMs / (1000 * 60 * 60);
  }

  /**
   * Check if the price is still fresh (not expired)
   */
  isFresh(): boolean {
    return !this.isExpired();
  }

  /**
   * Create a new StockPrice with updated price (for cache refresh)
   */
  withUpdatedPrice(newPrice: number): StockPrice {
    return new StockPrice(this.symbol, newPrice, new Date());
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      symbol: this.symbol,
      price: this.price,
      cachedAt: this.cachedAt.toISOString(),
    };
  }

  /**
   * Create from plain object (for deserialization)
   */
  static fromJSON(data: { symbol: string; price: number; cachedAt: string }): StockPrice {
    return new StockPrice(
      data.symbol,
      data.price,
      new Date(data.cachedAt)
    );
  }

  /**
   * Equality comparison (value objects are equal if all attributes match)
   */
  equals(other: StockPrice): boolean {
    return (
      this.symbol === other.symbol &&
      this.price === other.price &&
      this.cachedAt.getTime() === other.cachedAt.getTime()
    );
  }
}
