import { describe, it, expect } from 'vitest';
import { cdCalculationService } from './cdCalculationService';
import type { CDInvestmentAccount } from '../types';

describe('CDCalculationService', () => {
  const mockCD: CDInvestmentAccount = {
    id: 'test-cd-1',
    name: 'Test CD',
    color: '#3B82F6',
    currency: 'USD',
    balance: 10000,
    type: 'cd',
    investmentType: 'cd',
    principal: 10000,
    interestRate: 4.5,
    termMonths: 12,
    maturityDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(), // 300 days from now
    compoundingFrequency: 'monthly',
    earlyWithdrawalPenalty: 3.0,
    cdCreatedAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(), // 65 days ago
  };

  describe('calculateCurrentValue', () => {
    it('should calculate current value for a new CD', () => {
      const result = cdCalculationService.calculateCurrentValue(mockCD);
      
      expect(result.currentValue).toBeGreaterThan(mockCD.principal);
      expect(result.accruedInterest).toBeGreaterThanOrEqual(0);
      expect(result.totalInterest).toBeGreaterThan(0);
      expect(result.daysToMaturity).toBeGreaterThan(0);
      expect(result.isMatured).toBe(false);
      expect(result.effectiveYield).toBeGreaterThan(0);
    });

    it('should handle matured CD', () => {
      const maturedCD: CDInvestmentAccount = {
        ...mockCD,
        maturityDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        cdCreatedAt: new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString(), // Over a year ago
      };

      const result = cdCalculationService.calculateCurrentValue(maturedCD);
      
      expect(result.isMatured).toBe(true);
      expect(result.daysToMaturity).toBe(0);
      expect(result.currentValue).toBeGreaterThan(maturedCD.principal);
    });
  });

  describe('calculateCompoundInterest', () => {
    it('should calculate compound interest correctly', () => {
      const result = cdCalculationService.calculateCompoundInterest(
        10000, // principal
        0.045, // 4.5% annual rate
        365, // 1 year in days
        'monthly'
      );

      expect(result.finalAmount).toBeCloseTo(10459.08, 2); // Actual monthly compounding result
      expect(result.interestEarned).toBeCloseTo(459.08, 2);
    });

    it('should handle daily compounding', () => {
      const result = cdCalculationService.calculateCompoundInterest(
        10000,
        0.045,
        365,
        'daily'
      );

      expect(result.finalAmount).toBeCloseTo(10459.93, 2); // Daily compounding result
      expect(result.interestEarned).toBeCloseTo(459.93, 2);
      // Daily compounding should yield more than monthly
      const monthlyResult = cdCalculationService.calculateCompoundInterest(10000, 0.045, 365, 'monthly');
      expect(result.finalAmount).toBeGreaterThan(monthlyResult.finalAmount);
    });

    it('should return principal for zero days', () => {
      const result = cdCalculationService.calculateCompoundInterest(
        10000,
        0.045,
        0,
        'monthly'
      );

      expect(result.finalAmount).toBe(10000);
      expect(result.interestEarned).toBe(0);
    });
  });

  describe('calculateEarlyWithdrawalPenalty', () => {
    it('should calculate penalty correctly', () => {
      const penalty = cdCalculationService.calculateEarlyWithdrawalPenalty(mockCD);
      
      expect(penalty).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 penalty for matured CD', () => {
      const maturedCD: CDInvestmentAccount = {
        ...mockCD,
        maturityDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };

      const penalty = cdCalculationService.calculateEarlyWithdrawalPenalty(maturedCD);
      
      expect(penalty).toBe(0);
    });

    it('should return 0 penalty when no penalty is set', () => {
      const noPenaltyCD: CDInvestmentAccount = {
        ...mockCD,
        earlyWithdrawalPenalty: undefined,
      };

      const penalty = cdCalculationService.calculateEarlyWithdrawalPenalty(noPenaltyCD);
      
      expect(penalty).toBe(0);
    });
  });

  describe('isNearMaturity', () => {
    it('should detect CD near maturity', () => {
      const nearMaturityCD: CDInvestmentAccount = {
        ...mockCD,
        maturityDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
      };

      const isNear = cdCalculationService.isNearMaturity(nearMaturityCD, 30);
      
      expect(isNear).toBe(true);
    });

    it('should not detect CD far from maturity', () => {
      const farMaturityCD: CDInvestmentAccount = {
        ...mockCD,
        maturityDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days from now
      };

      const isNear = cdCalculationService.isNearMaturity(farMaturityCD, 30);
      
      expect(isNear).toBe(false);
    });
  });

  describe('generateCDSummary', () => {
    it('should generate correct summary for active CD', () => {
      const summary = cdCalculationService.generateCDSummary(mockCD);
      
      expect(summary.status).toBe('active');
      expect(summary.currentValue).toBeGreaterThan(mockCD.principal);
      expect(summary.totalReturn).toBeGreaterThanOrEqual(0);
      expect(summary.returnPercentage).toBeGreaterThanOrEqual(0);
      expect(summary.daysToMaturity).toBeGreaterThan(0);
      expect(summary.monthlyInterestRate).toBe(mockCD.interestRate / 12);
    });

    it('should generate correct summary for matured CD', () => {
      const maturedCD: CDInvestmentAccount = {
        ...mockCD,
        maturityDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        cdCreatedAt: new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const summary = cdCalculationService.generateCDSummary(maturedCD);
      
      expect(summary.status).toBe('matured');
      expect(summary.daysToMaturity).toBe(0);
    });

    it('should generate correct summary with withholding tax', () => {
      const cdWithTax: CDInvestmentAccount = {
        ...mockCD,
        withholdingTaxRate: 4.0, // 4% withholding tax
      };

      const summary = cdCalculationService.generateCDSummary(cdWithTax);
      
      expect(summary.status).toBe('active');
      expect(summary.currentValue).toBeGreaterThan(mockCD.principal);
      expect(summary.netCurrentValue).toBeLessThan(summary.currentValue);
      expect(summary.totalReturn).toBeGreaterThanOrEqual(0);
      expect(summary.netReturn).toBeLessThan(summary.totalReturn);
      expect(summary.returnPercentage).toBeGreaterThanOrEqual(0);
      expect(summary.netReturnPercentage).toBeLessThan(summary.returnPercentage);
      expect(summary.withholdingTax).toBeGreaterThan(0);
      
      // Verify calculations
      const expectedNetReturn = summary.netCurrentValue - mockCD.principal;
      expect(summary.netReturn).toBeCloseTo(expectedNetReturn, 2);
      
      const expectedNetReturnPercentage = (expectedNetReturn / mockCD.principal) * 100;
      expect(summary.netReturnPercentage).toBeCloseTo(expectedNetReturnPercentage, 2);
    });

    it('should handle CD without withholding tax in summary', () => {
      const summary = cdCalculationService.generateCDSummary(mockCD);
      
      expect(summary.withholdingTax).toBe(0);
      expect(summary.netCurrentValue).toBe(summary.currentValue);
      expect(summary.netReturn).toBe(summary.totalReturn);
      expect(summary.netReturnPercentage).toBe(summary.returnPercentage);
    });
  });
});