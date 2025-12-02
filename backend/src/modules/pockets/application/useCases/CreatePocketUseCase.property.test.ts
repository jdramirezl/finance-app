/**
 * Property-Based Tests for CreatePocketUseCase
 * 
 * Feature: backend-migration, Property 15: Pocket name uniqueness within account
 * Validates: Requirements 6.1
 * 
 * These tests verify that pocket name uniqueness constraints are properly enforced
 * within an account across a wide range of generated test cases.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { CreatePocketUseCase } from './CreatePocketUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { CreatePocketDTO } from '../dtos/PocketDTO';
import type { Currency } from '@shared-backend/types';
import { Account } from '../../../accounts/domain/Account';
import { ConflictError } from '../../../../shared/errors/AppError';

describe('CreatePocketUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
  const validPocketTypes: ('normal' | 'fixed')[] = ['normal', 'fixed'];

  // Helper to generate valid hex colors
  const validHexColor = () => 
    fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    ).map(([r, g, b]) => 
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );

  describe('Property 15: Pocket name uniqueness within account', () => {
    it('should reject duplicate pocket names within the same account', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validPocketTypes).filter(t => t === 'normal'), // Only normal for this test
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.string({ minLength: 1, maxLength: 20 }), // accountId
          validHexColor(),
          async (pocketName: string, currency: Currency, pocketType: 'normal' | 'fixed', userId: string, accountId: string, color: string) => {
            // Create a normal account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(true), // Pocket exists
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            const dto: CreatePocketDTO = {
              accountId,
              name: pocketName.trim(),
              type: pocketType,
              currency,
            };

            // Attempting to create a duplicate pocket should throw ConflictError
            await expect(useCase.execute(dto, userId)).rejects.toThrow(ConflictError);
            
            // Verify that existsByNameInAccount was called with correct parameters
            expect(mockPocketRepo.existsByNameInAccount).toHaveBeenCalledWith(
              pocketName.trim(),
              accountId,
              userId
            );
            
            // Verify that save was NOT called since uniqueness check failed
            expect(mockPocketRepo.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow pockets with same name in different accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validPocketTypes).filter(t => t === 'normal'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId1
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId2
          validHexColor(),
          async (pocketName: string, currency: Currency, pocketType: 'normal' | 'fixed', userId: string, accountId1: string, accountId2: string, color: string) => {
            // Skip if accounts are the same
            if (accountId1 === accountId2) {
              return;
            }

            // Create a normal account
            const account = new Account(
              accountId2,
              'Test Account 2',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              // Return false for different account (no conflict)
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            const dto: CreatePocketDTO = {
              accountId: accountId2,
              name: pocketName.trim(),
              type: pocketType,
              currency,
            };

            // Should succeed since it's a different account
            const result = await useCase.execute(dto, userId);

            expect(result.name).toBe(pocketName.trim());
            expect(result.accountId).toBe(accountId2);
            expect(mockPocketRepo.save).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow different pocket names within the same account', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validPocketTypes).filter(t => t === 'normal'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          validHexColor(),
          async (pocketName1: string, pocketName2: string, currency: Currency, pocketType: 'normal' | 'fixed', userId: string, accountId: string, color: string) => {
            // Skip if names are the same
            if (pocketName1.trim() === pocketName2.trim()) {
              return;
            }

            // Create a normal account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              // Return false for different name (no conflict)
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            const dto: CreatePocketDTO = {
              accountId,
              name: pocketName2.trim(),
              type: pocketType,
              currency,
            };

            // Should succeed since name is different
            const result = await useCase.execute(dto, userId);

            expect(result.name).toBe(pocketName2.trim());
            expect(result.accountId).toBe(accountId);
            expect(mockPocketRepo.save).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce uniqueness per user (different users can have same pocket name in their accounts)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validPocketTypes).filter(t => t === 'normal'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId1
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId2
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          validHexColor(),
          async (pocketName: string, currency: Currency, pocketType: 'normal' | 'fixed', userId1: string, userId2: string, accountId: string, color: string) => {
            // Skip if users are the same
            if (userId1 === userId2) {
              return;
            }

            // Create a normal account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              // Return true for first user (pocket exists), false for second user
              existsByNameInAccount: jest.fn().mockImplementation(
                async (name: string, accId: string, userId: string) => {
                  return userId === userId1;
                }
              ),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            const dto: CreatePocketDTO = {
              accountId,
              name: pocketName.trim(),
              type: pocketType,
              currency,
            };

            // First user should fail (pocket exists)
            await expect(useCase.execute(dto, userId1)).rejects.toThrow(ConflictError);

            // Second user should succeed (different user)
            const result = await useCase.execute(dto, userId2);
            expect(result.name).toBe(pocketName.trim());
            expect(result.accountId).toBe(accountId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle name trimming in uniqueness check', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.constantFrom(...validPocketTypes).filter(t => t === 'normal'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          validHexColor(),
          fc.nat({ max: 5 }), // leading spaces
          fc.nat({ max: 5 }), // trailing spaces
          async (pocketName: string, currency: Currency, pocketType: 'normal' | 'fixed', userId: string, accountId: string, color: string, leadingSpaces: number, trailingSpaces: number) => {
            const trimmedName = pocketName.trim();
            const paddedName = ' '.repeat(leadingSpaces) + trimmedName + ' '.repeat(trailingSpaces);

            // Create a normal account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(true), // Pocket exists
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            const dto: CreatePocketDTO = {
              accountId,
              name: paddedName,
              type: pocketType,
              currency,
            };

            // Should fail because trimmed name matches existing pocket
            await expect(useCase.execute(dto, userId)).rejects.toThrow(ConflictError);

            // Verify that the name was trimmed before checking uniqueness
            expect(mockPocketRepo.existsByNameInAccount).toHaveBeenCalledWith(
              trimmedName,
              accountId,
              userId
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Fixed pocket global uniqueness', () => {
    it('should reject creation of second fixed pocket for the same user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // First fixed pocket name
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // Second fixed pocket name
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId1
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId2
          validHexColor(),
          async (fixedName1: string, fixedName2: string, currency: Currency, userId: string, accountId1: string, accountId2: string, color: string) => {
            // Skip if accounts are the same (covered by pocket name uniqueness test)
            if (accountId1 === accountId2) {
              return;
            }

            // Create two different normal accounts
            const account1 = new Account(
              accountId1,
              'Test Account 1',
              color,
              currency,
              0,
              'normal'
            );

            const account2 = new Account(
              accountId2,
              'Test Account 2',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string) => {
                if (id === accountId1) return account1;
                if (id === accountId2) return account2;
                return null;
              }),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              // No name conflicts within accounts
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              // Fixed pocket already exists for this user
              existsFixedPocketForUser: jest.fn().mockResolvedValue(true),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            // Try to create second fixed pocket in a different account
            const dto: CreatePocketDTO = {
              accountId: accountId2,
              name: fixedName2.trim(),
              type: 'fixed',
              currency,
            };

            // Should fail because user already has a fixed pocket
            await expect(useCase.execute(dto, userId)).rejects.toThrow(ConflictError);
            await expect(useCase.execute(dto, userId)).rejects.toThrow('Only one fixed pocket is allowed per user');

            // Verify that existsFixedPocketForUser was called
            expect(mockPocketRepo.existsFixedPocketForUser).toHaveBeenCalledWith(userId);

            // Verify that save was NOT called since uniqueness check failed
            expect(mockPocketRepo.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow first fixed pocket creation for user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          validHexColor(),
          async (fixedName: string, currency: Currency, userId: string, accountId: string, color: string) => {
            // Create a normal account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              // No fixed pocket exists yet
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            const dto: CreatePocketDTO = {
              accountId,
              name: fixedName.trim(),
              type: 'fixed',
              currency,
            };

            // Should succeed since no fixed pocket exists yet
            const result = await useCase.execute(dto, userId);

            expect(result.name).toBe(fixedName.trim());
            expect(result.type).toBe('fixed');
            expect(result.accountId).toBe(accountId);
            expect(mockPocketRepo.save).toHaveBeenCalled();
            expect(mockPocketRepo.existsFixedPocketForUser).toHaveBeenCalledWith(userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow different users to each have their own fixed pocket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId1
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId2
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId1
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId2
          validHexColor(),
          async (fixedName: string, currency: Currency, userId1: string, userId2: string, accountId1: string, accountId2: string, color: string) => {
            // Skip if users are the same
            if (userId1 === userId2) {
              return;
            }

            // Create two different normal accounts
            const account1 = new Account(
              accountId1,
              'Test Account 1',
              color,
              currency,
              0,
              'normal'
            );

            const account2 = new Account(
              accountId2,
              'Test Account 2',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string) => {
                if (id === accountId1) return account1;
                if (id === accountId2) return account2;
                return null;
              }),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              // Each user checks their own fixed pocket existence
              existsFixedPocketForUser: jest.fn().mockImplementation(async (userId: string) => {
                // User1 already has a fixed pocket, User2 doesn't
                return userId === userId1;
              }),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            // User1 tries to create second fixed pocket - should fail
            const dto1: CreatePocketDTO = {
              accountId: accountId1,
              name: fixedName.trim(),
              type: 'fixed',
              currency,
            };

            await expect(useCase.execute(dto1, userId1)).rejects.toThrow(ConflictError);

            // User2 tries to create their first fixed pocket - should succeed
            const dto2: CreatePocketDTO = {
              accountId: accountId2,
              name: fixedName.trim(),
              type: 'fixed',
              currency,
            };

            const result = await useCase.execute(dto2, userId2);

            expect(result.name).toBe(fixedName.trim());
            expect(result.type).toBe('fixed');
            expect(result.accountId).toBe(accountId2);
            expect(mockPocketRepo.save).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce fixed pocket uniqueness regardless of account', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ), // Multiple account IDs
          validHexColor(),
          async (fixedName1: string, fixedName2: string, currency: Currency, userId: string, accountIds: string[], color: string) => {
            // Ensure unique account IDs
            const uniqueAccountIds = [...new Set(accountIds)];
            if (uniqueAccountIds.length < 2) {
              return;
            }

            // Create multiple normal accounts
            const accounts = uniqueAccountIds.map((id, index) => 
              new Account(
                id,
                `Test Account ${index + 1}`,
                color,
                currency,
                0,
                'normal'
              )
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockImplementation(async (id: string) => {
                return accounts.find(acc => acc.id === id) || null;
              }),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              // Fixed pocket exists after first creation
              existsFixedPocketForUser: jest.fn().mockResolvedValue(true),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            // Try to create fixed pockets in different accounts
            for (let i = 0; i < Math.min(3, uniqueAccountIds.length); i++) {
              const dto: CreatePocketDTO = {
                accountId: uniqueAccountIds[i],
                name: i === 0 ? fixedName1.trim() : fixedName2.trim(),
                type: 'fixed',
                currency,
              };

              // All attempts should fail because user already has a fixed pocket
              await expect(useCase.execute(dto, userId)).rejects.toThrow(ConflictError);
              await expect(useCase.execute(dto, userId)).rejects.toThrow('Only one fixed pocket is allowed per user');
            }

            // Verify that save was never called
            expect(mockPocketRepo.save).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not enforce fixed pocket uniqueness for normal pockets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          validHexColor(),
          async (pocketName: string, currency: Currency, userId: string, accountId: string, color: string) => {
            // Create a normal account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              // Fixed pocket exists, but we're creating a normal pocket
              existsFixedPocketForUser: jest.fn().mockResolvedValue(true),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);

            const dto: CreatePocketDTO = {
              accountId,
              name: pocketName.trim(),
              type: 'normal', // Creating normal pocket
              currency,
            };

            // Should succeed even though user has a fixed pocket
            const result = await useCase.execute(dto, userId);

            expect(result.name).toBe(pocketName.trim());
            expect(result.type).toBe('normal');
            expect(mockPocketRepo.save).toHaveBeenCalled();
            // Should NOT check fixed pocket uniqueness for normal pockets
            expect(mockPocketRepo.existsFixedPocketForUser).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
