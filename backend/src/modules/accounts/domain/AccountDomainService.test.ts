/**
 * AccountDomainService Tests
 * 
 * Tests business logic for balance calculations
 */

import { Account } from './Account';
import { AccountDomainService } from './AccountDomainService';

describe('AccountDomainService', () => {
  let service: AccountDomainService;

  beforeEach(() => {
    service = new AccountDomainService();
  });

  describe('calculateBalanceFromPockets', () => {
    it('should calculate balance from empty pockets', () => {
      const balance = service.calculateBalanceFromPockets([]);
      expect(balance).toBe(0);
    });

    it('should calculate balance from single pocket', () => {
      const pockets = [
        { id: 'p1', accountId: 'a1', balance: 1000 }
      ];
      const balance = service.calculateBalanceFromPockets(pockets);
      expect(balance).toBe(1000);
    });

    it('should calculate balance from multiple pockets', () => {
      const pockets = [
        { id: 'p1', accountId: 'a1', balance: 1000 },
        { id: 'p2', accountId: 'a1', balance: 2500 },
        { id: 'p3', accountId: 'a1', balance: 500 }
      ];
      const balance = service.calculateBalanceFromPockets(pockets);
      expect(balance).toBe(4000);
    });

    it('should handle negative pocket balances', () => {
      const pockets = [
        { id: 'p1', accountId: 'a1', balance: 1000 },
        { id: 'p2', accountId: 'a1', balance: -500 }
      ];
      const balance = service.calculateBalanceFromPockets(pockets);
      expect(balance).toBe(500);
    });
  });

  describe('calculateInvestmentBalance', () => {
    it('should calculate investment balance', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      const balance = service.calculateInvestmentBalance(account, 250);
      expect(balance).toBe(12500); // 50 shares * $250
    });

    it('should return 0 for account with no shares', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 0);
      const balance = service.calculateInvestmentBalance(account, 250);
      expect(balance).toBe(0);
    });

    it('should return 0 for account with undefined shares', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO');
      const balance = service.calculateInvestmentBalance(account, 250);
      expect(balance).toBe(0);
    });

    it('should reject calculation for normal account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal');
      expect(() => {
        service.calculateInvestmentBalance(account, 250);
      }).toThrow('Cannot calculate investment balance for non-investment account');
    });

    it('should reject negative stock price', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      expect(() => {
        service.calculateInvestmentBalance(account, -250);
      }).toThrow('Stock price cannot be negative');
    });
  });

  describe('calculateInvestmentGains', () => {
    it('should calculate positive gains', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      const gains = service.calculateInvestmentGains(account, 250);
      expect(gains).toBe(2500); // (50 * 250) - 10000 = 2500
    });

    it('should calculate negative gains (losses)', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      const gains = service.calculateInvestmentGains(account, 150);
      expect(gains).toBe(-2500); // (50 * 150) - 10000 = -2500
    });

    it('should handle zero investment amount', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 0, 50);
      const gains = service.calculateInvestmentGains(account, 250);
      expect(gains).toBe(12500); // (50 * 250) - 0 = 12500
    });

    it('should handle undefined investment amount', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', undefined, 50);
      const gains = service.calculateInvestmentGains(account, 250);
      expect(gains).toBe(12500); // (50 * 250) - 0 = 12500
    });

    it('should reject calculation for normal account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal');
      expect(() => {
        service.calculateInvestmentGains(account, 250);
      }).toThrow('Cannot calculate investment gains for non-investment account');
    });
  });

  describe('calculateInvestmentGainsPercentage', () => {
    it('should calculate positive gains percentage', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      const percentage = service.calculateInvestmentGainsPercentage(account, 250);
      expect(percentage).toBe(25); // 2500 / 10000 * 100 = 25%
    });

    it('should calculate negative gains percentage', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      const percentage = service.calculateInvestmentGainsPercentage(account, 150);
      expect(percentage).toBe(-25); // -2500 / 10000 * 100 = -25%
    });

    it('should return 0 for zero investment', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 0, 50);
      const percentage = service.calculateInvestmentGainsPercentage(account, 250);
      expect(percentage).toBe(0);
    });

    it('should reject calculation for normal account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal');
      expect(() => {
        service.calculateInvestmentGainsPercentage(account, 250);
      }).toThrow('Cannot calculate investment gains for non-investment account');
    });
  });

  describe('updateAccountBalance', () => {
    it('should update normal account balance from pockets', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal');
      const pockets = [
        { id: 'p1', accountId: 'id', balance: 1000 },
        { id: 'p2', accountId: 'id', balance: 2000 }
      ];

      service.updateAccountBalance(account, pockets);
      expect(account.balance).toBe(3000);
    });

    it('should update investment account balance from price', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      
      service.updateAccountBalance(account, undefined, 250);
      expect(account.balance).toBe(12500);
    });

    it('should reject normal account without pockets', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal');
      
      expect(() => {
        service.updateAccountBalance(account);
      }).toThrow('Pockets are required for normal accounts');
    });

    it('should reject investment account without price', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      
      expect(() => {
        service.updateAccountBalance(account);
      }).toThrow('Current price is required for investment accounts');
    });
  });
});
