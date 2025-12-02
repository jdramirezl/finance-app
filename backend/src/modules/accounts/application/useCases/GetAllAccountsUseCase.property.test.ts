/**
 * Property-Based Tests for GetAllAccountsUseCase
 * 
 * Feature: backend-migration, Property 7: Account balance calculation
 * Validates: Requirements 4.4
 * 
 * These tests verify that account balance calculation is correct across
 * a wide range of generated test cases.
 */

import 'reflect-metadata';
import fc from 'fast-check';
import { GetAllAccountsUseCase } from './GetAllAccountsUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { Account } from '../../domain/Account';
import type { Currency } from '@shared-backend/types';

describe('GetAllAccountsUseCase Property-Based Tests', () => {
  const validCurrencies: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

  // Helper to generate valid hex colors
  const validHexColor = () => 
    fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    ).map(([r, g, b]) => 
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );

  // Helper to generate pocket data
  const pocketDataArbitrary = (accountId: string) =>
    fc.record({
      id: fc.uuid(),
      accountId: fc.constant(accountId),
      balance: fc.float({ min: -10000, max: 10000, noNaN: true }),
    });

  describe('Property 7: Account balance calculation', () => {
    it('should calculate account balance as sum of pocket balances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.array(fc.record({
            id: fc.uuid(),
            balance: fc.float({ min: -10000, max: 10000, noNaN: true }),
          }), { minLength: 0, maxLength: 10 }),
          async (name: string, color: string, currency: Currency, userId: string, accountId: string, pocketBalances) => {
            // Create account with initial balance of 0
            const account = new Account(
              accountId,
              name.trim(),
              color,
              currency,
              0, // Initial balance
              'normal'
            );

            // Create pockets with the generated balances
            const pockets = pocketBalances.map(pb => ({
              id: pb.id,
              accountId: accountId,
              balance: pb.balance,
            }));

            // Calculate expected balance (sum of all pocket balances)
            const expectedBalance = pockets.reduce((sum, pocket) => sum + pocket.balance, 0);

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([account]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
            };

            const mockStockPriceService = {
              getCurrentPrice: jest.fn().mockResolvedValue(100),
            };

            const useCase = new GetAllAccountsUseCase(
              mockAccountRepo,
              mockPocketRepo as any,
              mockStockPriceService as any
            );

            // Execute the use case
            const result = await useCase.execute(userId);

            // Verify that the account balance equals the sum of pocket balances
            expect(result).toHaveLength(1);
            expect(result[0].balance).toBeCloseTo(expectedBalance, 5);
            
            // Verify that pockets were fetched for the account
            expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle accounts with no pockets (balance should be 0)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          async (name: string, color: string, currency: Currency, userId: string, accountId: string) => {
            // Create account with initial balance of 0
            const account = new Account(
              accountId,
              name.trim(),
              color,
              currency,
              0,
              'normal'
            );

            // No pockets
            const pockets: any[] = [];

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([account]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
            };

            const mockStockPriceService = {
              getCurrentPrice: jest.fn().mockResolvedValue(100),
            };

            const useCase = new GetAllAccountsUseCase(
              mockAccountRepo,
              mockPocketRepo as any,
              mockStockPriceService as any
            );

            // Execute the use case
            const result = await useCase.execute(userId);

            // Verify that the account balance is 0 when there are no pockets
            expect(result).toHaveLength(1);
            expect(result[0].balance).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple accounts with different pocket configurations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              color: validHexColor(),
              currency: fc.constantFrom(...validCurrencies),
              accountId: fc.uuid(),
              pockets: fc.array(
                fc.record({
                  id: fc.uuid(),
                  balance: fc.float({ min: -10000, max: 10000, noNaN: true }),
                }),
                { minLength: 0, maxLength: 5 }
              ),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (userId: string, accountConfigs) => {
            // Create accounts
            const accounts = accountConfigs.map(config => 
              new Account(
                config.accountId,
                config.name.trim(),
                config.color,
                config.currency,
                0,
                'normal'
              )
            );

            // Create pockets for each account
            const pocketsByAccount = new Map<string, any[]>();
            accountConfigs.forEach(config => {
              const pockets = config.pockets.map(p => ({
                id: p.id,
                accountId: config.accountId,
                balance: p.balance,
              }));
              pocketsByAccount.set(config.accountId, pockets);
            });

            // Calculate expected balances
            const expectedBalances = new Map<string, number>();
            accountConfigs.forEach(config => {
              const pockets = pocketsByAccount.get(config.accountId) || [];
              const balance = pockets.reduce((sum, p) => sum + p.balance, 0);
              expectedBalances.set(config.accountId, balance);
            });

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(null),
              findAllByUserId: jest.fn().mockResolvedValue(accounts),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo = {
              findByAccountId: jest.fn().mockImplementation(async (accountId: string) => {
                return pocketsByAccount.get(accountId) || [];
              }),
            };

            const mockStockPriceService = {
              getCurrentPrice: jest.fn().mockResolvedValue(100),
            };

            const useCase = new GetAllAccountsUseCase(
              mockAccountRepo,
              mockPocketRepo as any,
              mockStockPriceService as any
            );

            // Execute the use case
            const result = await useCase.execute(userId);

            // Verify that each account has the correct balance
            expect(result).toHaveLength(accounts.length);
            result.forEach(accountDTO => {
              const expectedBalance = expectedBalances.get(accountDTO.id) || 0;
              expect(accountDTO.balance).toBeCloseTo(expectedBalance, 5);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle accounts with positive and negative pocket balances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.uuid(), // accountId
          fc.array(
            fc.record({
              id: fc.uuid(),
              balance: fc.oneof(
                fc.float({ min: Math.fround(-10000), max: Math.fround(-0.01), noNaN: true }), // Negative
                fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true })    // Positive
              ),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (name: string, color: string, currency: Currency, userId: string, accountId: string, pocketBalances) => {
            // Ensure we have at least one positive and one negative balance
            const hasPositive = pocketBalances.some(p => p.balance > 0);
            const hasNegative = pocketBalances.some(p => p.balance < 0);
            
            if (!hasPositive || !hasNegative) {
              return; // Skip this test case
            }

            // Create account
            const account = new Account(
              accountId,
              name.trim(),
              color,
              currency,
              0,
              'normal'
            );

            // Create pockets
            const pockets = pocketBalances.map(pb => ({
              id: pb.id,
              accountId: accountId,
              balance: pb.balance,
            }));

            // Calculate expected balance
            const expectedBalance = pockets.reduce((sum, pocket) => sum + pocket.balance, 0);

            // Create mock repositories
            const mockAccountRepo: jest.Mocked<IAccountRepository> = {
              save: jest.fn().mockResolvedValue(undefined),
              findById: jest.fn().mockResolvedValue(account),
              findAllByUserId: jest.fn().mockResolvedValue([account]),
              existsByNameAndCurrency: jest.fn().mockResolvedValue(false),
              existsByNameAndCurrencyExcludingId: jest.fn().mockResolvedValue(false),
              update: jest.fn().mockResolvedValue(undefined),
              delete: jest.fn().mockResolvedValue(undefined),
              updateDisplayOrders: jest.fn().mockResolvedValue(undefined),
            };

            const mockPocketRepo = {
              findByAccountId: jest.fn().mockResolvedValue(pockets),
            };

            const mockStockPriceService = {
              getCurrentPrice: jest.fn().mockResolvedValue(100),
            };

            const useCase = new GetAllAccountsUseCase(
              mockAccountRepo,
              mockPocketRepo as any,
              mockStockPriceService as any
            );

            // Execute the use case
            const result = await useCase.execute(userId);

            // Verify that the balance correctly handles positive and negative values
            expect(result).toHaveLength(1);
            expect(result[0].balance).toBeCloseTo(expectedBalance, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
