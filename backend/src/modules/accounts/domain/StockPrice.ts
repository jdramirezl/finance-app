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
   * Check if the cached price has expired.
   *
   * @param cacheHours - Optional override for how long the cache is
   *   considered valid. Defaults to {@link CACHE_EXPIRATION_HOURS} when
   *   omitted, preserving the original 24-hour behavior for any caller
   *   that hasn't migrated to dynamic sizing.
   */
  isExpired(cacheHours?: number): boolean {
    const hours = cacheHours ?? StockPrice.CACHE_EXPIRATION_HOURS;
    const now = new Date();
    const expirationTime = new Date(this.cachedAt);
    expirationTime.setHours(expirationTime.getHours() + hours);

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
   * Check if the price is still fresh (not expired).
   *
   * @param cacheHours - Optional override for how long the cache is
   *   considered valid. See {@link isExpired} for details.
   */
  isFresh(cacheHours?: number): boolean {
    return !this.isExpired(cacheHours);
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
