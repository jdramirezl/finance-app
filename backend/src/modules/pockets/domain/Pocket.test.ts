/**
 * Pocket Entity Tests
 * 
 * Tests domain validation rules and business logic
 */

import { Pocket } from './Pocket';
import type { Currency, PocketType } from '@shared-backend/types';

describe('Pocket Entity', () => {
  describe('Validation', () => {
    it('should create a valid normal pocket', () => {
      const pocket = new Pocket(
        'test-id',
        'account-id',
        'Test Pocket',
        'normal',
        0,
        'USD'
      );

      expect(pocket.id).toBe('test-id');
      expect(pocket.accountId).toBe('account-id');
      expect(pocket.name).toBe('Test Pocket');
      expect(pocket.type).toBe('normal');
      expect(pocket.balance).toBe(0);
      expect(pocket.currency).toBe('USD');
    });

    it('should create a valid fixed pocket', () => {
      const pocket = new Pocket(
        'test-id',
        'account-id',
        'Fixed Expenses',
        'fixed',
        0,
        'USD'
      );

      expect(pocket.type).toBe('fixed');
      expect(pocket.name).toBe('Fixed Expenses');
    });

    it('should reject empty pocket name', () => {
      expect(() => {
        new Pocket('id', 'account-id', '', 'normal', 0, 'USD');
      }).toThrow('Pocket name cannot be empty');
    });

    it('should reject whitespace-only pocket name', () => {
      expect(() => {
        new Pocket('id', 'account-id', '   ', 'normal', 0, 'USD');
      }).toThrow('Pocket name cannot be empty');
    });

    it('should reject invalid pocket type', () => {
      expect(() => {
        new Pocket('id', 'account-id', 'Test', 'invalid' as PocketType, 0, 'USD');
      }).toThrow('Pocket type must be either "normal" or "fixed"');
    });

    it('should reject invalid currency', () => {
      expect(() => {
        new Pocket('id', 'account-id', 'Test', 'normal', 0, 'INVALID' as Currency);
      }).toThrow('Invalid currency');
    });

    it('should reject empty account ID', () => {
      expect(() => {
        new Pocket('id', '', 'Test', 'normal', 0, 'USD');
      }).toThrow('Pocket must belong to an account');
    });

    it('should reject whitespace-only account ID', () => {
      expect(() => {
        new Pocket('id', '   ', 'Test', 'normal', 0, 'USD');
      }).toThrow('Pocket must belong to an account');
    });

    it('should reject negative display order', () => {
      expect(() => {
        new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD', -1);
      }).toThrow('Display order cannot be negative');
    });

    it('should accept zero display order', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD', 0);
      expect(pocket.displayOrder).toBe(0);
    });

    it('should accept positive display order', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD', 5);
      expect(pocket.displayOrder).toBe(5);
    });
  });

  describe('Balance Management', () => {
    it('should allow reading balance', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 1000, 'USD');
      expect(pocket.balance).toBe(1000);
    });

    it('should allow updating balance', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      pocket.updateBalance(5000);
      expect(pocket.balance).toBe(5000);
    });

    it('should allow negative balance', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', -500, 'USD');
      expect(pocket.balance).toBe(-500);
    });

    it('should allow updating to negative balance', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 100, 'USD');
      pocket.updateBalance(-200);
      expect(pocket.balance).toBe(-200);
    });
  });

  describe('Pocket Updates', () => {
    it('should update pocket name', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      pocket.update('New Name');
      expect(pocket.name).toBe('New Name');
    });

    it('should validate after update', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      expect(() => {
        pocket.update('');
      }).toThrow('Pocket name cannot be empty');
    });

    it('should validate whitespace name after update', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      expect(() => {
        pocket.update('   ');
      }).toThrow('Pocket name cannot be empty');
    });
  });

  describe('Type Checking', () => {
    it('should identify fixed pocket', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'fixed', 0, 'USD');
      expect(pocket.isFixed()).toBe(true);
      expect(pocket.isNormal()).toBe(false);
    });

    it('should identify normal pocket', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      expect(pocket.isFixed()).toBe(false);
      expect(pocket.isNormal()).toBe(true);
    });
  });

  describe('Display Order', () => {
    it('should update display order', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      pocket.updateDisplayOrder(5);
      expect(pocket.displayOrder).toBe(5);
    });

    it('should reject negative display order', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      expect(() => {
        pocket.updateDisplayOrder(-1);
      }).toThrow('Display order cannot be negative');
    });

    it('should accept zero display order', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      pocket.updateDisplayOrder(0);
      expect(pocket.displayOrder).toBe(0);
    });
  });

  describe('Account ID Updates', () => {
    it('should update account ID', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      pocket.updateAccountId('new-account-id');
      expect(pocket.accountId).toBe('new-account-id');
    });

    it('should reject empty account ID', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      expect(() => {
        pocket.updateAccountId('');
      }).toThrow('Account ID cannot be empty');
    });

    it('should reject whitespace-only account ID', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      expect(() => {
        pocket.updateAccountId('   ');
      }).toThrow('Account ID cannot be empty');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 1000, 'USD', 1);
      const json = pocket.toJSON();

      expect(json).toEqual({
        id: 'id',
        accountId: 'account-id',
        name: 'Test',
        type: 'normal',
        balance: 1000,
        currency: 'USD',
        displayOrder: 1,
      });
    });

    it('should serialize fixed pocket to JSON', () => {
      const pocket = new Pocket('id', 'account-id', 'Fixed Expenses', 'fixed', -500, 'MXN', 0);
      const json = pocket.toJSON();

      expect(json).toEqual({
        id: 'id',
        accountId: 'account-id',
        name: 'Fixed Expenses',
        type: 'fixed',
        balance: -500,
        currency: 'MXN',
        displayOrder: 0,
      });
    });

    it('should serialize pocket without display order', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      const json = pocket.toJSON();

      expect(json.displayOrder).toBeUndefined();
    });
  });

  describe('Currency Support', () => {
    it('should support USD currency', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'USD');
      expect(pocket.currency).toBe('USD');
    });

    it('should support MXN currency', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'MXN');
      expect(pocket.currency).toBe('MXN');
    });

    it('should support COP currency', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'COP');
      expect(pocket.currency).toBe('COP');
    });

    it('should support EUR currency', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'EUR');
      expect(pocket.currency).toBe('EUR');
    });

    it('should support GBP currency', () => {
      const pocket = new Pocket('id', 'account-id', 'Test', 'normal', 0, 'GBP');
      expect(pocket.currency).toBe('GBP');
    });
  });
});
