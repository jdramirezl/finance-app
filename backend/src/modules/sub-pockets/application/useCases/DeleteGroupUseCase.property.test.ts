/**
 * DeleteGroupUseCase Property-Based Tests
 * 
 * **Feature: backend-migration, Property 29: Group deletion reassigns sub-pockets**
 * **Validates: Requirements 9.3**
 * 
 * Property: For any group with sub-pockets, deleting the group should move all
 * sub-pockets to the default group (null groupId).
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { DeleteGroupUseCase } from './DeleteGroupUseCase';
import { FixedExpenseGroup } from '../../domain/FixedExpenseGroup';
import { SubPocket } from '../../domain/SubPocket';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import type { ISubPocketRepository } from '../../infrastructure/ISubPocketRepository';

describe('DeleteGroupUseCase - Property Tests', () => {
  let useCase: DeleteGroupUseCase;
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
    useCase = new DeleteGroupUseCase(mockGroupRepository, mockSubPocketRepository);
  });

  describe('Property 29: Group deletion reassigns sub-pockets', () => {
    it('should move all sub-pockets to default group when deleting a group', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a valid group
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          // Generate a list of sub-pockets (0 to 10)
          fc.array(
            fc.record({
              id: fc.uuid(),
              pocketId: fc.uuid(),
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
              valueTotal: fc.integer({ min: 1, max: 10000 }),
              periodicityMonths: fc.integer({ min: 1, max: 24 }),
            }),
            { minLength: 0, maxLength: 10 }
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
                true,
                groupId // All belong to this group
              )
            );

            // Mock repository responses
            mockGroupRepository.findById.mockResolvedValue(group);
            mockSubPocketRepository.findByGroupId.mockResolvedValue(subPockets);
            mockSubPocketRepository.update.mockResolvedValue(undefined);
            mockGroupRepository.delete.mockResolvedValue(undefined);

            // Execute
            await useCase.execute(groupId, 'user-id');

            // Verify group was deleted
            expect(mockGroupRepository.delete).toHaveBeenCalledWith(groupId, 'user-id');

            // Verify all sub-pockets were updated
            expect(mockSubPocketRepository.update).toHaveBeenCalledTimes(subPockets.length);

            // Verify each sub-pocket was moved to default group (undefined groupId)
            for (let i = 0; i < subPockets.length; i++) {
              const updateCall = mockSubPocketRepository.update.mock.calls[i];
              const updatedSubPocket = updateCall[0];
              expect(updatedSubPocket.groupId).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deletion of group with no sub-pockets', async () => {
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
            mockGroupRepository.delete.mockResolvedValue(undefined);

            // Execute
            await useCase.execute(groupId, 'user-id');

            // Verify group was deleted
            expect(mockGroupRepository.delete).toHaveBeenCalledWith(groupId, 'user-id');

            // Verify no sub-pockets were updated
            expect(mockSubPocketRepository.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
