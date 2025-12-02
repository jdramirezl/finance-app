/**
 * AccountMapper Tests
 * 
 * Tests data transformation between domain, persistence, and DTO layers.
 */

import { AccountMapper } from './AccountMapper';
import { Account } from '../../domain/Account';
import type { Currency } from '@shared-backend/types';

describe('AccountMapper', () => {
  const userId = 'test-user-123';

  describe('toPersistence', () => {
    it('should map normal account to database format', () => {
      const account = new Account(
        'acc-1',
        'Checking Account',
        '#3b82f6',
        'USD',
        1000.50,
        'normal',
        undefined,
        undefined,
        undefined,
        0
      );

      const persistence = AccountMapper.toPersistence(account, userId);

      expect(persistence).toEqual({
        id: 'acc-1',
        user_id: userId,
        name: 'Checking Account',
        color: '#3b82f6',
        currency: 'USD',
        balance: 1000.50,
        type: 'normal',
        stock_symbol: null,
        monto_invertido: null,
        shares: null,
        display_order: 0,
      });
    });

    it('should map investment account to database format', () => {
      const account = new Account(
        'acc-2',
        'VOO Investment',
        '#10b981',
        'USD',
        5000.00,
        'investment',
        'VOO',
        4500.00,
        10.5,
        1
      );

      const persistence = AccountMapper.toPersistence(account, userId);

      expect(persistence).toEqual({
        id: 'acc-2',
        user_id: userId,
        name: 'VOO Investment',
        color: '#10b981',
        currency: 'USD',
        balance: 5000.00,
        type: 'investment',
        stock_symbol: 'VOO',
        monto_invertido: 4500.00,
        shares: 10.5,
        display_order: 1,
      });
    });

    it('should handle undefined optional fields', () => {
      const account = new Account(
        'acc-3',
        'Cash',
        '#ef4444',
        'MXN',
        500.00
      );

      const persistence = AccountMapper.toPersistence(account, userId);

      expect(persistence.stock_symbol).toBeNull();
      expect(persistence.monto_invertido).toBeNull();
      expect(persistence.shares).toBeNull();
      expect(persistence.display_order).toBeNull();
    });

    it('should handle all supported currencies', () => {
      const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

      currencies.forEach((currency, index) => {
        const account = new Account(
          `acc-${index}`,
          `Account ${currency}`,
          '#3b82f6',
          currency,
          100.00
        );

        const persistence = AccountMapper.toPersistence(account, userId);
        expect(persistence.currency).toBe(currency);
      });
    });
  });

  describe('toDomain', () => {
    it('should map database row to normal account entity', () => {
      const row = {
        id: 'acc-1',
        user_id: userId,
        name: 'Savings Account',
        color: '#8b5cf6',
        currency: 'EUR',
        balance: 2500.75,
        type: 'normal',
        stock_symbol: null,
        monto_invertido: null,
        shares: null,
        display_order: 2,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const account = AccountMapper.toDomain(row);

      expect(account).toBeInstanceOf(Account);
      expect(account.id).toBe('acc-1');
      expect(account.name).toBe('Savings Account');
      expect(account.color).toBe('#8b5cf6');
      expect(account.currency).toBe('EUR');
      expect(account.balance).toBe(2500.75);
      expect(account.type).toBe('normal');
      expect(account.stockSymbol).toBeUndefined();
      expect(account.montoInvertido).toBeUndefined();
      expect(account.shares).toBeUndefined();
      expect(account.displayOrder).toBe(2);
    });

    it('should map database row to investment account entity', () => {
      const row = {
        id: 'acc-2',
        user_id: userId,
        name: 'Stock Portfolio',
        color: '#f59e0b',
        currency: 'USD',
        balance: 10000.00,
        type: 'investment',
        stock_symbol: 'SPY',
        monto_invertido: 9500.00,
        shares: 25.5,
        display_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const account = AccountMapper.toDomain(row);

      expect(account).toBeInstanceOf(Account);
      expect(account.type).toBe('investment');
      expect(account.stockSymbol).toBe('SPY');
      expect(account.montoInvertido).toBe(9500.00);
      expect(account.shares).toBe(25.5);
    });

    it('should handle null values from database', () => {
      const row = {
        id: 'acc-3',
        user_id: userId,
        name: 'Basic Account',
        color: '#6366f1',
        currency: 'GBP',
        balance: 0,
        type: 'normal',
        stock_symbol: null,
        monto_invertido: null,
        shares: null,
        display_order: null,
      };

      const account = AccountMapper.toDomain(row);

      expect(account.stockSymbol).toBeUndefined();
      expect(account.montoInvertido).toBeUndefined();
      expect(account.shares).toBeUndefined();
      expect(account.displayOrder).toBeUndefined();
    });

    it('should create valid domain entity that passes validation', () => {
      const row = {
        id: 'acc-4',
        user_id: userId,
        name: 'Valid Account',
        color: '#ec4899',
        currency: 'COP',
        balance: 1000000.00,
        type: 'normal',
        stock_symbol: null,
        monto_invertido: null,
        shares: null,
        display_order: 5,
      };

      // Should not throw validation error
      expect(() => AccountMapper.toDomain(row)).not.toThrow();
    });
  });

  describe('toDTO', () => {
    it('should map normal account to response DTO', () => {
      const account = new Account(
        'acc-1',
        'Credit Card',
        '#ef4444',
        'USD',
        -500.00,
        'normal',
        undefined,
        undefined,
        undefined,
        3
      );

      const dto = AccountMapper.toDTO(account);

      expect(dto).toEqual({
        id: 'acc-1',
        name: 'Credit Card',
        color: '#ef4444',
        currency: 'USD',
        balance: -500.00,
        type: 'normal',
        stockSymbol: undefined,
        montoInvertido: undefined,
        shares: undefined,
        displayOrder: 3,
      });
    });

    it('should map investment account to response DTO', () => {
      const account = new Account(
        'acc-2',
        'Index Fund',
        '#14b8a6',
        'USD',
        15000.00,
        'investment',
        'VTI',
        14000.00,
        50.25,
        0
      );

      const dto = AccountMapper.toDTO(account);

      expect(dto).toEqual({
        id: 'acc-2',
        name: 'Index Fund',
        color: '#14b8a6',
        currency: 'USD',
        balance: 15000.00,
        type: 'investment',
        stockSymbol: 'VTI',
        montoInvertido: 14000.00,
        shares: 50.25,
        displayOrder: 0,
      });
    });

    it('should preserve all account properties in DTO', () => {
      const account = new Account(
        'acc-3',
        'Complete Account',
        '#a855f7',
        'EUR',
        3000.00,
        'investment',
        'AAPL',
        2800.00,
        15.0,
        7
      );

      const dto = AccountMapper.toDTO(account);

      // Verify all properties are present
      expect(dto).toHaveProperty('id');
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('color');
      expect(dto).toHaveProperty('currency');
      expect(dto).toHaveProperty('balance');
      expect(dto).toHaveProperty('type');
      expect(dto).toHaveProperty('stockSymbol');
      expect(dto).toHaveProperty('montoInvertido');
      expect(dto).toHaveProperty('shares');
      expect(dto).toHaveProperty('displayOrder');
    });
  });

  describe('toDTOArray', () => {
    it('should map array of accounts to array of DTOs', () => {
      const accounts = [
        new Account('acc-1', 'Account 1', '#3b82f6', 'USD', 100.00),
        new Account('acc-2', 'Account 2', '#10b981', 'EUR', 200.00),
        new Account('acc-3', 'Account 3', '#ef4444', 'GBP', 300.00),
      ];

      const dtos = AccountMapper.toDTOArray(accounts);

      expect(dtos).toHaveLength(3);
      expect(dtos[0].id).toBe('acc-1');
      expect(dtos[1].id).toBe('acc-2');
      expect(dtos[2].id).toBe('acc-3');
    });

    it('should handle empty array', () => {
      const dtos = AccountMapper.toDTOArray([]);
      expect(dtos).toEqual([]);
    });
  });

  describe('toDomainArray', () => {
    it('should map array of database rows to array of domain entities', () => {
      const rows = [
        {
          id: 'acc-1',
          user_id: userId,
          name: 'Account 1',
          color: '#3b82f6',
          currency: 'USD',
          balance: 100.00,
          type: 'normal',
          stock_symbol: null,
          monto_invertido: null,
          shares: null,
          display_order: 0,
        },
        {
          id: 'acc-2',
          user_id: userId,
          name: 'Account 2',
          color: '#10b981',
          currency: 'EUR',
          balance: 200.00,
          type: 'normal',
          stock_symbol: null,
          monto_invertido: null,
          shares: null,
          display_order: 1,
        },
      ];

      const accounts = AccountMapper.toDomainArray(rows);

      expect(accounts).toHaveLength(2);
      expect(accounts[0]).toBeInstanceOf(Account);
      expect(accounts[1]).toBeInstanceOf(Account);
      expect(accounts[0].id).toBe('acc-1');
      expect(accounts[1].id).toBe('acc-2');
    });

    it('should handle empty array', () => {
      const accounts = AccountMapper.toDomainArray([]);
      expect(accounts).toEqual([]);
    });
  });

  describe('Round-trip transformations', () => {
    it('should preserve data through domain → persistence → domain', () => {
      const original = new Account(
        'acc-1',
        'Test Account',
        '#3b82f6',
        'USD',
        1500.00,
        'investment',
        'MSFT',
        1400.00,
        5.0,
        2
      );

      const persistence = AccountMapper.toPersistence(original, userId);
      const restored = AccountMapper.toDomain(persistence);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.color).toBe(original.color);
      expect(restored.currency).toBe(original.currency);
      expect(restored.balance).toBe(original.balance);
      expect(restored.type).toBe(original.type);
      expect(restored.stockSymbol).toBe(original.stockSymbol);
      expect(restored.montoInvertido).toBe(original.montoInvertido);
      expect(restored.shares).toBe(original.shares);
      expect(restored.displayOrder).toBe(original.displayOrder);
    });

    it('should preserve data through domain → DTO → comparison', () => {
      const account = new Account(
        'acc-2',
        'Another Account',
        '#10b981',
        'EUR',
        2500.00,
        'normal',
        undefined,
        undefined,
        undefined,
        1
      );

      const dto = AccountMapper.toDTO(account);

      expect(dto.id).toBe(account.id);
      expect(dto.name).toBe(account.name);
      expect(dto.color).toBe(account.color);
      expect(dto.currency).toBe(account.currency);
      expect(dto.balance).toBe(account.balance);
      expect(dto.type).toBe(account.type);
      expect(dto.displayOrder).toBe(account.displayOrder);
    });
  });
});
