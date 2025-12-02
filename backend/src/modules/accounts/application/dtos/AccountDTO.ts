/**
 * Data Transfer Objects for Account API
 * 
 * These define the contract between frontend and backend.
 */

import type { Currency } from '@shared-backend/types';

export interface CreateAccountDTO {
  name: string;
  color: string;
  currency: Currency;
  type?: 'normal' | 'investment';
  stockSymbol?: string;
}

export interface UpdateAccountDTO {
  name?: string;
  color?: string;
  currency?: Currency;
}

export interface AccountResponseDTO {
  id: string;
  name: string;
  color: string;
  currency: Currency;
  balance: number;
  type: 'normal' | 'investment';
  stockSymbol?: string;
  montoInvertido?: number;
  shares?: number;
  displayOrder?: number;
}

export interface CascadeDeleteResultDTO {
  account: string;
  pockets: number;
  subPockets: number;
  movements: number;
}
