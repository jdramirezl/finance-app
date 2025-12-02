/**
 * PocketMapper Tests
 * 
 * Tests data transformation between domain, persistence, and DTO layers.
 */

import { PocketMapper } from './PocketMapper';
import { Pocket } from '../../domain/Pocket';
import type { Currency, PocketType } from '@shared-backend/types';

describe('PocketMapper', () => {
  const userId = 'test-user-123';
  const accountId = 'test-account-456';

  describe('toPersistence', () => {
    it('should map normal pocket to database format', () => {
      const pocket = new Pocket(
        'pocket-1',
        accountId,
        'Groceries',
        'normal',
        500.50,
        'USD',
        0
      );

      const persistence = PocketMapper.toPersistence(pocket, userId);

      expect(persistence).toEqual({
        id: 'pocket-1',
        user_id: userId,
        account_id: accountId,
        name: 'Groceries',
        type: 'normal',
        balance: 500.50,
        currency: 'USD',
        display_order: 0,
      });
    });

    it('should map fixed pocket to database format', () => {
      const pocket = new Pocket(
        'pocket-2',
        accountId,
        'Fixed Expenses',
        'fixed',
        -150.00,
        'MXN',
        1
      );

      const persistence = PocketMapper.toPersistence(pocket, userId);

      expect(persistence).toEqual({
        id: 'pocket-2',
        user_id: userId,
        account_id: accountId,
        name: 'Fixed Expenses',
        type: 'fixed',
        balance: -150.00,
        currency: 'MXN',
        display_order: 1,
      });
    });

    it('should handle undefined optional fields', () => {
      const pocket = new Pocket(
        'pocket-3',
        accountId,
        'Savings',
        'normal',
        1000.00,
        'EUR'
      );

      const persistence = PocketMapper.toPersistence(pocket, userId);

      expect(persistence.display_order).toBeNull();
    });

    it('should handle all supported currencies', () => {
      const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

      currencies.forEach((currency, index) => {
        const pocket = new Pocket(
          `pocket-${index}`,
          accountId,
          `Pocket ${currency}`,
          'normal',
          100.00,
          currency
        );

        const persistence = PocketMapper.toPersistence(pocket, userId);
        expect(persistence.currency).toBe(currency);
      });
    });

    it('should handle both pocket types', () => {
      const types: PocketType[] = ['normal', 'fixed'];

      types.forEach((type, index) => {
        const pocket = new Pocket(
          `pocket-${index}`,
          accountId,
          `Pocket ${type}`,
          type,
          100.00,
          'USD'
        );

        const persistence = PocketMapper.toPersistence(pocket, userId);
        expect(persistence.type).toBe(type);
      });
    });

    it('should handle negative balances', () => {
      const pocket = new Pocket(
        'pocket-4',
        accountId,
        'Debt Pocket',
        'normal',
        -250.75,
        'USD',
        2
      );

      const persistence = PocketMapper.toPersistence(pocket, userId);
      expect(persistence.balance).toBe(-250.75);
    });
  });

  describe('toDomain', () => {
    it('should map database row to normal pocket entity', () => {
      const row = {
        id: 'pocket-1',
        user_id: userId,
        account_id: accountId,
        name: 'Entertainment',
        type: 'normal',
        balance: 300.00,
        currency: 'USD',
        display_order: 3,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const pocket = PocketMapper.toDomain(row);

      expect(pocket).toBeInstanceOf(Pocket);
      expect(pocket.id).toBe('pocket-1');
      expect(pocket.accountId).toBe(accountId);
      expect(pocket.name).toBe('Entertainment');
      expect(pocket.type).toBe('normal');
      expect(pocket.balance).toBe(300.00);
      expect(pocket.currency).toBe('USD');
      expect(pocket.displayOrder).toBe(3);
    });

    it('should map database row to fixed pocket entity', () => {
      const row = {
        id: 'pocket-2',
        user_id: userId,
        account_id: accountId,
        name: 'Fixed Expenses',
        type: 'fixed',
        balance: -500.00,
        currency: 'EUR',
        display_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const pocket = PocketMapper.toDomain(row);

      expect(pocket).toBeInstanceOf(Pocket);
      expect(pocket.type).toBe('fixed');
      expect(pocket.isFixed()).toBe(true);
      expect(pocket.balance).toBe(-500.00);
    });

    it('should handle null values from database', () => {
      const row = {
        id: 'pocket-3',
        user_id: userId,
        account_id: accountId,
        name: 'Basic Pocket',
        type: 'normal',
        balance: 0,
        currency: 'GBP',
        display_order: null,
      };

      const pocket = PocketMapper.toDomain(row);

      expect(pocket.displayOrder).toBeUndefined();
    });

    it('should create valid domain entity that passes validation', () => {
      const row = {
        id: 'pocket-4',
        user_id: userId,
        account_id: accountId,
        name: 'Valid Pocket',
        type: 'normal',
        balance: 1000.00,
        currency: 'COP',
        display_order: 5,
      };

      // Should not throw validation error
      expect(() => PocketMapper.toDomain(row)).not.toThrow();
    });

    it('should handle all supported currencies', () => {
      const currencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

      currencies.forEach((currency) => {
        const row = {
          id: 'pocket-test',
          user_id: userId,
          account_id: accountId,
          name: 'Test Pocket',
          type: 'normal',
          balance: 100.00,
          currency: currency,
          display_order: 0,
        };

        const pocket = PocketMapper.toDomain(row);
        expect(pocket.currency).toBe(currency);
      });
    });
  });

  describe('toDTO', () => {
    it('should map normal pocket to response DTO', () => {
      const pocket = new Pocket(
        'pocket-1',
        accountId,
        'Transportation',
        'normal',
        200.00,
        'USD',
        2
      );

      const dto = PocketMapper.toDTO(pocket);

      expect(dto).toEqual({
        id: 'pocket-1',
        accountId: accountId,
        name: 'Transportation',
        type: 'normal',
        balance: 200.00,
        currency: 'USD',
        displayOrder: 2,
      });
    });

    it('should map fixed pocket to response DTO', () => {
      const pocket = new Pocket(
        'pocket-2',
        accountId,
        'Fixed Expenses',
        'fixed',
        -300.00,
        'MXN',
        0
      );

      const dto = PocketMapper.toDTO(pocket);

      expect(dto).toEqual({
        id: 'pocket-2',
        accountId: accountId,
        name: 'Fixed Expenses',
        type: 'fixed',
        balance: -300.00,
        currency: 'MXN',
        displayOrder: 0,
      });
    });

    it('should preserve all pocket properties in DTO', () => {
      const pocket = new Pocket(
        'pocket-3',
        accountId,
        'Complete Pocket',
        'normal',
        1500.00,
        'EUR',
        7
      );

      const dto = PocketMapper.toDTO(pocket);

      // Verify all properties are present
      expect(dto).toHaveProperty('id');
      expect(dto).toHaveProperty('accountId');
      expect(dto).toHaveProperty('name');
      expect(dto).toHaveProperty('type');
      expect(dto).toHaveProperty('balance');
      expect(dto).toHaveProperty('currency');
      expect(dto).toHaveProperty('displayOrder');
    });

    it('should handle undefined displayOrder', () => {
      const pocket = new Pocket(
        'pocket-4',
        accountId,
        'No Order Pocket',
        'normal',
        100.00,
        'USD'
      );

      const dto = PocketMapper.toDTO(pocket);

      expect(dto.displayOrder).toBeUndefined();
    });
  });

  describe('toDTOArray', () => {
    it('should map array of pockets to array of DTOs', () => {
      const pockets = [
        new Pocket('pocket-1', accountId, 'Pocket 1', 'normal', 100.00, 'USD'),
        new Pocket('pocket-2', accountId, 'Pocket 2', 'normal', 200.00, 'EUR'),
        new Pocket('pocket-3', accountId, 'Pocket 3', 'fixed', 300.00, 'GBP'),
      ];

      const dtos = PocketMapper.toDTOArray(pockets);

      expect(dtos).toHaveLength(3);
      expect(dtos[0].id).toBe('pocket-1');
      expect(dtos[1].id).toBe('pocket-2');
      expect(dtos[2].id).toBe('pocket-3');
      expect(dtos[0].type).toBe('normal');
      expect(dtos[2].type).toBe('fixed');
    });

    it('should handle empty array', () => {
      const dtos = PocketMapper.toDTOArray([]);
      expect(dtos).toEqual([]);
    });

    it('should preserve order of pockets', () => {
      const pockets = [
        new Pocket('pocket-1', accountId, 'First', 'normal', 100.00, 'USD', 0),
        new Pocket('pocket-2', accountId, 'Second', 'normal', 200.00, 'USD', 1),
        new Pocket('pocket-3', accountId, 'Third', 'normal', 300.00, 'USD', 2),
      ];

      const dtos = PocketMapper.toDTOArray(pockets);

      expect(dtos[0].displayOrder).toBe(0);
      expect(dtos[1].displayOrder).toBe(1);
      expect(dtos[2].displayOrder).toBe(2);
    });
  });

  describe('toDomainArray', () => {
    it('should map array of database rows to array of domain entities', () => {
      const rows = [
        {
          id: 'pocket-1',
          user_id: userId,
          account_id: accountId,
          name: 'Pocket 1',
          type: 'normal',
          balance: 100.00,
          currency: 'USD',
          display_order: 0,
        },
        {
          id: 'pocket-2',
          user_id: userId,
          account_id: accountId,
          name: 'Pocket 2',
          type: 'fixed',
          balance: 200.00,
          currency: 'EUR',
          display_order: 1,
        },
      ];

      const pockets = PocketMapper.toDomainArray(rows);

      expect(pockets).toHaveLength(2);
      expect(pockets[0]).toBeInstanceOf(Pocket);
      expect(pockets[1]).toBeInstanceOf(Pocket);
      expect(pockets[0].id).toBe('pocket-1');
      expect(pockets[1].id).toBe('pocket-2');
      expect(pockets[0].type).toBe('normal');
      expect(pockets[1].type).toBe('fixed');
    });

    it('should handle empty array', () => {
      const pockets = PocketMapper.toDomainArray([]);
      expect(pockets).toEqual([]);
    });

    it('should create valid domain entities', () => {
      const rows = [
        {
          id: 'pocket-1',
          user_id: userId,
          account_id: accountId,
          name: 'Valid Pocket',
          type: 'normal',
          balance: 500.00,
          currency: 'MXN',
          display_order: 3,
        },
      ];

      // Should not throw validation errors
      expect(() => PocketMapper.toDomainArray(rows)).not.toThrow();
    });
  });

  describe('Round-trip transformations', () => {
    it('should preserve data through domain → persistence → domain', () => {
      const original = new Pocket(
        'pocket-1',
        accountId,
        'Test Pocket',
        'normal',
        1500.00,
        'USD',
        2
      );

      const persistence = PocketMapper.toPersistence(original, userId);
      const restored = PocketMapper.toDomain(persistence);

      expect(restored.id).toBe(original.id);
      expect(restored.accountId).toBe(original.accountId);
      expect(restored.name).toBe(original.name);
      expect(restored.type).toBe(original.type);
      expect(restored.balance).toBe(original.balance);
      expect(restored.currency).toBe(original.currency);
      expect(restored.displayOrder).toBe(original.displayOrder);
    });

    it('should preserve data through domain → DTO → comparison', () => {
      const pocket = new Pocket(
        'pocket-2',
        accountId,
        'Another Pocket',
        'fixed',
        -250.00,
        'EUR',
        1
      );

      const dto = PocketMapper.toDTO(pocket);

      expect(dto.id).toBe(pocket.id);
      expect(dto.accountId).toBe(pocket.accountId);
      expect(dto.name).toBe(pocket.name);
      expect(dto.type).toBe(pocket.type);
      expect(dto.balance).toBe(pocket.balance);
      expect(dto.currency).toBe(pocket.currency);
      expect(dto.displayOrder).toBe(pocket.displayOrder);
    });

    it('should handle round-trip with undefined displayOrder', () => {
      const original = new Pocket(
        'pocket-3',
        accountId,
        'No Order',
        'normal',
        100.00,
        'GBP'
      );

      const persistence = PocketMapper.toPersistence(original, userId);
      const restored = PocketMapper.toDomain(persistence);

      expect(restored.displayOrder).toBeUndefined();
      expect(original.displayOrder).toBeUndefined();
    });

    it('should preserve negative balances through round-trip', () => {
      const original = new Pocket(
        'pocket-4',
        accountId,
        'Debt',
        'fixed',
        -1000.50,
        'COP',
        5
      );

      const persistence = PocketMapper.toPersistence(original, userId);
      const restored = PocketMapper.toDomain(persistence);

      expect(restored.balance).toBe(original.balance);
      expect(restored.balance).toBe(-1000.50);
    });
  });
});
