/**
 * Property-Based Tests for DeletePocketUseCase
 * 
 * Feature: backend-migration, Property 18: Pocket deletion orphans movements
 * Validates: Requirements 6.5
 * 
 * These tests verify that when a pocket is deleted, all associated movements
 * are properly marked as orphaned via bulk operation.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { DeletePocketUseCase } from './DeletePocketUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import type { Currency } from '@shared-backend/types';

interface IMovementRepository {
  markAsOrphanedByPocketId(pocketId: string, pocketName: string, userId: string): Promise<number>;
}

describe('DeletePocketUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
  const validPocketTypes: ('normal' | 'fixed')[] = ['normal', 'fixed'];

  describe('Property 18: Pocket deletion orphans movements', () => {
    it('should mark all movements as orphaned when deleting a pocket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocketName
          fc.constantFrom(...validPocketTypes),
          fc.constantFrom(...validCurrencies),
          fc.float({ min: 0, max: 100000 }), // balance
          fc.integer({ min: 1, max: 50 }), // numMovements orphaned
          async (pocketId, userId, accountId, pocketName, pocketType, currency, balance, numMovements) => {
            const pocket = new Pocket(pocketId, accountId, pocketName.trim(), pocketType, balance, currency);

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketInAccount: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
              archive: jest.fn().mockResolvedValue(undefined),
              unarchive: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              markAsOrphanedByPocketId: jest.fn().mockResolvedValue(numMovements),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);
            await useCase.execute(pocketId, userId);

            expect(mockMovementRepo.markAsOrphanedByPocketId).toHaveBeenCalledWith(pocketId, pocketName.trim(), userId);
            expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
            expect(mockPocketRepo.delete).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should delete pocket successfully when no movements exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validPocketTypes),
          fc.constantFrom(...validCurrencies),
          fc.float({ min: 0, max: 100000 }),
          async (pocketId, userId, accountId, pocketName, pocketType, currency, balance) => {
            const pocket = new Pocket(pocketId, accountId, pocketName.trim(), pocketType, balance, currency);

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketInAccount: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
              archive: jest.fn().mockResolvedValue(undefined),
              unarchive: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              markAsOrphanedByPocketId: jest.fn().mockResolvedValue(0),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);
            await useCase.execute(pocketId, userId);

            expect(mockMovementRepo.markAsOrphanedByPocketId).toHaveBeenCalledWith(pocketId, pocketName.trim(), userId);
            expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should work for both normal and fixed pocket types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom(...validPocketTypes),
          fc.constantFrom(...validCurrencies),
          fc.float({ min: 0, max: 100000 }),
          async (pocketId, userId, accountId, pocketName, pocketType, currency, balance) => {
            const pocket = new Pocket(pocketId, accountId, pocketName.trim(), pocketType, balance, currency);

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketInAccount: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
              archive: jest.fn().mockResolvedValue(undefined),
              unarchive: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              markAsOrphanedByPocketId: jest.fn().mockResolvedValue(3),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);
            await useCase.execute(pocketId, userId);

            // Behavior is the same for both pocket types
            expect(mockMovementRepo.markAsOrphanedByPocketId).toHaveBeenCalledWith(pocketId, pocketName.trim(), userId);
            expect(mockPocketRepo.delete).toHaveBeenCalledWith(pocketId, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw NotFoundError for non-existent pocket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          async (pocketId, userId) => {
            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findByAccountId: jest.fn().mockResolvedValue([]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketInAccount: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
              archive: jest.fn().mockResolvedValue(undefined),
              unarchive: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              markAsOrphanedByPocketId: jest.fn().mockResolvedValue(0),
            };

            const useCase = new DeletePocketUseCase(mockPocketRepo, mockMovementRepo);

            await expect(useCase.execute(pocketId, userId)).rejects.toThrow('Pocket not found');
            expect(mockMovementRepo.markAsOrphanedByPocketId).not.toHaveBeenCalled();
            expect(mockPocketRepo.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
