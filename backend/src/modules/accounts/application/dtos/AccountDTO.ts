/**
 * Data Transfer Objects for Account API
 * 
 * These define the contract between frontend and backend.
 */

import type { Currency } from '@shared-backend/types';

export type AccountType = 'normal' | 'investment' | 'cd';
export type InvestmentType = 'stock' | 'etf' | 'cd';
export type CompoundingFrequency = 'daily' | 'monthly' | 'quarterly' | 'annually';

export interface CreateAccountDTO {
  name: string;
  color: string;
  currency: Currency;
  type?: AccountType;
  stockSymbol?: string;
  // CD-specific fields
  investmentType?: InvestmentType;
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  maturityDate?: string;
  compoundingFrequency?: CompoundingFrequency;
  earlyWithdrawalPenalty?: number;
  withholdingTaxRate?: number;
  cdCreatedAt?: string;
}

export interface UpdateAccountDTO {
  name?: string;
  color?: string;
  currency?: Currency;
  // CD-specific fields for updates
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  maturityDate?: string;
  compoundingFrequency?: CompoundingFrequency;
  earlyWithdrawalPenalty?: number;
  withholdingTaxRate?: number;
}

export interface AccountResponseDTO {
  id: string;
  name: string;
  color: string;
  currency: Currency;
  balance: number;
  type: AccountType;
  stockSymbol?: string;
  montoInvertido?: number;
  shares?: number;
  displayOrder?: number;
  // CD-specific fields
  investmentType?: InvestmentType;
  principal?: number;
  interestRate?: number;
  termMonths?: number;
  maturityDate?: string;
  compoundingFrequency?: CompoundingFrequency;
  earlyWithdrawalPenalty?: number;
  withholdingTaxRate?: number;
  cdCreatedAt?: string;
}

export interface CascadeDeleteResultDTO {
  account: string;
  pockets: number;
  subPockets: number;
  movements: number;
}
