/**
 * PocketDomainService Unit Tests
 * 
 * Tests balance calculation logic for both normal and fixed pockets
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PocketDomainService } from './PocketDomainService';
import { Pocket } from './Pocket';

describe('PocketDomainService', () => {
  let service: PocketDomainService;

  beforeEach(() => {
    service = new PocketDomainService();
  });

  describe('calculateBalanceFromMovements', () => {
    it('should calculate balance from income movements', () => {
      const movements = [
        { id: '1', pocketId: 'p1', amount: 100, type: 'IngresoNormal' as const },
        { id: '2', pocketId: 'p1', amount: 50, type: 'IngresoNormal' as const },
      ];

      const balance = service.calculateBalanceFromMovements(movements);

      expect(balance).toBe(150);
    });

    it('should calculate balance from expense movements', () => {
      const movements = [
        { id: '1', pocketId: 'p1', amount: 100, type: 'EgresoNormal' as const },
        { id: '2', pocketId: 'p1', amount: 50, type: 'EgresoNormal' as const },
      ];

      const balance = service.calculateBalanceFromMovements(movements);

      expect(balance).toBe(-150);
    });

    it('should calculate balance from mixed income and expense movements', () => {
      const movements = [
        { id: '1', pocketId: 'p1', amount: 200, type: 'IngresoNormal' as const },
        { id: '2', pocketId: 'p1', amount: 75, type: 'EgresoNormal' as const },
        { id: '3', pocketId: 'p1', amount: 50, type: 'IngresoFijo' as const },
        { id: '4', pocketId: 'p1', amount: 25, type: 'EgresoFijo' as const },
      ];

      const balance = service.calculateBalanceFromMovements(movements);

      // 200 - 75 + 50 - 25 = 150
      expect(balance).toBe(150);
    });

    it('should exclude pending movements from balance calculation', () => {
      const movements = [
        { id: '1', pocketId: 'p1', amount: 100, type: 'IngresoNormal' as const },
        { id: '2', pocketId: 'p1', amount: 50, type: 'IngresoNormal' as const, isPending: true },
        { id: '3', pocketId: 'p1', amount: 25, type: 'EgresoNormal' as const },
      ];

      const balance = service.calculateBalanceFromMovements(movements);

      // 100 (included) + 50 (excluded - pending) - 25 (included) = 75
      expect(balance).toBe(75);
    });

    it('should exclude orphaned movements from balance calculation', () => {
      const movements = [
        { id: '1', pocketId: 'p1', amount: 100, type: 'IngresoNormal' as const },
        { id: '2', pocketId: 'p1', amount: 50, type: 'IngresoNormal' as const, isOrphaned: true },
        { id: '3', pocketId: 'p1', amount: 25, type: 'EgresoNormal' as const },
      ];

      const balance = service.calculateBalanceFromMovements(movements);

      // 100 (included) + 50 (excluded - orphaned) - 25 (included) = 75
      expect(balance).toBe(75);
    });

    it('should exclude both pending and orphaned movements', () => {
      const movements = [
        { id: '1', pocketId: 'p1', amount: 100, type: 'IngresoNormal' as const },
        { id: '2', pocketId: 'p1', amount: 50, type: 'IngresoNormal' as const, isPending: true },
        { id: '3', pocketId: 'p1', amount: 30, type: 'IngresoNormal' as const, isOrphaned: true },
        { id: '4', pocketId: 'p1', amount: 20, type: 'EgresoNormal' as const },
      ];

      const balance = service.calculateBalanceFromMovements(movements);

      // 100 (included) + 50 (excluded) + 30 (excluded) - 20 (included) = 80
      expect(balance).toBe(80);
    });

    it('should return 0 for empty movements array', () => {
      const balance = service.calculateBalanceFromMovements([]);

      expect(balance).toBe(0);
    });

    it('should handle all movements being excluded', () => {
      const movements = [
        { id: '1', pocketId: 'p1', amount: 100, type: 'IngresoNormal' as const, isPending: true },
        { id: '2', pocketId: 'p1', amount: 50, type: 'IngresoNormal' as const, isOrphaned: true },
      ];

      const balance = service.calculateBalanceFromMovements(movements);

      expect(balance).toBe(0);
    });
  });

  describe('calculateBalanceFromSubPockets', () => {
    it('should calculate balance from sub-pockets with positive balances', () => {
      const subPockets = [
        { id: 's1', pocketId: 'p1', balance: 100 },
        { id: 's2', pocketId: 'p1', balance: 50 },
        { id: 's3', pocketId: 'p1', balance: 25 },
      ];

      const balance = service.calculateBalanceFromSubPockets(subPockets);

      expect(balance).toBe(175);
    });

    it('should calculate balance from sub-pockets with negative balances (debt)', () => {
      const subPockets = [
        { id: 's1', pocketId: 'p1', balance: -100 },
        { id: 's2', pocketId: 'p1', balance: -50 },
      ];

      const balance = service.calculateBalanceFromSubPockets(subPockets);

      expect(balance).toBe(-150);
    });

    it('should calculate balance from sub-pockets with mixed positive and negative balances', () => {
      const subPockets = [
        { id: 's1', pocketId: 'p1', balance: 200 },
        { id: 's2', pocketId: 'p1', balance: -75 },
        { id: 's3', pocketId: 'p1', balance: 50 },
        { id: 's4', pocketId: 'p1', balance: -25 },
      ];

      const balance = service.calculateBalanceFromSubPockets(subPockets);

      // 200 - 75 + 50 - 25 = 150
      expect(balance).toBe(150);
    });

    it('should return 0 for empty sub-pockets array', () => {
      const balance = service.calculateBalanceFromSubPockets([]);

      expect(balance).toBe(0);
    });

    it('should handle sub-pockets with zero balances', () => {
      const subPockets = [
        { id: 's1', pocketId: 'p1', balance: 0 },
        { id: 's2', pocketId: 'p1', balance: 0 },
      ];

      const balance = service.calculateBalanceFromSubPockets(subPockets);

      expect(balance).toBe(0);
    });
  });

  describe('updatePocketBalance', () => {
    it('should update normal pocket balance from movements', () => {
      const pocket = new Pocket('p1', 'a1', 'Savings', 'normal', 0, 'USD');
      const movements = [
        { id: '1', pocketId: 'p1', amount: 100, type: 'IngresoNormal' as const },
        { id: '2', pocketId: 'p1', amount: 25, type: 'EgresoNormal' as const },
      ];

      service.updatePocketBalance(pocket, movements);

      expect(pocket.balance).toBe(75);
    });

    it('should update fixed pocket balance from sub-pockets', () => {
      const pocket = new Pocket('p1', 'a1', 'Fixed Expenses', 'fixed', 0, 'USD');
      const subPockets = [
        { id: 's1', pocketId: 'p1', balance: 100 },
        { id: 's2', pocketId: 'p1', balance: -25 },
      ];

      service.updatePocketBalance(pocket, undefined, subPockets);

      expect(pocket.balance).toBe(75);
    });

    it('should throw error when updating normal pocket without movements', () => {
      const pocket = new Pocket('p1', 'a1', 'Savings', 'normal', 0, 'USD');

      expect(() => {
        service.updatePocketBalance(pocket);
      }).toThrow('Movements are required for normal pockets');
    });

    it('should throw error when updating fixed pocket without sub-pockets', () => {
      const pocket = new Pocket('p1', 'a1', 'Fixed Expenses', 'fixed', 0, 'USD');

      expect(() => {
        service.updatePocketBalance(pocket);
      }).toThrow('Sub-pockets are required for fixed pockets');
    });

    it('should update normal pocket balance to zero when no movements', () => {
      const pocket = new Pocket('p1', 'a1', 'Savings', 'normal', 100, 'USD');

      service.updatePocketBalance(pocket, []);

      expect(pocket.balance).toBe(0);
    });

    it('should update fixed pocket balance to zero when no sub-pockets', () => {
      const pocket = new Pocket('p1', 'a1', 'Fixed Expenses', 'fixed', 100, 'USD');

      service.updatePocketBalance(pocket, undefined, []);

      expect(pocket.balance).toBe(0);
    });
  });

  describe('calculateTotalBalance', () => {
    it('should calculate total balance from multiple pockets', () => {
      const pockets = [
        new Pocket('p1', 'a1', 'Savings', 'normal', 100, 'USD'),
        new Pocket('p2', 'a1', 'Checking', 'normal', 250, 'USD'),
        new Pocket('p3', 'a1', 'Fixed', 'fixed', -50, 'USD'),
      ];

      const total = service.calculateTotalBalance(pockets);

      expect(total).toBe(300);
    });

    it('should return 0 for empty pockets array', () => {
      const total = service.calculateTotalBalance([]);

      expect(total).toBe(0);
    });

    it('should handle all negative balances', () => {
      const pockets = [
        new Pocket('p1', 'a1', 'Debt1', 'normal', -100, 'USD'),
        new Pocket('p2', 'a1', 'Debt2', 'normal', -50, 'USD'),
      ];

      const total = service.calculateTotalBalance(pockets);

      expect(total).toBe(-150);
    });

    it('should handle single pocket', () => {
      const pockets = [
        new Pocket('p1', 'a1', 'Savings', 'normal', 500, 'USD'),
      ];

      const total = service.calculateTotalBalance(pockets);

      expect(total).toBe(500);
    });
  });
});
