/**
 * Account Domain Service
 * 
 * Contains complex business logic that doesn't belong in a single entity.
 * Handles balance calculations for both normal and investment accounts.
 */

import type { Account } from './Account';

/**
 * Pocket data structure for balance calculation
 * (Pocket entity will be defined in Phase 2)
 */
interface PocketData {
  id: string;
  accountId: string;
  balance: number;
}

/**
 * Domain service for account-related business logic
 */
export class AccountDomainService {
  /**
   * Calculate account balance from pockets
   * 
   * For normal accounts: sum of all pocket balances
   * 
   * @param pockets - Array of pockets belonging to the account
   * @returns Calculated balance
   */
  calculateBalanceFromPockets(pockets: PocketData[]): number {
    return pockets.reduce((total, pocket) => total + pocket.balance, 0);
  }

  /**
   * Calculate investment account balance
   * 
   * For investment accounts: shares * current price
   * 
   * @param account - Investment account
   * @param currentPrice - Current stock price
   * @returns Calculated balance
   */
  calculateInvestmentBalance(account: Account, currentPrice: number): number {
    if (!account.isInvestment()) {
      throw new Error('Cannot calculate investment balance for non-investment account');
    }

    if (!account.shares) {
      return 0;
    }

    if (currentPrice < 0) {
      throw new Error('Stock price cannot be negative');
    }

    return account.shares * currentPrice;
  }

  /**
   * Calculate investment gains in USD
   * 
   * @param account - Investment account
   * @param currentPrice - Current stock price
   * @returns Gains in USD (can be negative for losses)
   */
  calculateInvestmentGains(account: Account, currentPrice: number): number {
    if (!account.isInvestment()) {
      throw new Error('Cannot calculate investment gains for non-investment account');
    }

    const currentValue = this.calculateInvestmentBalance(account, currentPrice);
    const invested = account.montoInvertido || 0;

    return currentValue - invested;
  }

  /**
   * Calculate investment gains percentage
   * 
   * @param account - Investment account
   * @param currentPrice - Current stock price
   * @returns Gains percentage (e.g., 15.5 for 15.5% gain)
   */
  calculateInvestmentGainsPercentage(account: Account, currentPrice: number): number {
    if (!account.isInvestment()) {
      throw new Error('Cannot calculate investment gains for non-investment account');
    }

    const invested = account.montoInvertido || 0;
    
    if (invested === 0) {
      return 0;
    }

    const gains = this.calculateInvestmentGains(account, currentPrice);
    return (gains / invested) * 100;
  }

  /**
   * Update account balance based on account type
   * 
   * @param account - Account to update
   * @param pockets - Pockets for normal accounts (optional)
   * @param currentPrice - Current stock price for investment accounts (optional)
   */
  updateAccountBalance(
    account: Account,
    pockets?: PocketData[],
    currentPrice?: number
  ): void {
    if (account.isCD()) {
      // CD accounts calculate their own balance using compound interest
      const balance = account.calculateCDBalance();
      account.updateBalance(balance);
    } else if (account.isInvestment()) {
      if (currentPrice === undefined) {
        throw new Error('Current price is required for investment accounts');
      }
      const balance = this.calculateInvestmentBalance(account, currentPrice);
      account.updateBalance(balance);
    } else {
      if (!pockets) {
        throw new Error('Pockets are required for normal accounts');
      }
      const balance = this.calculateBalanceFromPockets(pockets);
      account.updateBalance(balance);
    }
  }
}
