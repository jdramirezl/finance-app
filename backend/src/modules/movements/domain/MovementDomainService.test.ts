/**
 * MovementDomainService Unit Tests
 */

import { MovementDomainService } from './MovementDomainService';
import { Movement } from './Movement';
import type { MovementType } from '@shared-backend/types';

describe('MovementDomainService', () => {
  let service: MovementDomainService;

  beforeEach(() => {
    service = new MovementDomainService();
  });

  describe('calculateBalance', () => {
    it('should calculate balance from income and expense movements', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date()),
        new Movement('2', 'EgresoNormal', 'acc-1', 'pocket-1', 30, new Date()),
        new Movement('3', 'IngresoFijo', 'acc-1', 'pocket-1', 50, new Date()),
        new Movement('4', 'EgresoFijo', 'acc-1', 'pocket-1', 20, new Date()),
      ];

      const balance = service.calculateBalance(movements);
      expect(balance).toBe(100); // 100 + 50 - 30 - 20
    });

    it('should exclude pending movements', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date()),
        new Movement('2', 'EgresoNormal', 'acc-1', 'pocket-1', 30, new Date(), undefined, undefined, true), // pending
      ];

      const balance = service.calculateBalance(movements);
      expect(balance).toBe(100); // Only non-pending movement
    });

    it('should exclude orphaned movements', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date()),
      ];
      movements[0].markAsOrphaned('Test', 'USD', 'Pocket');

      const balance = service.calculateBalance(movements);
      expect(balance).toBe(0); // Orphaned movement excluded
    });

    it('should return 0 for empty movements', () => {
      const balance = service.calculateBalance([]);
      expect(balance).toBe(0);
    });
  });

  describe('calculatePocketBalance', () => {
    it('should calculate balance for specific pocket', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date()),
        new Movement('2', 'EgresoNormal', 'acc-1', 'pocket-1', 30, new Date()),
        new Movement('3', 'IngresoNormal', 'acc-1', 'pocket-2', 50, new Date()),
      ];

      const balance = service.calculatePocketBalance(movements, 'pocket-1');
      expect(balance).toBe(70); // 100 - 30
    });
  });

  describe('calculateSubPocketBalance', () => {
    it('should calculate balance for specific sub-pocket', () => {
      const movements = [
        new Movement('1', 'IngresoFijo', 'acc-1', 'pocket-1', 100, new Date(), undefined, 'sub-1'),
        new Movement('2', 'EgresoFijo', 'acc-1', 'pocket-1', 30, new Date(), undefined, 'sub-1'),
        new Movement('3', 'IngresoFijo', 'acc-1', 'pocket-1', 50, new Date(), undefined, 'sub-2'),
      ];

      const balance = service.calculateSubPocketBalance(movements, 'sub-1');
      expect(balance).toBe(70); // 100 - 30
    });
  });

  describe('calculateAccountBalance', () => {
    it('should calculate balance for specific account', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date()),
        new Movement('2', 'EgresoNormal', 'acc-1', 'pocket-2', 30, new Date()),
        new Movement('3', 'IngresoNormal', 'acc-2', 'pocket-3', 50, new Date()),
      ];

      const balance = service.calculateAccountBalance(movements, 'acc-1');
      expect(balance).toBe(70); // 100 - 30
    });
  });

  describe('getAffectedEntities', () => {
    it('should return affected entities for movement without sub-pocket', () => {
      const movement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date());
      
      const affected = service.getAffectedEntities(movement);
      
      expect(affected.accountId).toBe('acc-1');
      expect(affected.pocketId).toBe('pocket-1');
      expect(affected.subPocketId).toBeUndefined();
    });

    it('should return affected entities for movement with sub-pocket', () => {
      const movement = new Movement('1', 'IngresoFijo', 'acc-1', 'pocket-1', 100, new Date(), undefined, 'sub-1');
      
      const affected = service.getAffectedEntities(movement);
      
      expect(affected.accountId).toBe('acc-1');
      expect(affected.pocketId).toBe('pocket-1');
      expect(affected.subPocketId).toBe('sub-1');
    });
  });

  describe('requiresBalanceRecalculation', () => {
    const baseMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date());

    it('should return true when amount changes', () => {
      const oldMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date());
      const newMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 150, new Date());
      
      expect(service.requiresBalanceRecalculation(oldMovement, newMovement)).toBe(true);
    });

    it('should return true when pending status changes', () => {
      const oldMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date(), undefined, undefined, false);
      const newMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date(), undefined, undefined, true);
      
      expect(service.requiresBalanceRecalculation(oldMovement, newMovement)).toBe(true);
    });

    it('should return true when type changes', () => {
      const oldMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date());
      const newMovement = new Movement('1', 'EgresoNormal', 'acc-1', 'pocket-1', 100, new Date());
      
      expect(service.requiresBalanceRecalculation(oldMovement, newMovement)).toBe(true);
    });

    it('should return true when account changes', () => {
      const oldMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date());
      const newMovement = new Movement('1', 'IngresoNormal', 'acc-2', 'pocket-1', 100, new Date());
      
      expect(service.requiresBalanceRecalculation(oldMovement, newMovement)).toBe(true);
    });

    it('should return true when pocket changes', () => {
      const oldMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date());
      const newMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-2', 100, new Date());
      
      expect(service.requiresBalanceRecalculation(oldMovement, newMovement)).toBe(true);
    });

    it('should return true when sub-pocket changes', () => {
      const oldMovement = new Movement('1', 'IngresoFijo', 'acc-1', 'pocket-1', 100, new Date(), undefined, 'sub-1');
      const newMovement = new Movement('1', 'IngresoFijo', 'acc-1', 'pocket-1', 100, new Date(), undefined, 'sub-2');
      
      expect(service.requiresBalanceRecalculation(oldMovement, newMovement)).toBe(true);
    });

    it('should return false when only notes change', () => {
      const oldMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date(), 'Old notes');
      const newMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date(), 'New notes');
      
      expect(service.requiresBalanceRecalculation(oldMovement, newMovement)).toBe(false);
    });
  });

  describe('getAllAffectedEntities', () => {
    it('should return all unique affected entities when references change', () => {
      const oldMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date(), undefined, 'sub-1');
      const newMovement = new Movement('1', 'IngresoNormal', 'acc-2', 'pocket-2', 100, new Date(), undefined, 'sub-2');
      
      const affected = service.getAllAffectedEntities(oldMovement, newMovement);
      
      expect(affected.accountIds).toContain('acc-1');
      expect(affected.accountIds).toContain('acc-2');
      expect(affected.pocketIds).toContain('pocket-1');
      expect(affected.pocketIds).toContain('pocket-2');
      expect(affected.subPocketIds).toContain('sub-1');
      expect(affected.subPocketIds).toContain('sub-2');
    });

    it('should not duplicate entities when references stay the same', () => {
      const oldMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date());
      const newMovement = new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 150, new Date());
      
      const affected = service.getAllAffectedEntities(oldMovement, newMovement);
      
      expect(affected.accountIds).toEqual(['acc-1']);
      expect(affected.pocketIds).toEqual(['pocket-1']);
      expect(affected.subPocketIds).toEqual([]);
    });
  });

  describe('filterByDateRange', () => {
    it('should filter movements by date range', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-01-15')),
        new Movement('2', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-02-15')),
        new Movement('3', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-03-15')),
      ];

      const filtered = service.filterByDateRange(
        movements,
        new Date('2024-02-01'),
        new Date('2024-02-28')
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('filterByMonth', () => {
    it('should filter movements by month', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-01-15')),
        new Movement('2', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-02-15')),
        new Movement('3', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-02-20')),
      ];

      const filtered = service.filterByMonth(movements, 2024, 2);

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('2');
      expect(filtered[1].id).toBe('3');
    });
  });

  describe('groupByMonth', () => {
    it('should group movements by month', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-01-15')),
        new Movement('2', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-01-20')),
        new Movement('3', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date('2024-02-15')),
      ];

      const grouped = service.groupByMonth(movements);

      expect(grouped.size).toBe(2);
      expect(grouped.get('2024-01')).toHaveLength(2);
      expect(grouped.get('2024-02')).toHaveLength(1);
    });
  });

  describe('calculateTotalIncome', () => {
    it('should calculate total income', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date()),
        new Movement('2', 'IngresoFijo', 'acc-1', 'pocket-1', 50, new Date()),
        new Movement('3', 'EgresoNormal', 'acc-1', 'pocket-1', 30, new Date()),
      ];

      const total = service.calculateTotalIncome(movements);
      expect(total).toBe(150);
    });

    it('should exclude pending and orphaned movements', () => {
      const movements = [
        new Movement('1', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date()),
        new Movement('2', 'IngresoNormal', 'acc-1', 'pocket-1', 50, new Date(), undefined, undefined, true), // pending
      ];
      movements[0].markAsOrphaned('Test', 'USD', 'Pocket'); // orphaned

      const total = service.calculateTotalIncome(movements);
      expect(total).toBe(0);
    });
  });

  describe('calculateTotalExpenses', () => {
    it('should calculate total expenses', () => {
      const movements = [
        new Movement('1', 'EgresoNormal', 'acc-1', 'pocket-1', 30, new Date()),
        new Movement('2', 'EgresoFijo', 'acc-1', 'pocket-1', 20, new Date()),
        new Movement('3', 'IngresoNormal', 'acc-1', 'pocket-1', 100, new Date()),
      ];

      const total = service.calculateTotalExpenses(movements);
      expect(total).toBe(50);
    });

    it('should exclude pending and orphaned movements', () => {
      const movements = [
        new Movement('1', 'EgresoNormal', 'acc-1', 'pocket-1', 30, new Date()),
        new Movement('2', 'EgresoNormal', 'acc-1', 'pocket-1', 20, new Date(), undefined, undefined, true), // pending
      ];
      movements[0].markAsOrphaned('Test', 'USD', 'Pocket'); // orphaned

      const total = service.calculateTotalExpenses(movements);
      expect(total).toBe(0);
    });
  });
});
