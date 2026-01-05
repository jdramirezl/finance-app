import { describe, it, expect } from 'vitest';
import { calculateAporteMensual, calculateSimpleMonthlyContribution } from './fixedExpenseUtils';

describe('calculateAporteMensual', () => {
    // Standard case: 0 balance
    it('should return standard monthly contribution when balance is 0', () => {
        // Total 100, 10 months -> 10/month
        const result = calculateAporteMensual(100, 10, 0);
        expect(result).toBe(10);
    });

    // Partial balance case (Mid-way)
    it('should return standard monthly contribution when balance is present but not near cap', () => {
        // Total 100, 10 months, Balance 50 -> Still 10/month (standard path)
        const result = calculateAporteMensual(100, 10, 50);
        expect(result).toBe(10);
    });

    // Capping case: Near End
    it('should cap the contribution to the remaining amount if less than standard', () => {
        // Total 100, 10 months, Balance 95.
        // Standard = 10. Remaining = 5.
        // Should return 5.
        const result = calculateAporteMensual(100, 10, 95);
        expect(result).toBe(5);
    });

    // Overfilled case
    it('should return 0 if balance exceeds or equals total', () => {
        // Total 100, Balance 100 -> 0
        expect(calculateAporteMensual(100, 10, 100)).toBe(0);

        // Total 100, Balance 120 -> 0
        expect(calculateAporteMensual(100, 10, 120)).toBe(0);
    });

    // Negative balance case
    it('should treat negative balance as 0 for the contribution calculation (debt is handled externally)', () => {
        // Total 100, 10 months, Balance -50.
        // Logic should calculate standard contribution (10) based on 0 balance.
        // The external page logic adds the debt (+50) to this result.
        const result = calculateAporteMensual(100, 10, -50);
        expect(result).toBe(10);
    });

    // Edge case: 0 periodicity
    it('should return 0 if periodicity is 0 to avoid division by zero', () => {
        expect(calculateAporteMensual(100, 0, 0)).toBe(0);
    });
});

describe('calculateSimpleMonthlyContribution', () => {
    it('should return simple division of total by months', () => {
        expect(calculateSimpleMonthlyContribution(1200, 12)).toBe(100);
        expect(calculateSimpleMonthlyContribution(1000, 3)).toBeCloseTo(333.33, 2);
        expect(calculateSimpleMonthlyContribution(500, 5)).toBe(100);
    });

    it('should return 0 if periodicity is 0', () => {
        expect(calculateSimpleMonthlyContribution(100, 0)).toBe(0);
    });

    it('should ignore balance (unlike calculateAporteMensual)', () => {
        // This function should always return the same result regardless of balance
        expect(calculateSimpleMonthlyContribution(1200, 12)).toBe(100);
    });
});
