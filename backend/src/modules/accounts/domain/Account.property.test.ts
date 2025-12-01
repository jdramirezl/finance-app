/**
 * Property-Based Tests for Account Entity
 * 
 * Feature: backend-migration, Property 5: Account validation rejects invalid inputs
 * Validates: Requirements 4.1
 * 
 * These tests verify that account validation correctly rejects invalid inputs
 * across a wide range of generated test cases.
 */

import fc from 'fast-check';
import { Account } from './Account';
import type { Currency } from '@shared-backend/types';

describe('Account Property-Based Tests', () => {
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

  describe('Property 5: Account validation rejects invalid inputs', () => {
    it('should reject empty or whitespace-only names', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.string().filter(s => s.trim() === '')
          ),
          fc.constantFrom(...validCurrencies),
          validHexColor(),
          (invalidName: string, currency: Currency, color: string) => {
            expect(() => {
              new Account('test-id', invalidName, color, currency, 0);
            }).toThrow('Account name cannot be empty');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid color formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('invalid'),
            fc.constant('#12345'), // Too short
            fc.constant('#1234567'), // Too long
            fc.constant('3b82f6'), // Missing #
            fc.constant('#GGGGGG'), // Invalid hex
            fc.string().filter(s => !s.match(/^#[0-9A-Fa-f]{6}$/))
          ),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1 }),
          (invalidColor: string, currency: Currency, name: string) => {
            expect(() => {
              new Account('test-id', name, invalidColor, currency, 0);
            }).toThrow('Invalid color format');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid currencies', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('INVALID' as Currency),
            fc.constant('JPY' as Currency),
            fc.constant('CNY' as Currency),
            fc.string().filter(s => !validCurrencies.includes(s as Currency)) as fc.Arbitrary<Currency>
          ),
          fc.string({ minLength: 1 }),
          validHexColor(),
          (invalidCurrency: Currency, name: string, color: string) => {
            expect(() => {
              new Account('test-id', name, color, invalidCurrency, 0);
            }).toThrow('Invalid currency');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject investment accounts without stock symbol', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          (name: string, color: string, currency: Currency) => {
            expect(() => {
              new Account('test-id', name, color, currency, 0, 'investment', undefined);
            }).toThrow('Investment accounts must have a stock symbol');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject investment accounts with empty stock symbol', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.string().filter(s => s.trim() === '')
          ),
          (name: string, color: string, currency: Currency, emptySymbol: string) => {
            expect(() => {
              new Account('test-id', name, color, currency, 0, 'investment', emptySymbol);
            }).toThrow('Investment accounts must have a stock symbol');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative shares for investment accounts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ max: -1 }),
          (name: string, color: string, currency: Currency, stockSymbol: string, negativeShares: number) => {
            expect(() => {
              new Account(
                'test-id',
                name,
                color,
                currency,
                0,
                'investment',
                stockSymbol,
                undefined,
                negativeShares
              );
            }).toThrow('Shares cannot be negative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative investment amounts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.integer({ max: -1 }),
          (name: string, color: string, currency: Currency, stockSymbol: string, negativeAmount: number) => {
            expect(() => {
              new Account(
                'test-id',
                name,
                color,
                currency,
                0,
                'investment',
                stockSymbol,
                negativeAmount
              );
            }).toThrow('Investment amount cannot be negative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject negative display orders', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.integer({ max: -1 }),
          (name: string, color: string, currency: Currency, negativeOrder: number) => {
            expect(() => {
              new Account(
                'test-id',
                name,
                color,
                currency,
                0,
                'normal',
                undefined,
                undefined,
                undefined,
                negativeOrder
              );
            }).toThrow('Display order cannot be negative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid account configurations', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          validHexColor(),
          fc.constantFrom(...validCurrencies),
          fc.constantFrom('normal' as const, 'investment' as const),
          fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          fc.option(fc.integer({ min: 0 }), { nil: undefined }),
          fc.option(fc.integer({ min: 0 }), { nil: undefined }),
          fc.option(fc.integer({ min: 0 }), { nil: undefined }),
          (
            name: string,
            color: string,
            currency: Currency,
            type: 'normal' | 'investment',
            stockSymbol: string | undefined,
            montoInvertido: number | undefined,
            shares: number | undefined,
            displayOrder: number | undefined
          ) => {
            // Skip invalid combinations
            if (type === 'investment' && !stockSymbol) {
              return; // This would be invalid, skip
            }

            const account = new Account(
              'test-id',
              name,
              color,
              currency,
              0,
              type,
              stockSymbol,
              montoInvertido,
              shares,
              displayOrder
            );

            expect(account.name).toBe(name);
            expect(account.color).toBe(color);
            expect(account.currency).toBe(currency);
            expect(account.type).toBe(type);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
