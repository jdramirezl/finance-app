import type { CDInvestmentAccount, CDCalculationResult, CompoundingFrequency } from '../types';

/**
 * Service for Certificate of Deposit (CD) financial calculations
 * Handles interest calculations, maturity tracking, and yield computations
 */
class CDCalculationService {
  /**
   * Calculate the current value and accrued interest for a CD
   */
  calculateCurrentValue(cd: CDInvestmentAccount, asOfDate?: Date): CDCalculationResult {
    // Validate required fields
    if (!cd.principal || cd.principal <= 0) {
      throw new Error('CD principal is required and must be greater than 0');
    }
    if (!cd.interestRate || cd.interestRate <= 0) {
      throw new Error('CD interest rate is required and must be greater than 0');
    }
    if (!cd.maturityDate) {
      throw new Error('CD maturity date is required');
    }

    const now = asOfDate || new Date();
    
    // Validate and parse dates
    let startDate: Date;
    let maturityDate: Date;
    
    try {
      // Use CD creation date if available, otherwise use current date (for new CDs)
      startDate = cd.cdCreatedAt ? new Date(cd.cdCreatedAt) : new Date();
      if (isNaN(startDate.getTime())) {
        console.warn('⚠️ Invalid cdCreatedAt date, using current date');
        startDate = new Date();
      }
      
      maturityDate = new Date(cd.maturityDate);
      if (isNaN(maturityDate.getTime())) {
        console.error('❌ Invalid maturityDate:', cd.maturityDate);
        throw new Error('Invalid maturity date for CD account');
      }
    } catch (error) {
      console.error('❌ Date parsing error:', error);
      throw new Error('Invalid date format in CD account data');
    }
    
    // Calculate days elapsed and total term days
    const daysElapsed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalTermDays = Math.floor((maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysToMaturity = Math.max(0, Math.floor((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const isMatured = now >= maturityDate;
    const effectiveDays = isMatured ? totalTermDays : daysElapsed;
    
    // Calculate compound interest
    const result = this.calculateCompoundInterest(
      cd.principal,
      cd.interestRate / 100, // Convert percentage to decimal
      effectiveDays,
      cd.compoundingFrequency
    );
    
    // Calculate total interest at maturity for effective yield
    const maturityResult = this.calculateCompoundInterest(
      cd.principal,
      cd.interestRate / 100,
      totalTermDays,
      cd.compoundingFrequency
    );
    
    const effectiveYield = ((maturityResult.finalAmount - cd.principal) / cd.principal) * 100;
    
    // Calculate withholding tax (retención en la fuente)
    const withholdingTaxRate = (cd.withholdingTaxRate || 0) / 100; // Convert percentage to decimal
    const withholdingTax = result.interestEarned * withholdingTaxRate;
    const netInterest = result.interestEarned - withholdingTax;
    const netCurrentValue = cd.principal + netInterest;
    
    return {
      currentValue: result.finalAmount,
      accruedInterest: result.interestEarned,
      totalInterest: maturityResult.interestEarned,
      daysToMaturity,
      isMatured,
      effectiveYield,
      withholdingTax,
      netInterest,
      netCurrentValue
    };
  }
  
  /**
   * Calculate compound interest using the standard formula (public method for preview)
   * A = P(1 + r/n)^(nt)
   */
  calculateCompoundInterest(
    principal: number,
    annualRate: number,
    days: number,
    frequency: CompoundingFrequency
  ): { finalAmount: number; interestEarned: number } {
    if (days <= 0) {
      return { finalAmount: principal, interestEarned: 0 };
    }
    
    const compoundingPeriodsPerYear = this.getCompoundingPeriodsPerYear(frequency);
    const years = days / 365.25; // Account for leap years
    
    // A = P(1 + r/n)^(nt)
    const finalAmount = principal * Math.pow(
      1 + (annualRate / compoundingPeriodsPerYear),
      compoundingPeriodsPerYear * years
    );
    
    const interestEarned = finalAmount - principal;
    
    return {
      finalAmount: Math.round(finalAmount * 100) / 100, // Round to 2 decimal places
      interestEarned: Math.round(interestEarned * 100) / 100
    };
  }

  /**
   * Get the number of compounding periods per year
   */
  private getCompoundingPeriodsPerYear(frequency: CompoundingFrequency): number {
    switch (frequency) {
      case 'daily':
        return 365;
      case 'monthly':
        return 12;
      case 'quarterly':
        return 4;
      case 'annually':
        return 1;
      default:
        return 12; // Default to monthly
    }
  }
  
  /**
   * Calculate early withdrawal penalty
   */
  calculateEarlyWithdrawalPenalty(cd: CDInvestmentAccount, withdrawalDate?: Date): number {
    if (!cd.earlyWithdrawalPenalty) return 0;
    
    const maturityDate = new Date(cd.maturityDate);
    const withdrawDate = withdrawalDate || new Date();
    
    // If already matured, no penalty
    if (withdrawDate >= maturityDate) return 0;
    
    const currentValue = this.calculateCurrentValue(cd, withdrawDate);
    return (currentValue.accruedInterest * cd.earlyWithdrawalPenalty) / 100;
  }
  
  /**
   * Get net amount after early withdrawal (principal + interest - penalty - withholding tax)
   */
  calculateEarlyWithdrawalAmount(cd: CDInvestmentAccount, withdrawalDate?: Date): number {
    const currentValue = this.calculateCurrentValue(cd, withdrawalDate);
    const penalty = this.calculateEarlyWithdrawalPenalty(cd, withdrawalDate);
    
    // Calculate withholding tax on the net interest (after penalty)
    const netInterestAfterPenalty = Math.max(0, currentValue.accruedInterest - penalty);
    const withholdingTaxRate = (cd.withholdingTaxRate || 0) / 100;
    const withholdingTax = netInterestAfterPenalty * withholdingTaxRate;
    
    // Final amount = principal + net interest after penalty and tax
    return cd.principal + netInterestAfterPenalty - withholdingTax;
  }
  
  /**
   * Check if a CD is close to maturity (within specified days)
   */
  isNearMaturity(cd: CDInvestmentAccount, daysThreshold: number = 30): boolean {
    const result = this.calculateCurrentValue(cd);
    return result.daysToMaturity <= daysThreshold && result.daysToMaturity > 0;
  }
  
  /**
   * Generate a summary of CD performance
   */
  generateCDSummary(cd: CDInvestmentAccount): {
    status: 'active' | 'matured' | 'near-maturity';
    currentValue: number;
    netCurrentValue: number;
    totalReturn: number;
    netReturn: number;
    returnPercentage: number;
    netReturnPercentage: number;
    daysToMaturity: number;
    monthlyInterestRate: number;
    withholdingTax: number;
  } {
    const calculation = this.calculateCurrentValue(cd);
    
    let status: 'active' | 'matured' | 'near-maturity' = 'active';
    if (calculation.isMatured) {
      status = 'matured';
    } else if (this.isNearMaturity(cd)) {
      status = 'near-maturity';
    }
    
    const totalReturn = calculation.currentValue - cd.principal;
    const netReturn = calculation.netCurrentValue - cd.principal;
    const returnPercentage = (totalReturn / cd.principal) * 100;
    const netReturnPercentage = (netReturn / cd.principal) * 100;
    const monthlyInterestRate = cd.interestRate / 12;
    
    return {
      status,
      currentValue: calculation.currentValue,
      netCurrentValue: calculation.netCurrentValue,
      totalReturn,
      netReturn,
      returnPercentage,
      netReturnPercentage,
      daysToMaturity: calculation.daysToMaturity,
      monthlyInterestRate,
      withholdingTax: calculation.withholdingTax
    };
  }
}

export const cdCalculationService = new CDCalculationService();