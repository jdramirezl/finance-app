/**
 * SubPocket Domain Entity Tests
 * 
 * Tests validation rules and business logic for SubPocket entity
 */

import { SubPocket } from './SubPocket';

describe('SubPocket Entity', () => {
  describe('Validation', () => {
    it('should create a valid sub-pocket', () => {
      const subPocket = new SubPocket(
        'sub-1',
        'pocket-1',
        'Netflix',
        120,
        12,
        0,
        true,
        'group-1',
        0
      );

      expect(subPocket.id).toBe('sub-1');
      expect(subPocket.pocketId).toBe('pocket-1');
      expect(subPocket.name).toBe('Netflix');
      expect(subPocket.valueTotal).toBe(120);
      expect(subPocket.periodicityMonths).toBe(12);
      expect(subPocket.balance).toBe(0);
      expect(subPocket.enabled).toBe(true);
      expect(subPocket.groupId).toBe('group-1');
      expect(subPocket.displayOrder).toBe(0);
    });

    it('should create sub-pocket with default enabled=true', () => {
      const subPocket = new SubPocket(
        'sub-1',
        'pocket-1',
        'Netflix',
        120,
        12,
        0
      );

      expect(subPocket.enabled).toBe(true);
    });

    it('should throw error if name is empty', () => {
      expect(() => new SubPocket('sub-1', 'pocket-1', '', 120, 12, 0))
        .toThrow('SubPocket name cannot be empty');
    });

    it('should throw error if name is only whitespace', () => {
      expect(() => new SubPocket('sub-1', 'pocket-1', '   ', 120, 12, 0))
        .toThrow('SubPocket name cannot be empty');
    });

    it('should throw error if pocketId is empty', () => {
      expect(() => new SubPocket('sub-1', '', 'Netflix', 120, 12, 0))
        .toThrow('SubPocket must belong to a pocket');
    });

    it('should throw error if valueTotal is zero', () => {
      expect(() => new SubPocket('sub-1', 'pocket-1', 'Netflix', 0, 12, 0))
        .toThrow('Value total must be positive');
    });

    it('should throw error if valueTotal is negative', () => {
      expect(() => new SubPocket('sub-1', 'pocket-1', 'Netflix', -100, 12, 0))
        .toThrow('Value total must be positive');
    });

    it('should throw error if periodicityMonths is zero', () => {
      expect(() => new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 0, 0))
        .toThrow('Periodicity months must be positive');
    });

    it('should throw error if periodicityMonths is negative', () => {
      expect(() => new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, -12, 0))
        .toThrow('Periodicity months must be positive');
    });

    it('should throw error if periodicityMonths is not an integer', () => {
      expect(() => new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12.5, 0))
        .toThrow('Periodicity months must be an integer');
    });

    it('should throw error if displayOrder is negative', () => {
      expect(() => new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, true, undefined, -1))
        .toThrow('Display order cannot be negative');
    });
  });

  describe('Monthly Contribution Calculation', () => {
    it('should calculate monthly contribution correctly', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      expect(subPocket.monthlyContribution).toBe(10);
    });

    it('should calculate monthly contribution for 6-month periodicity', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Car Insurance', 600, 6, 0);
      expect(subPocket.monthlyContribution).toBe(100);
    });

    it('should calculate monthly contribution for 1-month periodicity', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Rent', 1000, 1, 0);
      expect(subPocket.monthlyContribution).toBe(1000);
    });

    it('should handle decimal monthly contributions', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Spotify', 100, 12, 0);
      expect(subPocket.monthlyContribution).toBeCloseTo(8.33, 2);
    });
  });

  describe('Balance Management', () => {
    it('should return balance', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 50);
      expect(subPocket.balance).toBe(50);
    });

    it('should update balance', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      subPocket.updateBalance(100);
      expect(subPocket.balance).toBe(100);
    });

    it('should allow negative balance', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      subPocket.updateBalance(-50);
      expect(subPocket.balance).toBe(-50);
    });
  });

  describe('Update Operations', () => {
    it('should update name', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      subPocket.update('Netflix Premium');
      expect(subPocket.name).toBe('Netflix Premium');
    });

    it('should update valueTotal', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      subPocket.update(undefined, 150);
      expect(subPocket.valueTotal).toBe(150);
      expect(subPocket.monthlyContribution).toBe(12.5);
    });

    it('should update periodicityMonths', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      subPocket.update(undefined, undefined, 6);
      expect(subPocket.periodicityMonths).toBe(6);
      expect(subPocket.monthlyContribution).toBe(20);
    });

    it('should update multiple fields at once', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      subPocket.update('Spotify', 100, 10);
      expect(subPocket.name).toBe('Spotify');
      expect(subPocket.valueTotal).toBe(100);
      expect(subPocket.periodicityMonths).toBe(10);
      expect(subPocket.monthlyContribution).toBe(10);
    });

    it('should validate after update', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      expect(() => subPocket.update('', 120, 12))
        .toThrow('SubPocket name cannot be empty');
    });
  });

  describe('Toggle Enabled', () => {
    it('should toggle enabled from true to false', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, true);
      subPocket.toggleEnabled();
      expect(subPocket.enabled).toBe(false);
    });

    it('should toggle enabled from false to true', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, false);
      subPocket.toggleEnabled();
      expect(subPocket.enabled).toBe(true);
    });

    it('should toggle multiple times', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, true);
      subPocket.toggleEnabled();
      expect(subPocket.enabled).toBe(false);
      subPocket.toggleEnabled();
      expect(subPocket.enabled).toBe(true);
      subPocket.toggleEnabled();
      expect(subPocket.enabled).toBe(false);
    });
  });

  describe('Set Enabled', () => {
    it('should set enabled to true', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, false);
      subPocket.setEnabled(true);
      expect(subPocket.enabled).toBe(true);
    });

    it('should set enabled to false', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, true);
      subPocket.setEnabled(false);
      expect(subPocket.enabled).toBe(false);
    });
  });

  describe('Display Order', () => {
    it('should update display order', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      subPocket.updateDisplayOrder(5);
      expect(subPocket.displayOrder).toBe(5);
    });

    it('should throw error if display order is negative', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      expect(() => subPocket.updateDisplayOrder(-1))
        .toThrow('Display order cannot be negative');
    });
  });

  describe('Group Management', () => {
    it('should update groupId', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      subPocket.updateGroupId('group-2');
      expect(subPocket.groupId).toBe('group-2');
    });

    it('should clear groupId', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, true, 'group-1');
      subPocket.updateGroupId(undefined);
      expect(subPocket.groupId).toBeUndefined();
    });

    it('should check if has group', () => {
      const subPocket1 = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, true, 'group-1');
      expect(subPocket1.hasGroup()).toBe(true);

      const subPocket2 = new SubPocket('sub-2', 'pocket-1', 'Spotify', 100, 12, 0);
      expect(subPocket2.hasGroup()).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should check if enabled', () => {
      const subPocket1 = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0, true);
      expect(subPocket1.isEnabled()).toBe(true);

      const subPocket2 = new SubPocket('sub-2', 'pocket-1', 'Spotify', 100, 12, 0, false);
      expect(subPocket2.isEnabled()).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should convert to JSON', () => {
      const subPocket = new SubPocket(
        'sub-1',
        'pocket-1',
        'Netflix',
        120,
        12,
        50,
        true,
        'group-1',
        0
      );

      const json = subPocket.toJSON();

      expect(json).toEqual({
        id: 'sub-1',
        pocketId: 'pocket-1',
        name: 'Netflix',
        valueTotal: 120,
        periodicityMonths: 12,
        balance: 50,
        enabled: true,
        groupId: 'group-1',
        displayOrder: 0,
        monthlyContribution: 10,
      });
    });

    it('should include calculated monthlyContribution in JSON', () => {
      const subPocket = new SubPocket('sub-1', 'pocket-1', 'Netflix', 120, 12, 0);
      const json = subPocket.toJSON();
      expect(json.monthlyContribution).toBe(10);
    });
  });
});
