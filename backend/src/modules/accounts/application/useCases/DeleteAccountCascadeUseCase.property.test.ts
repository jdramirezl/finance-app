/**
 * Property-Based Tests for DeleteAccountCascadeUseCase
 * 
 * Feature: backend-migration, Property 8: Cascade delete
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * These tests verify that cascade delete properly handles all related entities
 * using bulk operations.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { DeleteAccountCascadeUseCase } from './DeleteAccountCascadeUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { Account } from '../../domain/Account';
import type { Currency } from '@shared-backend/types';

interface IPocketRepository {
  findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; type: string }>>;
  deleteByAccountId(accountId: string, userId: string): Promise<number>;
}

interface ISubPocketRepository {
  deleteByPocketIds(pocketIds: string[], userId: string): Promise<number>;
}

interface IMovementRepository {
  markAsOrphanedByAccountId(accountId: string, accountName: string, accountCurrency: any, userId: string): Promise<number>;
  deleteByAccountId(accountId: string, userId: string): Promise<number>;
}

describe('DeleteAccountCascadeUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  const validHexColor = () =>
    fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    ).map(([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );

  describe('Property 8: Cascade delete', () => {
    it('should orphan movements when deleteMovements is false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.uuid(),
          fc.integer({ min: 0, max: 10 }), // numPockets
          fc.integer({ min: 0, max: 5 }),  // numSubPockets
          fc.integer({ min: 0, max: 20 }), // numMovements
          async (name, color, currency, userId, accountId, numPockets, numSubPockets, numMovements) => {
            const account = new Account(accountId, name.trim(), color, currency, 0, 'normal');
            const pockets = Array.from({ length: numPockets }, (_, i) => ({
              id: `pocket-${i}`, accountId, type: i === 0 ? 'fixed' : 'normal',
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([account]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              archive: jest.fn().mockResolvedValue(undefined),
              unarchive: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
              getDistinctActiveSymbols: jest.fn().mockResolvedValue([]),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              deleteByAccountId: jest.fn().mockResolvedValue(numPockets),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              deleteByPocketIds: jest.fn().mockResolvedValue(numSubPockets),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              markAsOrphanedByAccountId: jest.fn().mockResolvedValue(numMovements),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(accountId, { deleteMovements: false }, userId);

            // Verify bulk operations called correctly
            expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
            expect(mockSubPocketRepo.deleteByPocketIds).toHaveBeenCalledWith(
              pockets.map(p => p.id), userId
            );
            expect(mockPocketRepo.deleteByAccountId).toHaveBeenCalledWith(accountId, userId);
            expect(mockMovementRepo.markAsOrphanedByAccountId).toHaveBeenCalledWith(
              accountId, name.trim(), currency, userId
            );
            expect(mockMovementRepo.deleteByAccountId).not.toHaveBeenCalled();
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);

            // Verify result counts
            expect(result).toEqual({
              account: name.trim(),
              pockets: numPockets,
              subPockets: numSubPockets,
              movements: numMovements,
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should hard delete movements when deleteMovements is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.uuid(),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 20 }),
          async (name, color, currency, userId, accountId, numPockets, numSubPockets, numMovements) => {
            const account = new Account(accountId, name.trim(), color, currency, 0, 'normal');
            const pockets = Array.from({ length: numPockets }, (_, i) => ({
              id: `pocket-${i}`, accountId, type: 'normal',
            }));

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([account]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              archive: jest.fn().mockResolvedValue(undefined),
              unarchive: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
              getDistinctActiveSymbols: jest.fn().mockResolvedValue([]),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              deleteByAccountId: jest.fn().mockResolvedValue(numPockets),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              deleteByPocketIds: jest.fn().mockResolvedValue(numSubPockets),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              markAsOrphanedByAccountId: jest.fn().mockResolvedValue(0),
              deleteByAccountId: jest.fn().mockResolvedValue(numMovements),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(accountId, { deleteMovements: true }, userId);

            expect(mockMovementRepo.deleteByAccountId).toHaveBeenCalledWith(accountId, userId);
            expect(mockMovementRepo.markAsOrphanedByAccountId).not.toHaveBeenCalled();
            expect(mockAccountRepo.delete).toHaveBeenCalledWith(accountId, userId);

            expect(result).toEqual({
              account: name.trim(),
              pockets: numPockets,
              subPockets: numSubPockets,
              movements: numMovements,
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw NotFoundError for non-existent account', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.boolean(),
          async (accountId, userId, deleteMovements) => {
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              archive: jest.fn().mockResolvedValue(undefined),
              unarchive: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
              getDistinctActiveSymbols: jest.fn().mockResolvedValue([]),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              deleteByPocketIds: jest.fn().mockResolvedValue(0),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              markAsOrphanedByAccountId: jest.fn().mockResolvedValue(0),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            await expect(
              useCase.execute(accountId, { deleteMovements }, userId)
            ).rejects.toThrow('Account not found');

            expect(mockPocketRepo.findByAccountId).not.toHaveBeenCalled();
            expect(mockAccountRepo.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty account (no pockets, no movements)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.uuid(),
          async (name, color, currency, userId, accountId) => {
            const account = new Account(accountId, name.trim(), color, currency, 0, 'normal');

            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([account]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              archive: jest.fn().mockResolvedValue(undefined),
              unarchive: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
              getDistinctActiveSymbols: jest.fn().mockResolvedValue([]),
            };

            const mockPocketRepo: jest.Mocked<IPocketRepository> = {
              findByAccountId: jest.fn().mockResolvedValue([]),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
            };

            const mockSubPocketRepo: jest.Mocked<ISubPocketRepository> = {
              deleteByPocketIds: jest.fn().mockResolvedValue(0),
            };

            const mockMovementRepo: jest.Mocked<IMovementRepository> = {
              markAsOrphanedByAccountId: jest.fn().mockResolvedValue(0),
              deleteByAccountId: jest.fn().mockResolvedValue(0),
            };

            const useCase = new DeleteAccountCascadeUseCase(
              mockAccountRepo,
              mockPocketRepo,
              mockSubPocketRepo,
              mockMovementRepo
            );

            const result = await useCase.execute(accountId, { deleteMovements: false }, userId);

            expect(result).toEqual({
              account: name.trim(),
              pockets: 0,
              subPockets: 0,
              movements: 0,
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
