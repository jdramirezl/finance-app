/**
 * Get Account By ID Use Case
 * 
 * Fetches a single account by ID with calculated balance.
 * For normal accounts: calculates balance from pockets
 * For investment accounts: fetches current stock price and calculates balance
 * For CD accounts: calculates balance using compound interest
 * Verifies ownership before returning.
 * 
 * Requirements: 4.4
 */

import { injectable, inject } from 'tsyringe';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { AccountResponseDTO } from '../dtos/AccountDTO';
import { AccountMapper } from '../mappers/AccountMapper';
import { AccountDomainService } from '../../domain/AccountDomainService';
import { NotFoundError } from '../../../../shared/errors/AppError';

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
  getCurrentPrice(symbol: string): Promise<number>;
}

@injectable()
export class GetAccountByIdUseCase {
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
   * @param accountId - Account ID to fetch
   * @param userId - User ID from authentication (for ownership verification)
   * @param skipInvestmentPrice - Optional flag to skip fetching investment price (for performance)
   * @returns Account with calculated balance
   * @throws NotFoundError if account doesn't exist or user doesn't own it
   */
  async execute(
    accountId: string,
    userId: string,
    skipInvestmentPrice: boolean = false
  ): Promise<AccountResponseDTO> {
    // Fetch account by ID (Requirement 4.4)
    const account = await this.accountRepo.findById(accountId, userId);

    // Verify ownership - repository returns null if not found or not owned by user
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    // Calculate balance based on account type
    if (account.isCD()) {
      // For CD accounts: calculate balance using compound interest
      this.domainService.updateAccountBalance(account);
    } else if (account.isInvestment()) {
      // For investment accounts: fetch current price and calculate balance
      if (!skipInvestmentPrice && account.stockSymbol) {
        try {
          const currentPrice = await this.stockPriceService.getCurrentPrice(account.stockSymbol);
          this.domainService.updateAccountBalance(account, undefined, currentPrice);
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

    // Convert to DTO and return
    return AccountMapper.toDTO(account);
  }
}
