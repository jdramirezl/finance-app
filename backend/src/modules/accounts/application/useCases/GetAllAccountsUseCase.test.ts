/**
 * Unit Tests for GetAllAccountsUseCase
 * 
 * Tests the business logic for fetching all accounts with calculated balances.
 * 
 * Requirements: 4.4
 */

import 'reflect-metadata';
import { GetAllAccountsUseCase } from './GetAllAccountsUseCase';
import { Account } from '../../domain/Account';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import { Pocket } from '../../../pockets/domain/Pocket';

interface IStockPriceService {
  execute(symbol: string): Promise<{ symbol: string; price: number; lastUpdated: Date }>;
}

describe('GetAllAccountsUseCase', () => {
  let useCase: GetAllAccountsUseCase;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;
  let mockStockPriceService: jest.Mocked<IStockPriceService>;

  beforeEach(() => {
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
      save: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameInAccount: jest.fn(),
      existsByNameInAccountExcludingId: jest.fn(),
      existsFixedPocketInAccount: jest.fn(),
      existsFixedPocketForUser: jest.fn(),
      existsFixedPocketForUserExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByAccountId: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as jest.Mocked<IPocketRepository>;

    mockStockPriceService = {
      execute: jest.fn(),
    } as jest.Mocked<IStockPriceService>;

    useCase = new GetAllAccountsUseCase(
      mockAccountRepo,
      mockPocketRepo,
      mockStockPriceService
    );
  });

  describe('Normal Accounts', () => {
    it('should fetch all accounts and calculate balances from pockets', async () => {
      const userId = 'user-123';
      
      const account1 = new Account('acc-1', 'Checking', '#3b82f6', 'USD', 0, 'normal');
      const account2 = new Account('acc-2', 'Savings', '#10b981', 'USD', 0, 'normal');

      mockAccountRepo.findAllByUserId.mockResolvedValue([account1, account2]);

      // findAllByUserId returns all pockets for the user in one batch
      mockPocketRepo.findAllByUserId.mockResolvedValue([
        new Pocket('pocket-1', 'acc-1', 'P1', 'normal', 1000, 'USD'),
        new Pocket('pocket-2', 'acc-1', 'P2', 'normal', 500, 'USD'),
        new Pocket('pocket-3', 'acc-2', 'P3', 'normal', 2000, 'USD'),
      ]);

      const result = await useCase.execute(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('acc-1');
      expect(result[0].balance).toBe(1500); // 1000 + 500
      expect(result[1].id).toBe('acc-2');
      expect(result[1].balance).toBe(2000);
      
      expect(mockAccountRepo.findAllByUserId).toHaveBeenCalledWith(userId);
      expect(mockPocketRepo.findAllByUserId).toHaveBeenCalledWith(userId);
    });

    it('should handle accounts with no pockets (zero balance)', async () => {
      const userId = 'user-123';
      const account = new Account('acc-1', 'Empty Account', '#3b82f6', 'USD', 0, 'normal');

      mockAccountRepo.findAllByUserId.mockResolvedValue([account]);
      mockPocketRepo.findAllByUserId.mockResolvedValue([]);

      const result = await useCase.execute(userId);

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(0);
    });
  });

  describe('Investment Accounts', () => {
    it('should fetch stock price and calculate investment account balance', async () => {
      const userId = 'user-123';
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

      mockAccountRepo.findAllByUserId.mockResolvedValue([account]);
      mockPocketRepo.findAllByUserId.mockResolvedValue([]);
      mockStockPriceService.execute.mockResolvedValue({
        symbol: 'VOO', price: 400, lastUpdated: new Date()
      });

      const result = await useCase.execute(userId);

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(4000); // 10 shares * $400
      expect(mockStockPriceService.execute).toHaveBeenCalledWith('VOO');
    });

    it('should skip fetching prices when skipInvestmentPrices is true', async () => {
      const userId = 'user-123';
      const account = new Account(
        'acc-1',
        'VOO Investment',
        '#3b82f6',
        'USD',
        1000,
        'investment',
        'VOO'
      );
      account.shares = 10;

      mockAccountRepo.findAllByUserId.mockResolvedValue([account]);
      mockPocketRepo.findAllByUserId.mockResolvedValue([]);

      const result = await useCase.execute(userId, true);

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(1000); // Keeps existing balance
      expect(mockStockPriceService.execute).not.toHaveBeenCalled();
    });

    it('should handle stock price fetch failures gracefully', async () => {
      const userId = 'user-123';
      const account = new Account(
        'acc-1',
        'VOO Investment',
        '#3b82f6',
        'USD',
        1000,
        'investment',
        'VOO'
      );
      account.shares = 10;

      mockAccountRepo.findAllByUserId.mockResolvedValue([account]);
      mockPocketRepo.findAllByUserId.mockResolvedValue([]);
      mockStockPriceService.execute.mockRejectedValue(new Error('API error'));

      const result = await useCase.execute(userId);

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(1000); // Keeps existing balance on error
    });

    it('should handle investment accounts with zero shares', async () => {
      const userId = 'user-123';
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

      mockAccountRepo.findAllByUserId.mockResolvedValue([account]);
      mockPocketRepo.findAllByUserId.mockResolvedValue([]);
      mockStockPriceService.execute.mockResolvedValue({
        symbol: 'VOO', price: 400, lastUpdated: new Date()
      });

      const result = await useCase.execute(userId);

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(0); // 0 shares = 0 balance
      expect(mockStockPriceService.execute).toHaveBeenCalledWith('VOO');
    });
  });

  describe('Sorting', () => {
    it('should sort accounts by display order', async () => {
      const userId = 'user-123';
      
      const account1 = new Account('acc-1', 'Third', '#3b82f6', 'USD', 0, 'normal');
      account1.displayOrder = 2;
      
      const account2 = new Account('acc-2', 'First', '#10b981', 'USD', 0, 'normal');
      account2.displayOrder = 0;
      
      const account3 = new Account('acc-3', 'Second', '#f59e0b', 'USD', 0, 'normal');
      account3.displayOrder = 1;

      mockAccountRepo.findAllByUserId.mockResolvedValue([account1, account2, account3]);
      mockPocketRepo.findAllByUserId.mockResolvedValue([]);

      const result = await useCase.execute(userId);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('First');
      expect(result[1].name).toBe('Second');
      expect(result[2].name).toBe('Third');
    });

    it('should place accounts without display order at the end', async () => {
      const userId = 'user-123';
      
      const account1 = new Account('acc-1', 'Has Order', '#3b82f6', 'USD', 0, 'normal');
      account1.displayOrder = 0;
      
      const account2 = new Account('acc-2', 'No Order', '#10b981', 'USD', 0, 'normal');
      // No display order set

      mockAccountRepo.findAllByUserId.mockResolvedValue([account2, account1]);
      mockPocketRepo.findAllByUserId.mockResolvedValue([]);

      const result = await useCase.execute(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Has Order');
      expect(result[1].name).toBe('No Order');
    });
  });

  describe('Mixed Account Types', () => {
    it('should handle both normal and investment accounts together', async () => {
      const userId = 'user-123';
      
      const normalAccount = new Account('acc-1', 'Checking', '#3b82f6', 'USD', 0, 'normal');
      normalAccount.displayOrder = 0;
      
      const investmentAccount = new Account(
        'acc-2',
        'VOO',
        '#10b981',
        'USD',
        0,
        'investment',
        'VOO'
      );
      investmentAccount.shares = 5;
      investmentAccount.displayOrder = 1;

      mockAccountRepo.findAllByUserId.mockResolvedValue([normalAccount, investmentAccount]);
      
      mockPocketRepo.findAllByUserId.mockResolvedValue([
        new Pocket('pocket-1', 'acc-1', 'P1', 'normal', 1000, 'USD'),
      ]);
      
      mockStockPriceService.execute.mockResolvedValue({
        symbol: 'VOO', price: 400, lastUpdated: new Date()
      });

      const result = await useCase.execute(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Checking');
      expect(result[0].balance).toBe(1000);
      expect(result[1].name).toBe('VOO');
      expect(result[1].balance).toBe(2000); // 5 * 400
    });
  });

  describe('Empty Results', () => {
    it('should return empty array when user has no accounts', async () => {
      const userId = 'user-123';
      mockAccountRepo.findAllByUserId.mockResolvedValue([]);
      mockPocketRepo.findAllByUserId.mockResolvedValue([]);

      const result = await useCase.execute(userId);

      expect(result).toEqual([]);
      expect(mockStockPriceService.execute).not.toHaveBeenCalled();
    });
  });
});
