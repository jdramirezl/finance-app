/**
 * Unit Tests for GetAccountByIdUseCase
 * 
 * Tests the business logic for fetching a single account by ID with ownership verification.
 * 
 * Requirements: 4.4
 */

import 'reflect-metadata';
import { GetAccountByIdUseCase } from './GetAccountByIdUseCase';
import { Account } from '../../domain/Account';
import { NotFoundError } from '../../../../shared/errors/AppError';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';

// Mock interfaces for dependencies that will be implemented in later phases
interface IPocketRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; balance: number }>>;
}

interface IStockPriceService {
  getCurrentPrice(symbol: string): Promise<number>;
}

describe('GetAccountByIdUseCase', () => {
  let useCase: GetAccountByIdUseCase;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;
  let mockStockPriceService: jest.Mocked<IStockPriceService>;

  beforeEach(() => {
    // Create mock repositories
    mockAccountRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameAndCurrency: jest.fn(),
      existsByNameAndCurrencyExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as jest.Mocked<IAccountRepository>;

    mockPocketRepo = {
      findByAccountId: jest.fn(),
    } as jest.Mocked<IPocketRepository>;

    mockStockPriceService = {
      getCurrentPrice: jest.fn(),
    } as jest.Mocked<IStockPriceService>;

    useCase = new GetAccountByIdUseCase(
      mockAccountRepo,
      mockPocketRepo,
      mockStockPriceService
    );
  });

  describe('Normal Accounts', () => {
    it('should fetch account by ID and calculate balance from pockets', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account('acc-1', 'Checking', '#3b82f6', 'USD', 0, 'normal');

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([
        { id: 'pocket-1', accountId: 'acc-1', balance: 1000 },
        { id: 'pocket-2', accountId: 'acc-1', balance: 500 },
      ]);

      const result = await useCase.execute(accountId, userId);

      expect(result.id).toBe('acc-1');
      expect(result.name).toBe('Checking');
      expect(result.balance).toBe(1500); // 1000 + 500
      
      expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
      expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
    });

    it('should handle account with no pockets (zero balance)', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account('acc-1', 'Empty Account', '#3b82f6', 'USD', 0, 'normal');

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([]);

      const result = await useCase.execute(accountId, userId);

      expect(result.id).toBe('acc-1');
      expect(result.balance).toBe(0);
    });
  });

  describe('Investment Accounts', () => {
    it('should fetch stock price and calculate investment account balance', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account(
        'acc-1',
        'VOO Investment',
        '#3b82f6',
        'USD',
        0,
        'investment',
        'VOO'
      );
      account.shares = 10;

      mockAccountRepo.findById.mockResolvedValue(account);
      mockStockPriceService.getCurrentPrice.mockResolvedValue(400); // $400 per share

      const result = await useCase.execute(accountId, userId);

      expect(result.id).toBe('acc-1');
      expect(result.balance).toBe(4000); // 10 shares * $400
      expect(mockStockPriceService.getCurrentPrice).toHaveBeenCalledWith('VOO');
    });

    it('should skip fetching price when skipInvestmentPrice is true', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account(
        'acc-1',
        'VOO Investment',
        '#3b82f6',
        'USD',
        1000, // Existing balance
        'investment',
        'VOO'
      );
      account.shares = 10;

      mockAccountRepo.findById.mockResolvedValue(account);

      const result = await useCase.execute(accountId, userId, true);

      expect(result.id).toBe('acc-1');
      expect(result.balance).toBe(1000); // Keeps existing balance
      expect(mockStockPriceService.getCurrentPrice).not.toHaveBeenCalled();
    });

    it('should handle stock price fetch failures gracefully', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account(
        'acc-1',
        'VOO Investment',
        '#3b82f6',
        'USD',
        1000, // Existing balance
        'investment',
        'VOO'
      );
      account.shares = 10;

      mockAccountRepo.findById.mockResolvedValue(account);
      mockStockPriceService.getCurrentPrice.mockRejectedValue(new Error('API error'));

      const result = await useCase.execute(accountId, userId);

      expect(result.id).toBe('acc-1');
      expect(result.balance).toBe(1000); // Keeps existing balance on error
    });

    it('should handle investment accounts with zero shares', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account(
        'acc-1',
        'Investment',
        '#3b82f6',
        'USD',
        0,
        'investment',
        'VOO'
      );
      // No shares set (undefined)

      mockAccountRepo.findById.mockResolvedValue(account);
      mockStockPriceService.getCurrentPrice.mockResolvedValue(400);

      const result = await useCase.execute(accountId, userId);

      expect(result.id).toBe('acc-1');
      expect(result.balance).toBe(0); // 0 shares = 0 balance
      expect(mockStockPriceService.getCurrentPrice).toHaveBeenCalledWith('VOO');
    });

    it('should handle investment accounts with missing shares', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account(
        'acc-1',
        'Investment',
        '#3b82f6',
        'USD',
        500, // Existing balance
        'investment',
        'VOO'
      );
      // shares is undefined

      mockAccountRepo.findById.mockResolvedValue(account);
      mockStockPriceService.getCurrentPrice.mockResolvedValue(400);

      const result = await useCase.execute(accountId, userId);

      expect(result.id).toBe('acc-1');
      expect(result.balance).toBe(0); // undefined shares = 0 balance
      expect(mockStockPriceService.getCurrentPrice).toHaveBeenCalledWith('VOO');
    });
  });

  describe('Ownership Verification', () => {
    it('should throw NotFoundError when account does not exist', async () => {
      const userId = 'user-123';
      const accountId = 'non-existent';

      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(accountId, userId))
        .rejects.toThrow(NotFoundError);
      
      await expect(useCase.execute(accountId, userId))
        .rejects.toThrow('Account not found');
    });

    it('should throw NotFoundError when user does not own the account', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';

      // Repository returns null when user doesn't own the account
      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(accountId, userId))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('Account Properties', () => {
    it('should return all account properties in DTO', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account('acc-1', 'Test Account', '#3b82f6', 'USD', 0, 'normal');
      account.displayOrder = 5;

      mockAccountRepo.findById.mockResolvedValue(account);
      mockPocketRepo.findByAccountId.mockResolvedValue([
        { id: 'pocket-1', accountId: 'acc-1', balance: 1000 },
      ]);

      const result = await useCase.execute(accountId, userId);

      expect(result).toMatchObject({
        id: 'acc-1',
        name: 'Test Account',
        color: '#3b82f6',
        currency: 'USD',
        balance: 1000,
        type: 'normal',
        displayOrder: 5,
      });
    });

    it('should return investment-specific properties for investment accounts', async () => {
      const userId = 'user-123';
      const accountId = 'acc-1';
      
      const account = new Account(
        'acc-1',
        'VOO Investment',
        '#3b82f6',
        'USD',
        0,
        'investment',
        'VOO'
      );
      account.shares = 10;
      account.montoInvertido = 3500;

      mockAccountRepo.findById.mockResolvedValue(account);
      mockStockPriceService.getCurrentPrice.mockResolvedValue(400);

      const result = await useCase.execute(accountId, userId);

      expect(result).toMatchObject({
        id: 'acc-1',
        name: 'VOO Investment',
        type: 'investment',
        stockSymbol: 'VOO',
        shares: 10,
        montoInvertido: 3500,
        balance: 4000,
      });
    });
  });
});
