/**
 * SubPocket Property-Based Tests
 * 
 * Tests universal properties that should hold across all valid inputs
 * using fast-check for property-based testing.
 * 
 * **Feature: backend-migration, Property 23: SubPocket monthly contribution calculation**
 * **Validates: Requirements 8.2**
 * 
 * **Feature: backend-migration, Property 24: SubPocket balance calculation**
 * **Validates: Requirements 8.3**
 * 
 * **Feature: backend-migration, Property 25: SubPocket toggle updates enabled flag**
 * **Validates: Requirements 8.4**
 * 
 * **Feature: backend-migration, Property 26: SubPocket reordering updates display order**
 * **Validates: Requirements 8.6**
 * 
 * **Feature: backend-migration, Property 28: Moving sub-pocket updates group reference**
 * **Validates: Requirements 9.2**
 */

import fc from 'fast-check';
import { SubPocket } from './SubPocket';
import { SubPocketDomainService } from './SubPocketDomainService';

describe('SubPocket Property-Based Tests', () => {
  describe('Property 23: SubPocket monthly contribution calculation', () => {
    it('should calculate monthly contribution as valueTotal / periodicityMonths for all valid inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // name
          fc.integer({ min: 1, max: 1000000 }), // valueTotal (positive)
          fc.integer({ min: 1, max: 120 }), // periodicityMonths (1-120 months, positive integer)
          (name, valueTotal, periodicityMonths) => {
            // Create sub-pocket with random valid values
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0 // balance
            );

            // Property: monthly contribution should equal valueTotal / periodicityMonths
            const expectedContribution = valueTotal / periodicityMonths;
            const actualContribution = subPocket.monthlyContribution;

            // Use toBeCloseTo for floating point comparison
            expect(actualContribution).toBeCloseTo(expectedContribution, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain monthly contribution calculation after updates', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), // initial name
          fc.integer({ min: 1, max: 1000000 }), // initial valueTotal
          fc.integer({ min: 1, max: 120 }), // initial periodicityMonths
          fc.integer({ min: 1, max: 1000000 }), // new valueTotal
          fc.integer({ min: 1, max: 120 }), // new periodicityMonths
          (name, initialValue, initialPeriod, newValue, newPeriod) => {
            // Create sub-pocket
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              initialValue,
              initialPeriod,
              0
            );

            // Update values
            subPocket.update(undefined, newValue, newPeriod);

            // Property: monthly contribution should reflect updated values
            const expectedContribution = newValue / newPeriod;
            expect(subPocket.monthlyContribution).toBeCloseTo(expectedContribution, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of periodicity = 1 month', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000000 }),
          (name, valueTotal) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              1, // 1 month periodicity
              0
            );

            // Property: when periodicity is 1, monthly contribution equals valueTotal
            expect(subPocket.monthlyContribution).toBe(valueTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce positive monthly contribution for all positive inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 1, max: 120 }),
          (name, valueTotal, periodicityMonths) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0
            );

            // Property: monthly contribution should always be positive
            expect(subPocket.monthlyContribution).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: SubPocket balance calculation', () => {
    const domainService = new SubPocketDomainService();

    // Movement type generator
    const movementTypeArb = fc.constantFrom(
      'IngresoFijo' as const,
      'EgresoFijo' as const
    );

    // Movement generator
    const movementArb = fc.record({
      id: fc.uuid(),
      subPocketId: fc.constant('test-sub-pocket'),
      amount: fc.integer({ min: 1, max: 10000 }),
      type: movementTypeArb,
      isPending: fc.boolean(),
      isOrphaned: fc.boolean(),
    });

    it('should calculate balance as sum of non-pending, non-orphaned movements', () => {
      fc.assert(
        fc.property(
          fc.array(movementArb, { minLength: 0, maxLength: 50 }),
          (movements) => {
            // Calculate expected balance manually
            const expectedBalance = movements
              .filter(m => !m.isPending && !m.isOrphaned)
              .reduce((total, m) => {
                const isIncome = m.type === 'IngresoFijo';
                return total + (isIncome ? m.amount : -m.amount);
              }, 0);

            // Calculate using domain service
            const actualBalance = domainService.calculateBalanceFromMovements(movements);

            // Property: calculated balance should match expected
            expect(actualBalance).toBe(expectedBalance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude pending movements from balance calculation', () => {
      fc.assert(
        fc.property(
          fc.array(movementArb, { minLength: 1, maxLength: 20 }),
          (movements) => {
            // Mark all movements as pending
            const pendingMovements = movements.map(m => ({ ...m, isPending: true, isOrphaned: false }));

            // Calculate balance
            const balance = domainService.calculateBalanceFromMovements(pendingMovements);

            // Property: balance should be 0 when all movements are pending
            expect(balance).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude orphaned movements from balance calculation', () => {
      fc.assert(
        fc.property(
          fc.array(movementArb, { minLength: 1, maxLength: 20 }),
          (movements) => {
            // Mark all movements as orphaned
            const orphanedMovements = movements.map(m => ({ ...m, isPending: false, isOrphaned: true }));

            // Calculate balance
            const balance = domainService.calculateBalanceFromMovements(orphanedMovements);

            // Property: balance should be 0 when all movements are orphaned
            expect(balance).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle income movements as positive and expense movements as negative', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          (amount) => {
            // Create one income movement
            const incomeMovement = {
              id: 'income-1',
              subPocketId: 'test-sub-pocket',
              amount,
              type: 'IngresoFijo' as const,
              isPending: false,
              isOrphaned: false,
            };

            // Create one expense movement with same amount
            const expenseMovement = {
              id: 'expense-1',
              subPocketId: 'test-sub-pocket',
              amount,
              type: 'EgresoFijo' as const,
              isPending: false,
              isOrphaned: false,
            };

            const incomeBalance = domainService.calculateBalanceFromMovements([incomeMovement]);
            const expenseBalance = domainService.calculateBalanceFromMovements([expenseMovement]);
            const combinedBalance = domainService.calculateBalanceFromMovements([incomeMovement, expenseMovement]);

            // Property: income should be positive, expense negative, combined should be 0
            expect(incomeBalance).toBe(amount);
            expect(expenseBalance).toBe(-amount);
            expect(combinedBalance).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow negative balances (debt)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          (incomeAmount, expenseAmount) => {
            fc.pre(expenseAmount > incomeAmount); // Ensure expense > income

            const movements = [
              {
                id: 'income-1',
                subPocketId: 'test-sub-pocket',
                amount: incomeAmount,
                type: 'IngresoFijo' as const,
                isPending: false,
                isOrphaned: false,
              },
              {
                id: 'expense-1',
                subPocketId: 'test-sub-pocket',
                amount: expenseAmount,
                type: 'EgresoFijo' as const,
                isPending: false,
                isOrphaned: false,
              },
            ];

            const balance = domainService.calculateBalanceFromMovements(movements);

            // Property: balance should be negative when expenses exceed income
            expect(balance).toBeLessThan(0);
            expect(balance).toBe(incomeAmount - expenseAmount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update sub-pocket balance correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.array(movementArb, { minLength: 0, maxLength: 20 }),
          (name, valueTotal, periodicityMonths, movements) => {
            // Create sub-pocket
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0 // Initial balance
            );

            // Update balance using domain service
            domainService.updateSubPocketBalance(subPocket, movements);

            // Calculate expected balance
            const expectedBalance = movements
              .filter(m => !m.isPending && !m.isOrphaned)
              .reduce((total, m) => {
                const isIncome = m.type === 'IngresoFijo';
                return total + (isIncome ? m.amount : -m.amount);
              }, 0);

            // Property: sub-pocket balance should match calculated balance
            expect(subPocket.balance).toBe(expectedBalance);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: SubPocket toggle updates enabled flag', () => {
    it('should toggle enabled flag from any initial state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.boolean(), // initial enabled state
          (name, valueTotal, periodicityMonths, initialEnabled) => {
            // Create sub-pocket with random initial enabled state
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0,
              initialEnabled
            );

            // Toggle enabled
            subPocket.toggleEnabled();

            // Property: enabled should be opposite of initial state
            expect(subPocket.enabled).toBe(!initialEnabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should toggle back to original state after two toggles', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.boolean(),
          (name, valueTotal, periodicityMonths, initialEnabled) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0,
              initialEnabled
            );

            // Toggle twice
            subPocket.toggleEnabled();
            subPocket.toggleEnabled();

            // Property: should return to original state after two toggles
            expect(subPocket.enabled).toBe(initialEnabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain enabled state through multiple toggle cycles', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.boolean(),
          fc.integer({ min: 1, max: 20 }), // number of toggles
          (name, valueTotal, periodicityMonths, initialEnabled, toggleCount) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0,
              initialEnabled
            );

            // Toggle multiple times
            for (let i = 0; i < toggleCount; i++) {
              subPocket.toggleEnabled();
            }

            // Property: after even number of toggles, should be initial state
            // after odd number of toggles, should be opposite
            const expectedEnabled = toggleCount % 2 === 0 ? initialEnabled : !initialEnabled;
            expect(subPocket.enabled).toBe(expectedEnabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reflect enabled state correctly via isEnabled method', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.boolean(),
          (name, valueTotal, periodicityMonths, initialEnabled) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0,
              initialEnabled
            );

            // Property: isEnabled() should match enabled property
            expect(subPocket.isEnabled()).toBe(subPocket.enabled);

            // Toggle and check again
            subPocket.toggleEnabled();
            expect(subPocket.isEnabled()).toBe(subPocket.enabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow explicit setting of enabled state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.boolean(), // initial state
          fc.boolean(), // target state
          (name, valueTotal, periodicityMonths, initialEnabled, targetEnabled) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0,
              initialEnabled
            );

            // Set enabled explicitly
            subPocket.setEnabled(targetEnabled);

            // Property: enabled should match target state regardless of initial state
            expect(subPocket.enabled).toBe(targetEnabled);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 28: Moving sub-pocket updates group reference', () => {
    it('should update groupId to any valid group', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.option(fc.uuid(), { nil: undefined }), // initial groupId (can be undefined)
          fc.uuid(), // target groupId
          (name, valueTotal, periodicityMonths, initialGroupId, targetGroupId) => {
            // Create sub-pocket with initial group
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0,
              true,
              initialGroupId
            );

            // Move to target group
            subPocket.updateGroupId(targetGroupId);

            // Property: groupId should be updated to target
            expect(subPocket.groupId).toBe(targetGroupId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow moving to default group (undefined)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.uuid(), // initial groupId (has a group)
          (name, valueTotal, periodicityMonths, initialGroupId) => {
            // Create sub-pocket with a group
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0,
              true,
              initialGroupId
            );

            // Move to default group (no group)
            subPocket.updateGroupId(undefined);

            // Property: groupId should be undefined
            expect(subPocket.groupId).toBeUndefined();
            expect(subPocket.hasGroup()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain hasGroup() consistency after group changes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.option(fc.uuid(), { nil: undefined }),
          (name, valueTotal, periodicityMonths, targetGroupId) => {
            // Create sub-pocket without group
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0
            );

            // Update group
            subPocket.updateGroupId(targetGroupId);

            // Property: hasGroup() should match whether groupId is defined
            const expectedHasGroup = targetGroupId !== undefined && targetGroupId !== null;
            expect(subPocket.hasGroup()).toBe(expectedHasGroup);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow moving between groups multiple times', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.array(fc.option(fc.uuid(), { nil: undefined }), { minLength: 1, maxLength: 10 }),
          (name, valueTotal, periodicityMonths, groupSequence) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0
            );

            // Move through sequence of groups
            for (const groupId of groupSequence) {
              subPocket.updateGroupId(groupId);
              expect(subPocket.groupId).toBe(groupId);
            }

            // Property: final groupId should match last in sequence
            const finalGroupId = groupSequence[groupSequence.length - 1];
            expect(subPocket.groupId).toBe(finalGroupId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve other properties when moving groups', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: -1000, max: 1000 }), // balance
          fc.boolean(), // enabled
          fc.option(fc.uuid(), { nil: undefined }), // initial group
          fc.uuid(), // target group
          (name, valueTotal, periodicityMonths, balance, enabled, initialGroupId, targetGroupId) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              balance,
              enabled,
              initialGroupId
            );

            // Store original values
            const originalName = subPocket.name;
            const originalValueTotal = subPocket.valueTotal;
            const originalPeriodicity = subPocket.periodicityMonths;
            const originalBalance = subPocket.balance;
            const originalEnabled = subPocket.enabled;

            // Move to new group
            subPocket.updateGroupId(targetGroupId);

            // Property: other properties should remain unchanged
            expect(subPocket.name).toBe(originalName);
            expect(subPocket.valueTotal).toBe(originalValueTotal);
            expect(subPocket.periodicityMonths).toBe(originalPeriodicity);
            expect(subPocket.balance).toBe(originalBalance);
            expect(subPocket.enabled).toBe(originalEnabled);
            expect(subPocket.groupId).toBe(targetGroupId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: SubPocket reordering updates display order', () => {
    it('should update display order to match position in array', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
              valueTotal: fc.integer({ min: 1, max: 1000 }),
              periodicityMonths: fc.integer({ min: 1, max: 12 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (subPocketData) => {
            // Create sub-pockets
            const subPockets = subPocketData.map((data, index) => 
              new SubPocket(
                `sub-${index}`,
                'pocket-id',
                data.name,
                data.valueTotal,
                data.periodicityMonths,
                0
              )
            );

            // Update display order to match array position
            subPockets.forEach((sp, index) => {
              sp.updateDisplayOrder(index);
            });

            // Property: each sub-pocket's displayOrder should match its index
            subPockets.forEach((sp, index) => {
              expect(sp.displayOrder).toBe(index);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain display order after reordering', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 10 }
          ),
          (names) => {
            // Create sub-pockets with initial order
            const subPockets = names.map((name, index) => 
              new SubPocket(
                `sub-${index}`,
                'pocket-id',
                name,
                100,
                12,
                0
              )
            );

            // Set initial display order
            subPockets.forEach((sp, index) => sp.updateDisplayOrder(index));

            // Shuffle the array (simulate reordering)
            const shuffled = [...subPockets].sort(() => Math.random() - 0.5);

            // Update display order to match new positions
            shuffled.forEach((sp, index) => sp.updateDisplayOrder(index));

            // Property: display order should match new positions
            shuffled.forEach((sp, index) => {
              expect(sp.displayOrder).toBe(index);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow setting any non-negative display order', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 0, max: 1000 }), // display order
          (name, valueTotal, periodicityMonths, displayOrder) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0
            );

            // Set display order
            subPocket.updateDisplayOrder(displayOrder);

            // Property: displayOrder should be set to the specified value
            expect(subPocket.displayOrder).toBe(displayOrder);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative display order', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: -1000, max: -1 }), // negative display order
          (name, valueTotal, periodicityMonths, negativeOrder) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              0
            );

            // Property: setting negative display order should throw error
            expect(() => subPocket.updateDisplayOrder(negativeOrder))
              .toThrow('Display order cannot be negative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve other properties when updating display order', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: -1000, max: 1000 }), // balance
          fc.boolean(), // enabled
          fc.option(fc.uuid(), { nil: undefined }), // groupId
          fc.integer({ min: 0, max: 100 }), // new display order
          (name, valueTotal, periodicityMonths, balance, enabled, groupId, newOrder) => {
            const subPocket = new SubPocket(
              'test-id',
              'pocket-id',
              name,
              valueTotal,
              periodicityMonths,
              balance,
              enabled,
              groupId
            );

            // Store original values
            const originalName = subPocket.name;
            const originalValueTotal = subPocket.valueTotal;
            const originalPeriodicity = subPocket.periodicityMonths;
            const originalBalance = subPocket.balance;
            const originalEnabled = subPocket.enabled;
            const originalGroupId = subPocket.groupId;

            // Update display order
            subPocket.updateDisplayOrder(newOrder);

            // Property: other properties should remain unchanged
            expect(subPocket.name).toBe(originalName);
            expect(subPocket.valueTotal).toBe(originalValueTotal);
            expect(subPocket.periodicityMonths).toBe(originalPeriodicity);
            expect(subPocket.balance).toBe(originalBalance);
            expect(subPocket.enabled).toBe(originalEnabled);
            expect(subPocket.groupId).toBe(originalGroupId);
            expect(subPocket.displayOrder).toBe(newOrder);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
