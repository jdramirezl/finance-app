/**
 * Property-Based Tests for Investment Account Features
 * 
 * Feature: backend-migration
 * Property 49: Investment account balance calculation
 * Property 50: Investment account updates allow share changes
 * Validates: Requirements 13.5, 13.6
 * 
 * These tests verify investment account balance calculations and updates.
 */

import fc from 'fast-check';
import { Account } from './Account';
import type { Currency } from '@shared-backend/types';

describe('Account Investment Property-Based Tests', () => {
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

  // Helper to generate valid stock symbols (1-5 uppercase letters)
  const validStockSymbol = () =>
    fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'), {
      minLength: 1,
      maxLength: 5,
    }).map(arr => arr.join(''));

  describe('Property 49: Investment account balance calculation', () => {
    it('should calculate balance as shares * currentPrice', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // shares
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // currentPrice
          (name: string, color: string, currency: Currency, symbol: string, shares: number, currentPrice: number) => {
            // Create investment account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              shares
            );

            // Calculate balance
            const calculatedBalance = account.calculateInvestmentBalance(currentPrice);

            // Balance should equal shares * currentPrice
            const expectedBalance = shares * currentPrice;
            expect(calculatedBalance).toBeCloseTo(expectedBalance, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 balance when shares is 0', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // currentPrice
          (name: string, color: string, currency: Currency, symbol: string, currentPrice: number) => {
            // Create investment account with 0 shares
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              0
            );

            // Calculate balance
            const calculatedBalance = account.calculateInvestmentBalance(currentPrice);

            // Balance should be 0
            expect(calculatedBalance).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 balance when shares is undefined', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // currentPrice
          (name: string, color: string, currency: Currency, symbol: string, currentPrice: number) => {
            // Create investment account without shares
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              undefined
            );

            // Calculate balance
            const calculatedBalance = account.calculateInvestmentBalance(currentPrice);

            // Balance should be 0
            expect(calculatedBalance).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for negative stock price', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // shares
          fc.double({ min: -10000, max: -0.01, noNaN: true }), // negative price
          (name: string, color: string, currency: Currency, symbol: string, shares: number, negativePrice: number) => {
            // Create investment account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              shares
            );

            // Should throw error for negative price
            expect(() => account.calculateInvestmentBalance(negativePrice)).toThrow('Stock price cannot be negative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when called on normal account', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // currentPrice
          (name: string, color: string, currency: Currency, currentPrice: number) => {
            // Create normal account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'normal'
            );

            // Should throw error when trying to calculate investment balance
            expect(() => account.calculateInvestmentBalance(currentPrice)).toThrow('Cannot calculate investment balance for non-investment account');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update balance correctly with updateBalanceFromStockPrice', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // shares
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // currentPrice
          (name: string, color: string, currency: Currency, symbol: string, shares: number, currentPrice: number) => {
            // Create investment account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              shares
            );

            // Update balance from stock price
            account.updateBalanceFromStockPrice(currentPrice);

            // Balance should be updated correctly
            const expectedBalance = shares * currentPrice;
            expect(account.balance).toBeCloseTo(expectedBalance, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 50: Investment account updates allow share changes', () => {
    it('should allow updating shares', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // initial shares
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // new shares
          (name: string, color: string, currency: Currency, symbol: string, initialShares: number, newShares: number) => {
            // Create investment account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              initialShares
            );

            // Update shares
            account.updateInvestmentDetails(newShares, undefined);

            // Shares should be updated
            expect(account.shares).toBe(newShares);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow updating montoInvertido', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // initial monto
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // new monto
          (name: string, color: string, currency: Currency, symbol: string, initialMonto: number, newMonto: number) => {
            // Create investment account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              initialMonto,
              undefined
            );

            // Update montoInvertido
            account.updateInvestmentDetails(undefined, newMonto);

            // MontoInvertido should be updated
            expect(account.montoInvertido).toBe(newMonto);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow updating both shares and montoInvertido', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // new shares
          fc.double({ min: 0.01, max: 10000, noNaN: true }), // new monto
          (name: string, color: string, currency: Currency, symbol: string, newShares: number, newMonto: number) => {
            // Create investment account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              undefined
            );

            // Update both
            account.updateInvestmentDetails(newShares, newMonto);

            // Both should be updated
            expect(account.shares).toBe(newShares);
            expect(account.montoInvertido).toBe(newMonto);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative shares', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: -1000, max: -0.01, noNaN: true }), // negative shares
          (name: string, color: string, currency: Currency, symbol: string, negativeShares: number) => {
            // Create investment account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              undefined
            );

            // Should throw error for negative shares
            expect(() => account.updateInvestmentDetails(negativeShares, undefined)).toThrow('Shares cannot be negative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative montoInvertido', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          validStockSymbol(),
          fc.double({ min: -10000, max: -0.01, noNaN: true }), // negative monto
          (name: string, color: string, currency: Currency, symbol: string, negativeMonto: number) => {
            // Create investment account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'investment',
              symbol,
              undefined,
              undefined
            );

            // Should throw error for negative montoInvertido
            expect(() => account.updateInvestmentDetails(undefined, negativeMonto)).toThrow('Investment amount cannot be negative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when updating normal account', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.double({ min: 0.01, max: 1000, noNaN: true }), // shares
          (name: string, color: string, currency: Currency, shares: number) => {
            // Create normal account
            const account = new Account(
              'test-id',
              name.trim(),
              color,
              currency,
              0,
              'normal'
            );

            // Should throw error when trying to update investment details
            expect(() => account.updateInvestmentDetails(shares, undefined)).toThrow('Cannot update investment details on non-investment account');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
