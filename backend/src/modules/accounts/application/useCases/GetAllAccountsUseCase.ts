/**
 * Get All Accounts Use Case
 * 
 * Fetches all accounts for a user with calculated balances.
 * For normal accounts: calculates balance from pockets
 * For investment accounts: fetches current stock price and calculates balance
 * 
 * Requirements: 4.4
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { AccountResponseDTO } from '../dtos/AccountDTO';
import { AccountMapper } from '../mappers/AccountMapper';
import { AccountDomainService } from '../../domain/AccountDomainService';

/**
 * Pocket repository interface (will be implemented in Phase 2)
 * For now, we define the minimal interface needed
 */
interface IPocketRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; balance: number }>>;
}

/**
 * Stock price service interface (will be implemented in Phase 5)
 * For now, we define the minimal interface needed
 */
interface IStockPriceService {
  execute(symbol: string): Promise<{ symbol: string; price: number; lastUpdated: Date }>;
}

@injectable()
export class GetAllAccountsUseCase {
  private domainService: AccountDomainService;

  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('StockPriceService') private stockPriceService: IStockPriceService
  ) {
    this.domainService = new AccountDomainService();
  }

  /**
   * Execute the use case
   * 
   * @param userId - User ID from authentication
   * @param skipInvestmentPrices - Optional flag to skip fetching investment prices (for performance)
   * @returns Array of accounts with calculated balances, sorted by display order
   */
  async execute(userId: string, skipInvestmentPrices: boolean = false): Promise<AccountResponseDTO[]> {
    // Fetch all accounts for user (Requirement 4.4)
    const accounts = await this.accountRepo.findAllByUserId(userId);

    // Calculate balances for each account
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        if (account.isInvestment()) {
          // For investment accounts: fetch current price and calculate balance
          if (!skipInvestmentPrices && account.stockSymbol) {
            try {
              const stockPrice = await this.stockPriceService.execute(account.stockSymbol);
              this.domainService.updateAccountBalance(account, undefined, stockPrice.price);
            } catch (error) {
              // If price fetch fails, keep existing balance
              console.error(`Failed to fetch price for ${account.stockSymbol}:`, error);
            }
          }
        } else {
          // For normal accounts: calculate balance from pockets
          const pockets = await this.pocketRepo.findByAccountId(account.id, userId);
          this.domainService.updateAccountBalance(account, pockets);
        }

        return account;
      })
    );

    // Sort by display order (Requirement 4.4)
    const sortedAccounts = accountsWithBalances.sort((a, b) => {
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    // Convert to DTOs
    return sortedAccounts.map(account => AccountMapper.toDTO(account));
  }
}
