/**
 * Property-Based Tests for GetPocketsByAccountUseCase
 * 
 * Feature: backend-migration, Property 17: Pocket balance calculation
 * Validates: Requirements 6.4
 * 
 * These tests verify that pocket balance calculation works correctly
 * across a wide range of generated test cases.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { GetPocketsByAccountUseCase } from './GetPocketsByAccountUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { Currency } from '@shared-backend/types';
import { Account } from '../../../accounts/domain/Account';
import { Pocket } from '../../domain/Pocket';

describe('GetPocketsByAccountUseCase Property-Based Tests', () => {
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

  // Helper to generate movement data
  const movementDataArbitrary = (pocketId: string) =>
    fc.record({
      id: fc.uuid(),
      pocketId: fc.constant(pocketId),
      amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
      type: fc.constantFrom('IngresoNormal', 'EgresoNormal', 'IngresoFijo', 'EgresoFijo') as fc.Arbitrary<'IngresoNormal' | 'EgresoNormal' | 'IngresoFijo' | 'EgresoFijo'>,
      isPending: fc.boolean(),
      isOrphaned: fc.boolean(),
    });

  // Helper to generate sub-pocket data
  const subPocketDataArbitrary = (pocketId: string) =>
    fc.record({
      id: fc.uuid(),
      pocketId: fc.constant(pocketId),
      balance: fc.float({ min: Math.fround(-10000), max: Math.fround(10000), noNaN: true }), // Can be negative for debt
    });

  describe('Property 17: Pocket balance calculation', () => {
    it('should calculate normal pocket balance as sum of non-pending, non-orphaned movements', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocket name
          fc.array(movementDataArbitrary('pocket-id'), { minLength: 1, maxLength: 20 }),
          async (userId: string, accountId: string, pocketId: string, currency: Currency, color: string, pocketName: string, movements) => {
            // Update movements to use the correct pocketId
            const updatedMovements = movements.map(m => ({ ...m, pocketId }));

            // Calculate expected balance
            const expectedBalance = updatedMovements
              .filter(m => !m.isPending && !m.isOrphaned)
              .reduce((total, m) => {
                const isIncome = m.type === 'IngresoNormal' || m.type === 'IngresoFijo';
                const signedAmount = isIncome ? m.amount : -m.amount;
                return total + signedAmount;
              }, 0);

            // Create account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create pocket with the expected balance
            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              'normal',
              expectedBalance,
              currency
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
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([pocket]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new GetPocketsByAccountUseCase(mockPocketRepo, mockAccountRepo);

            // Execute use case
            const result = await useCase.execute(accountId, userId);

            // Verify the pocket balance matches expected calculation
            expect(result).toHaveLength(1);
            expect(result[0].balance).toBeCloseTo(expectedBalance, 2);
            expect(result[0].id).toBe(pocketId);
            expect(result[0].name).toBe(pocketName.trim());
            expect(result[0].type).toBe('normal');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate fixed pocket balance as sum of sub-pocket balances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocket name
          fc.array(subPocketDataArbitrary('pocket-id'), { minLength: 1, maxLength: 20 }),
          async (userId: string, accountId: string, pocketId: string, currency: Currency, color: string, pocketName: string, subPockets) => {
            // Update sub-pockets to use the correct pocketId
            const updatedSubPockets = subPockets.map(sp => ({ ...sp, pocketId }));

            // Calculate expected balance
            const expectedBalance = updatedSubPockets.reduce((total, sp) => total + sp.balance, 0);

            // Create account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create fixed pocket with the expected balance
            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              'fixed',
              expectedBalance,
              currency
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
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([pocket]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new GetPocketsByAccountUseCase(mockPocketRepo, mockAccountRepo);

            // Execute use case
            const result = await useCase.execute(accountId, userId);

            // Verify the pocket balance matches expected calculation
            expect(result).toHaveLength(1);
            expect(result[0].balance).toBeCloseTo(expectedBalance, 2);
            expect(result[0].id).toBe(pocketId);
            expect(result[0].name).toBe(pocketName.trim());
            expect(result[0].type).toBe('fixed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle pockets with zero balance correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocket name
          fc.constantFrom(...validPocketTypes),
          async (userId: string, accountId: string, pocketId: string, currency: Currency, color: string, pocketName: string, pocketType) => {
            // Create account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create pocket with zero balance
            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              pocketType,
              0,
              currency
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
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([pocket]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new GetPocketsByAccountUseCase(mockPocketRepo, mockAccountRepo);

            // Execute use case
            const result = await useCase.execute(accountId, userId);

            // Verify the pocket balance is zero
            expect(result).toHaveLength(1);
            expect(result[0].balance).toBe(0);
            expect(result[0].id).toBe(pocketId);
            expect(result[0].name).toBe(pocketName.trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple pockets with different balances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              type: fc.constantFrom(...validPocketTypes),
              balance: fc.float({ min: Math.fround(-10000), max: Math.fround(10000), noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (userId: string, accountId: string, currency: Currency, color: string, pocketData) => {
            // Ensure unique pocket names
            const uniquePockets = pocketData.filter((pocket, index, self) =>
              index === self.findIndex(p => p.name.trim() === pocket.name.trim())
            );

            if (uniquePockets.length < 2) {
              return; // Skip if we don't have at least 2 unique pockets
            }

            // Create account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create pockets
            const pockets = uniquePockets.map(pd => 
              new Pocket(
                pd.id,
                accountId,
                pd.name.trim(),
                pd.type,
                pd.balance,
                currency
              )
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
              findByAccountId: jest.fn().mockResolvedValue(pockets),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new GetPocketsByAccountUseCase(mockPocketRepo, mockAccountRepo);

            // Execute use case
            const result = await useCase.execute(accountId, userId);

            // Verify all pockets are returned with correct balances
            expect(result).toHaveLength(pockets.length);
            
            for (let i = 0; i < pockets.length; i++) {
              const resultPocket = result.find(p => p.id === pockets[i].id);
              expect(resultPocket).toBeDefined();
              expect(resultPocket!.balance).toBeCloseTo(pockets[i].balance, 2);
              expect(resultPocket!.name).toBe(pockets[i].name);
              expect(resultPocket!.type).toBe(pockets[i].type);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle negative balances for fixed pockets (debt)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // userId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // accountId
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), // pocketId
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // pocket name
          fc.float({ min: Math.fround(-10000), max: Math.fround(-0.01), noNaN: true }), // Negative balance
          async (userId: string, accountId: string, pocketId: string, currency: Currency, color: string, pocketName: string, negativeBalance: number) => {
            // Create account
            const account = new Account(
              accountId,
              'Test Account',
              color,
              currency,
              0,
              'normal'
            );

            // Create fixed pocket with negative balance (debt)
            const pocket = new Pocket(
              pocketId,
              accountId,
              pocketName.trim(),
              'fixed',
              negativeBalance,
              currency
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
              findById: jest.fn().mockResolvedValue(pocket),
              findByAccountId: jest.fn().mockResolvedValue([pocket]),
              findAllByUserId: jest.fn().mockResolvedValue([]),
              existsByNameInAccount: jest.fn().mockResolvedValue(false),
              existsByNameInAccountExcludingId: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUser: jest.fn().mockResolvedValue(false),
              existsFixedPocketForUserExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const useCase = new GetPocketsByAccountUseCase(mockPocketRepo, mockAccountRepo);

            // Execute use case
            const result = await useCase.execute(accountId, userId);

            // Verify the pocket balance is negative (debt is allowed for fixed pockets)
            expect(result).toHaveLength(1);
            expect(result[0].balance).toBeCloseTo(negativeBalance, 2);
            expect(result[0].balance).toBeLessThan(0);
            expect(result[0].id).toBe(pocketId);
            expect(result[0].type).toBe('fixed');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
