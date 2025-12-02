/**
 * Movement Entity Unit Tests
 */

import { Movement } from './Movement';
import type { Currency, MovementType } from '@shared-backend/types';

describe('Movement Entity', () => {
  const validMovementData = {
    id: 'mov-1',
    type: 'IngresoNormal' as MovementType,
    accountId: 'acc-1',
    pocketId: 'pocket-1',
    amount: 100,
    displayedDate: new Date('2024-01-15'),
  };

  describe('Constructor and Validation', () => {
    it('should create a valid movement', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );

      expect(movement.id).toBe(validMovementData.id);
      expect(movement.type).toBe(validMovementData.type);
      expect(movement.amount).toBe(validMovementData.amount);
      expect(movement.isPending).toBe(false);
      expect(movement.isOrphaned).toBe(false);
    });

    it('should throw error for non-positive amount', () => {
      expect(() => new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        0,
        validMovementData.displayedDate
      )).toThrow('Movement amount must be positive');

      expect(() => new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        -50,
        validMovementData.displayedDate
      )).toThrow('Movement amount must be positive');
    });

    it('should throw error for invalid type', () => {
      expect(() => new Movement(
        validMovementData.id,
        'InvalidType' as MovementType,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      )).toThrow('Invalid movement type');
    });

    it('should throw error for empty accountId', () => {
      expect(() => new Movement(
        validMovementData.id,
        validMovementData.type,
        '',
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      )).toThrow('Movement must belong to an account');
    });

    it('should throw error for empty pocketId', () => {
      expect(() => new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        '',
        validMovementData.amount,
        validMovementData.displayedDate
      )).toThrow('Movement must belong to a pocket');
    });

    it('should throw error for invalid date', () => {
      expect(() => new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        new Date('invalid')
      )).toThrow('Movement must have a valid displayed date');
    });

    it('should throw error for orphaned movement without orphaned data', () => {
      expect(() => new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate,
        undefined,
        undefined,
        false,
        true // isOrphaned = true
      )).toThrow('Orphaned movements must have orphaned account name');
    });
  });

  describe('isIncome', () => {
    it('should return true for IngresoNormal', () => {
      const movement = new Movement(
        validMovementData.id,
        'IngresoNormal',
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );
      expect(movement.isIncome()).toBe(true);
    });

    it('should return true for IngresoFijo', () => {
      const movement = new Movement(
        validMovementData.id,
        'IngresoFijo',
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );
      expect(movement.isIncome()).toBe(true);
    });

    it('should return false for expense types', () => {
      const movement = new Movement(
        validMovementData.id,
        'EgresoNormal',
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );
      expect(movement.isIncome()).toBe(false);
    });
  });

  describe('isExpense', () => {
    it('should return true for EgresoNormal', () => {
      const movement = new Movement(
        validMovementData.id,
        'EgresoNormal',
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );
      expect(movement.isExpense()).toBe(true);
    });

    it('should return true for EgresoFijo', () => {
      const movement = new Movement(
        validMovementData.id,
        'EgresoFijo',
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );
      expect(movement.isExpense()).toBe(true);
    });

    it('should return false for income types', () => {
      const movement = new Movement(
        validMovementData.id,
        'IngresoNormal',
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );
      expect(movement.isExpense()).toBe(false);
    });
  });

  describe('getSignedAmount', () => {
    it('should return positive amount for income', () => {
      const movement = new Movement(
        validMovementData.id,
        'IngresoNormal',
        validMovementData.accountId,
        validMovementData.pocketId,
        100,
        validMovementData.displayedDate
      );
      expect(movement.getSignedAmount()).toBe(100);
    });

    it('should return negative amount for expense', () => {
      const movement = new Movement(
        validMovementData.id,
        'EgresoNormal',
        validMovementData.accountId,
        validMovementData.pocketId,
        100,
        validMovementData.displayedDate
      );
      expect(movement.getSignedAmount()).toBe(-100);
    });
  });

  describe('update', () => {
    it('should update movement details', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );

      const newDate = new Date('2024-02-15');
      movement.update('EgresoNormal', 200, newDate, 'Updated notes', 'sub-1');

      expect(movement.type).toBe('EgresoNormal');
      expect(movement.amount).toBe(200);
      expect(movement.displayedDate).toBe(newDate);
      expect(movement.notes).toBe('Updated notes');
      expect(movement.subPocketId).toBe('sub-1');
    });

    it('should validate after update', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );

      expect(() => movement.update(undefined, -50)).toThrow('Movement amount must be positive');
    });
  });

  describe('markAsPending and applyPending', () => {
    it('should mark movement as pending', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );

      expect(movement.isPending).toBe(false);
      movement.markAsPending();
      expect(movement.isPending).toBe(true);
    });

    it('should apply pending movement', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate,
        undefined,
        undefined,
        true // isPending
      );

      expect(movement.isPending).toBe(true);
      movement.applyPending();
      expect(movement.isPending).toBe(false);
    });
  });

  describe('markAsOrphaned and restoreFromOrphaned', () => {
    it('should mark movement as orphaned', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );

      movement.markAsOrphaned('Test Account', 'USD', 'Test Pocket');

      expect(movement.isOrphaned).toBe(true);
      expect(movement.orphanedAccountName).toBe('Test Account');
      expect(movement.orphanedAccountCurrency).toBe('USD');
      expect(movement.orphanedPocketName).toBe('Test Pocket');
    });

    it('should restore orphaned movement', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );

      movement.markAsOrphaned('Test Account', 'USD', 'Test Pocket');
      movement.restoreFromOrphaned('new-acc-1', 'new-pocket-1', 'new-sub-1');

      expect(movement.isOrphaned).toBe(false);
      expect(movement.accountId).toBe('new-acc-1');
      expect(movement.pocketId).toBe('new-pocket-1');
      expect(movement.subPocketId).toBe('new-sub-1');
      expect(movement.orphanedAccountName).toBeUndefined();
      expect(movement.orphanedAccountCurrency).toBeUndefined();
      expect(movement.orphanedPocketName).toBeUndefined();
    });
  });

  describe('updateAccountId', () => {
    it('should update account ID', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );

      movement.updateAccountId('new-acc-1');
      expect(movement.accountId).toBe('new-acc-1');
    });

    it('should throw error for empty account ID', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate
      );

      expect(() => movement.updateAccountId('')).toThrow('Account ID cannot be empty');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const movement = new Movement(
        validMovementData.id,
        validMovementData.type,
        validMovementData.accountId,
        validMovementData.pocketId,
        validMovementData.amount,
        validMovementData.displayedDate,
        'Test notes',
        'sub-1'
      );

      const json = movement.toJSON();

      expect(json.id).toBe(validMovementData.id);
      expect(json.type).toBe(validMovementData.type);
      expect(json.amount).toBe(validMovementData.amount);
      expect(json.notes).toBe('Test notes');
      expect(json.subPocketId).toBe('sub-1');
      expect(json.displayedDate).toBe(validMovementData.displayedDate.toISOString());
    });
  });
});
