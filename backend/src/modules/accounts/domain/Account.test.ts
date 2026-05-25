/**
 * Account Entity Tests
 * 
 * Tests domain validation rules and business logic
 */

import { Account } from './Account';
import type { Currency } from '@shared-backend/types';

describe('Account Entity', () => {
  describe('Validation', () => {
    it('should create a valid normal account', () => {
      const account = new Account(
        'test-id',
        'Test Account',
        '#3b82f6',
        'USD',
        0,
        'normal'
      );

      expect(account.id).toBe('test-id');
      expect(account.name).toBe('Test Account');
      expect(account.color).toBe('#3b82f6');
      expect(account.currency).toBe('USD');
      expect(account.balance).toBe(0);
      expect(account.type).toBe('normal');
    });

    it('should create a valid investment account', () => {
      const account = new Account(
        'test-id',
        'Investment Account',
        '#10b981',
        'USD',
        0,
        'investment',
        'VOO',
        10000,
        50
      );

      expect(account.type).toBe('investment');
      expect(account.stockSymbol).toBe('VOO');
      expect(account.montoInvertido).toBe(10000);
      expect(account.shares).toBe(50);
    });

    it('should reject empty account name', () => {
      expect(() => {
        new Account('id', '', '#3b82f6', 'USD', 0);
      }).toThrow('Account name cannot be empty');
    });

    it('should reject whitespace-only account name', () => {
      expect(() => {
        new Account('id', '   ', '#3b82f6', 'USD', 0);
      }).toThrow('Account name cannot be empty');
    });

    it('should reject invalid color format', () => {
      expect(() => {
        new Account('id', 'Test', 'invalid', 'USD', 0);
      }).toThrow('Invalid color format');
    });

    it('should reject color without hash', () => {
      expect(() => {
        new Account('id', 'Test', '3b82f6', 'USD', 0);
      }).toThrow('Invalid color format');
    });

    it('should reject short color code', () => {
      expect(() => {
        new Account('id', 'Test', '#fff', 'USD', 0);
      }).toThrow('Invalid color format');
    });

    it('should reject invalid currency', () => {
      expect(() => {
        new Account('id', 'Test', '#3b82f6', 'INVALID' as Currency, 0);
      }).toThrow('Invalid currency');
    });

    it('should reject investment account without stock symbol', () => {
      expect(() => {
        new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment');
      }).toThrow('Investment accounts must have a stock symbol');
    });

    it('should reject investment account with empty stock symbol', () => {
      expect(() => {
        new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', '  ');
      }).toThrow('Investment accounts must have a stock symbol');
    });

    it('should reject negative shares', () => {
      expect(() => {
        new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, -5);
      }).toThrow('Shares cannot be negative');
    });

    it('should reject negative investment amount', () => {
      expect(() => {
        new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', -10000, 5);
      }).toThrow('Investment amount cannot be negative');
    });

    it('should reject negative display order', () => {
      expect(() => {
        new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal', undefined, undefined, undefined, -1);
      }).toThrow('Display order cannot be negative');
    });
  });

  describe('Balance Management', () => {
    it('should allow reading balance', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 1000);
      expect(account.balance).toBe(1000);
    });

    it('should allow updating balance', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      account.updateBalance(5000);
      expect(account.balance).toBe(5000);
    });
  });

  describe('Account Updates', () => {
    it('should update account name', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      account.update('New Name');
      expect(account.name).toBe('New Name');
    });

    it('should update account color', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      account.update(undefined, '#10b981');
      expect(account.color).toBe('#10b981');
    });

    it('should update account currency', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      account.update(undefined, undefined, 'EUR');
      expect(account.currency).toBe('EUR');
    });

    it('should validate after update', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      expect(() => {
        account.update('', undefined, undefined);
      }).toThrow('Account name cannot be empty');
    });
  });

  describe('Investment Account Methods', () => {
    it('should update investment details', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      account.updateInvestmentDetails(60, 12000);
      expect(account.shares).toBe(60);
      expect(account.montoInvertido).toBe(12000);
    });

    it('should reject updating investment details on normal account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal');
      expect(() => {
        account.updateInvestmentDetails(50, 10000);
      }).toThrow('Cannot update investment details on non-investment account');
    });

    it('should reject negative shares in update', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      expect(() => {
        account.updateInvestmentDetails(-5);
      }).toThrow('Shares cannot be negative');
    });

    it('should reject negative investment amount in update', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      expect(() => {
        account.updateInvestmentDetails(undefined, -1000);
      }).toThrow('Investment amount cannot be negative');
    });

    it('should calculate investment balance from stock price', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      const balance = account.calculateInvestmentBalance(450.25);
      expect(balance).toBe(22512.5); // 50 shares * $450.25
    });

    it('should return zero balance for zero shares', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 0);
      const balance = account.calculateInvestmentBalance(450.25);
      expect(balance).toBe(0);
    });

    it('should return zero balance for undefined shares', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000);
      const balance = account.calculateInvestmentBalance(450.25);
      expect(balance).toBe(0);
    });

    it('should reject calculating investment balance on normal account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal');
      expect(() => {
        account.calculateInvestmentBalance(450.25);
      }).toThrow('Cannot calculate investment balance for non-investment account');
    });

    it('should reject negative stock price in calculation', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      expect(() => {
        account.calculateInvestmentBalance(-10);
      }).toThrow('Stock price cannot be negative');
    });

    it('should update balance from stock price', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      account.updateBalanceFromStockPrice(450.25);
      expect(account.balance).toBe(22512.5);
    });

    it('should handle zero stock price', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO', 10000, 50);
      const balance = account.calculateInvestmentBalance(0);
      expect(balance).toBe(0);
    });
  });

  describe('Type Checking', () => {
    it('should identify investment account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'investment', 'VOO');
      expect(account.isInvestment()).toBe(true);
      expect(account.isNormal()).toBe(false);
    });

    it('should identify normal account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0, 'normal');
      expect(account.isInvestment()).toBe(false);
      expect(account.isNormal()).toBe(true);
    });
  });

  describe('Display Order', () => {
    it('should update display order', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      account.updateDisplayOrder(5);
      expect(account.displayOrder).toBe(5);
    });

    it('should reject negative display order', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      expect(() => {
        account.updateDisplayOrder(-1);
      }).toThrow('Display order cannot be negative');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 1000, 'normal', undefined, undefined, undefined, 1);
      const json = account.toJSON();

      expect(json).toEqual({
        id: 'id',
        name: 'Test',
        color: '#3b82f6',
        currency: 'USD',
        balance: 1000,
        type: 'normal',
        stockSymbol: undefined,
        montoInvertido: undefined,
        shares: undefined,
        displayOrder: 1,
        archivedAt: null,
      });
    });
  });

  describe('Archive', () => {
    it('should default archivedAt to null', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      expect(account.archivedAt).toBeNull();
      expect(account.isArchived()).toBe(false);
    });

    it('should accept archivedAt in constructor', () => {
      const archivedDate = new Date('2025-01-15T00:00:00Z');
      // Account constructor has 20 positional params; archivedAt is the 20th.
      // Build args by name to defend against silent reordering of middle params.
      const args: unknown[] = [];
      args[0] = 'id';                  // id
      args[1] = 'Test';                // name
      args[2] = '#3b82f6';             // color
      args[3] = 'USD';                 // currency
      args[4] = 0;                     // balance
      args[5] = 'normal';              // type
      // args[6..18] left undefined: stockSymbol, montoInvertido, shares,
      // displayOrder, investmentType, principal, interestRate, termMonths,
      // maturityDate, compoundingFrequency, earlyWithdrawalPenalty,
      // withholdingTaxRate, cdCreatedAt
      args[19] = archivedDate;         // archivedAt (20th param)
      const account = new (Account as unknown as new (...a: unknown[]) => Account)(...args);
      expect(account.archivedAt).toBe(archivedDate);
      expect(account.isArchived()).toBe(true);
    });

    it('should accept explicit null archivedAt in constructor', () => {
      const args: unknown[] = [];
      args[0] = 'id';
      args[1] = 'Test';
      args[2] = '#3b82f6';
      args[3] = 'USD';
      args[4] = 0;
      args[5] = 'normal';
      args[19] = null;                 // archivedAt
      const account = new (Account as unknown as new (...a: unknown[]) => Account)(...args);
      expect(account.archivedAt).toBeNull();
      expect(account.isArchived()).toBe(false);
    });

    it('should archive an active account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      expect(account.isArchived()).toBe(false);

      account.archive();

      expect(account.isArchived()).toBe(true);
      expect(account.archivedAt).toBeInstanceOf(Date);
    });

    it('should unarchive an archived account', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      account.archive();
      expect(account.isArchived()).toBe(true);

      account.unarchive();

      expect(account.isArchived()).toBe(false);
      expect(account.archivedAt).toBeNull();
    });

    it('should serialize archivedAt in JSON when archived', () => {
      const account = new Account('id', 'Test', '#3b82f6', 'USD', 0);
      account.archive();

      const json = account.toJSON();

      expect(json.archivedAt).toBeInstanceOf(Date);
    });
  });
});
