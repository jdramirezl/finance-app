/**
 * CreateFixedExpenseGroupUseCase Property-Based Tests
 * 
 * **Feature: backend-migration, Property 27: Group validation rejects invalid inputs**
 * **Validates: Requirements 9.1**
 * 
 * Property: For any group creation request with empty name or invalid color format,
 * the system should reject the request with a validation error.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { CreateFixedExpenseGroupUseCase } from './CreateFixedExpenseGroupUseCase';
import type { IFixedExpenseGroupRepository } from '../../infrastructure/IFixedExpenseGroupRepository';
import type { CreateGroupDTO } from '../dtos/FixedExpenseGroupDTO';

describe('CreateFixedExpenseGroupUseCase - Property Tests', () => {
  let useCase: CreateFixedExpenseGroupUseCase;
  let mockRepository: jest.Mocked<IFixedExpenseGroupRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateFixedExpenseGroupUseCase(mockRepository);
  });

  describe('Property 27: Group validation rejects invalid inputs', () => {
    it('should reject groups with empty or whitespace-only names', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate invalid names: empty string or whitespace-only strings
          fc.oneof(
            fc.constant(''),
            fc.stringMatching(/^\s+$/) // Only whitespace
          ),
          // Generate valid color for this test
          fc.constant('#3b82f6'),
          async (invalidName, validColor) => {
            const dto: CreateGroupDTO = {
              name: invalidName,
              color: validColor,
            };

            await expect(useCase.execute(dto, 'user-id'))
              .rejects
              .toThrow('Group name cannot be empty');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject groups with invalid color formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid name for this test
          fc.constant('Test Group'),
          // Generate invalid colors: anything that doesn't match hex format
          fc.string().filter(s => !s.match(/^#[0-9A-Fa-f]{6}$/)),
          async (validName, invalidColor) => {
            const dto: CreateGroupDTO = {
              name: validName,
              color: invalidColor,
            };

            await expect(useCase.execute(dto, 'user-id'))
              .rejects
              .toThrow('Invalid color format');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept groups with valid names and colors', async () => {
      // Helper to generate valid hex colors
      const validHexColor = () => 
        fc.tuple(
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 })
        ).map(([r, g, b]) => 
          `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        );

      await fc.assert(
        fc.asyncProperty(
          // Generate valid names: non-empty strings with at least one non-whitespace character
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          // Generate valid hex colors
          validHexColor(),
          async (validName: string, validColor: string) => {
            const dto: CreateGroupDTO = {
              name: validName,
              color: validColor,
            };

            mockRepository.save.mockResolvedValue(undefined);

            const result = await useCase.execute(dto, 'user-id');

            expect(result).toBeDefined();
            expect(result.name).toBe(validName);
            expect(result.color).toBe(validColor);
            expect(mockRepository.save).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
