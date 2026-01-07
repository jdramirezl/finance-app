/**
 * AccountMapper
 * 
 * Handles data transformation between different layers:
 * - Domain Entity (Account) ↔ Database Persistence (Supabase row)
 * - Domain Entity (Account) → DTO (API response)
 * 
 * This keeps the domain layer pure and independent of infrastructure concerns.
 */

import { Account, type AccountType, type InvestmentType, type CompoundingFrequency } from '../../domain/Account';
import type { AccountResponseDTO } from '../dtos/AccountDTO';
import type { Currency } from '@shared-backend/types';

/**
 * Database row structure from Supabase accounts table
 */
interface AccountPersistence {
  id: string;
  user_id: string;
  name: string;
  color: string;
  currency: string;
  balance: number;
  type: string;
  stock_symbol: string | null;
  monto_invertido: number | null;
  shares: number | null;
  display_order: number | null;
  // CD-specific fields
  investment_type: string | null;
  principal: number | null;
  interest_rate: number | null;
  term_months: number | null;
  maturity_date: string | null;
  compounding_frequency: string | null;
  early_withdrawal_penalty: number | null;
  withholding_tax_rate: number | null;
  cd_created_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export class AccountMapper {
  /**
   * Convert domain entity to database persistence format
   * 
   * Maps camelCase domain properties to snake_case database columns
   * Adds user_id for multi-tenancy
   * 
   * @param account - Domain entity
   * @param userId - User ID for multi-tenancy
   * @returns Database row object
   */
  static toPersistence(account: Account, userId: string): AccountPersistence {
    return {
      id: account.id,
      user_id: userId,
      name: account.name,
      color: account.color,
      currency: account.currency,
      balance: account.balance,
      type: account.type,
      stock_symbol: account.stockSymbol ?? null,
      monto_invertido: account.montoInvertido ?? null,
      shares: account.shares ?? null,
      display_order: account.displayOrder ?? null,
      // CD-specific fields
      investment_type: account.investmentType ?? null,
      principal: account.principal ?? null,
      interest_rate: account.interestRate ?? null,
      term_months: account.termMonths ?? null,
      maturity_date: account.maturityDate?.toISOString() ?? null,
      compounding_frequency: account.compoundingFrequency ?? null,
      early_withdrawal_penalty: account.earlyWithdrawalPenalty ?? null,
      withholding_tax_rate: account.withholdingTaxRate ?? null,
      cd_created_at: account.cdCreatedAt?.toISOString() ?? null,
    };
  }

  /**
   * Convert database row to domain entity
   * 
   * Maps snake_case database columns to camelCase domain properties
   * Handles null values from database
   * 
   * @param row - Database row from Supabase
   * @returns Domain entity
   */
  static toDomain(row: AccountPersistence): Account {
    return new Account(
      row.id,
      row.name,
      row.color,
      row.currency as Currency,
      row.balance,
      row.type as AccountType,
      row.stock_symbol ?? undefined,
      row.monto_invertido ?? undefined,
      row.shares ?? undefined,
      row.display_order ?? undefined,
      // CD-specific fields
      row.investment_type as InvestmentType ?? undefined,
      row.principal ?? undefined,
      row.interest_rate ?? undefined,
      row.term_months ?? undefined,
      row.maturity_date ? new Date(row.maturity_date) : undefined,
      row.compounding_frequency as CompoundingFrequency ?? undefined,
      row.early_withdrawal_penalty ?? undefined,
      row.withholding_tax_rate ?? undefined,
      row.cd_created_at ? new Date(row.cd_created_at) : undefined
    );
  }

  /**
   * Convert domain entity to API response DTO
   * 
   * This is what gets sent to the frontend
   * Includes all fields needed by the UI
   * 
   * @param account - Domain entity
   * @returns API response DTO
   */
  static toDTO(account: Account): AccountResponseDTO {
    return {
      id: account.id,
      name: account.name,
      color: account.color,
      currency: account.currency,
      balance: account.balance,
      type: account.type,
      stockSymbol: account.stockSymbol,
      montoInvertido: account.montoInvertido,
      shares: account.shares,
      displayOrder: account.displayOrder,
      // CD-specific fields
      investmentType: account.investmentType,
      principal: account.principal,
      interestRate: account.interestRate,
      termMonths: account.termMonths,
      maturityDate: account.maturityDate?.toISOString(),
      compoundingFrequency: account.compoundingFrequency,
      earlyWithdrawalPenalty: account.earlyWithdrawalPenalty,
      withholdingTaxRate: account.withholdingTaxRate,
      cdCreatedAt: account.cdCreatedAt?.toISOString(),
    };
  }

  /**
   * Convert array of domain entities to array of DTOs
   * 
   * Convenience method for bulk transformations
   * 
   * @param accounts - Array of domain entities
   * @returns Array of API response DTOs
   */
  static toDTOArray(accounts: Account[]): AccountResponseDTO[] {
    return accounts.map(account => this.toDTO(account));
  }

  /**
   * Convert array of database rows to array of domain entities
   * 
   * Convenience method for bulk transformations
   * 
   * @param rows - Array of database rows
   * @returns Array of domain entities
   */
  static toDomainArray(rows: AccountPersistence[]): Account[] {
    return rows.map(row => this.toDomain(row));
  }
}
