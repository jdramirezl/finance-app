/**
 * ToggleGroupUseCase Property-Based Tests
 * 
 * **Feature: backend-migration, Property 30: Group toggle affects all sub-pockets**
 * **Validates: Requirements 9.4**
 * 
 * Property: For any group, toggling the group's enabled status should toggle
 * the enabled status for all sub-pockets in that group.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { ToggleGroupUseCase } from './ToggleGroupUseCase';
import { FixedExpenseGroup } from '../../domain/FixedExpenseGroup';
import { SubPocket } from '../../domain/SubPocket';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';

describe('ToggleGroupUseCase - Property Tests', () => {
  let useCase: ToggleGroupUseCase;
  let mockGroupRepository: jest.Mocked<IFixedExpenseGroupRepository>;
  let mockSubPocketRepository: jest.Mocked<ISubPocketRepository>;

  beforeEach(() => {
    mockGroupRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockSubPocketRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByPocketId: jest.fn(),
      findByGroupId: jest.fn(),
      findAllByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
      hasMovements: jest.fn(),
      countMovements: jest.fn(),
    };
    useCase = new ToggleGroupUseCase(mockGroupRepository, mockSubPocketRepository);
  });

  describe('Property 30: Group toggle affects all sub-pockets', () => {
    it('should enable all sub-pockets when any are disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a valid group
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          // Generate a list of sub-pockets with mixed enabled states
          fc.array(
            fc.record({
              id: fc.uuid(),
              pocketId: fc.uuid(),
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
              valueTotal: fc.integer({ min: 1, max: 10000 }),
              periodicityMonths: fc.integer({ min: 1, max: 24 }),
              enabled: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (groupName: string, subPocketData: any[]) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const groupId = 'group-id';
            const group = new FixedExpenseGroup(groupId, groupName, '#3b82f6');

            // Create sub-pockets with the group ID
            const subPockets = subPocketData.map(data =>
              new SubPocket(
                data.id,
                data.pocketId,
                data.name,
                data.valueTotal,
                data.periodicityMonths,
                0,
                data.enabled,
                groupId
              )
            );

            // Check if any sub-pocket is disabled
            const hasDisabled = subPockets.some(sp => !sp.enabled);

            // Mock repository responses
            mockGroupRepository.findById.mockResolvedValue(group);
            mockSubPocketRepository.findByGroupId.mockResolvedValue(subPockets);
            mockSubPocketRepository.update.mockResolvedValue(undefined);

            // Execute
            await useCase.execute(groupId, 'user-id');

            // Verify all sub-pockets were updated
            expect(mockSubPocketRepository.update).toHaveBeenCalledTimes(subPockets.length);

            // Verify all sub-pockets have the same enabled state
            for (let i = 0; i < subPockets.length; i++) {
              const updateCall = mockSubPocketRepository.update.mock.calls[i];
              const updatedSubPocket = updateCall[0];
              
              // If any were disabled, all should now be enabled
              // If all were enabled, all should now be disabled
              expect(updatedSubPocket.enabled).toBe(hasDisabled);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should disable all sub-pockets when all are enabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a valid group
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          // Generate a list of sub-pockets all enabled
          fc.array(
            fc.record({
              id: fc.uuid(),
              pocketId: fc.uuid(),
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
              valueTotal: fc.integer({ min: 1, max: 10000 }),
              periodicityMonths: fc.integer({ min: 1, max: 24 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (groupName: string, subPocketData: any[]) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const groupId = 'group-id';
            const group = new FixedExpenseGroup(groupId, groupName, '#3b82f6');

            // Create sub-pockets all enabled
            const subPockets = subPocketData.map(data =>
              new SubPocket(
                data.id,
                data.pocketId,
                data.name,
                data.valueTotal,
                data.periodicityMonths,
                0,
                true, // All enabled
                groupId
              )
            );

            // Mock repository responses
            mockGroupRepository.findById.mockResolvedValue(group);
            mockSubPocketRepository.findByGroupId.mockResolvedValue(subPockets);
            mockSubPocketRepository.update.mockResolvedValue(undefined);

            // Execute
            await useCase.execute(groupId, 'user-id');

            // Verify all sub-pockets were updated
            expect(mockSubPocketRepository.update).toHaveBeenCalledTimes(subPockets.length);

            // Verify all sub-pockets are now disabled
            for (let i = 0; i < subPockets.length; i++) {
              const updateCall = mockSubPocketRepository.update.mock.calls[i];
              const updatedSubPocket = updateCall[0];
              expect(updatedSubPocket.enabled).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle group with no sub-pockets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          async (groupName: string) => {
            // Reset mocks for each property test run
            jest.clearAllMocks();

            const groupId = 'group-id';
            const group = new FixedExpenseGroup(groupId, groupName, '#3b82f6');

            // Mock repository responses - no sub-pockets
            mockGroupRepository.findById.mockResolvedValue(group);
            mockSubPocketRepository.findByGroupId.mockResolvedValue([]);

            // Execute
            const result = await useCase.execute(groupId, 'user-id');

            // Verify group was returned
            expect(result.id).toBe(groupId);

            // Verify no sub-pockets were updated
            expect(mockSubPocketRepository.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
