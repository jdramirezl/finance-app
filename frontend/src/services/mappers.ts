/**
 * Row mappers for direct Supabase reads.
 *
 * These convert raw snake_case PostgREST/Supabase rows (`any`) into the
 * camelCase TypeScript domain types used by the rest of the frontend, so
 * that direct-from-Supabase services can hand consumers the same shape
 * they previously received from the backend API.
 *
 * Keep the mappers pure: no I/O, no derived business logic — just field
 * renaming, defaults, and minimal type coercion (e.g. numeric strings
 * coming back from PostgREST `numeric` columns).
 */

import type {
  Account,
  Pocket,
  SubPocket,
  FixedExpenseGroup,
  Movement,
  MovementTemplate,
  MovementType,
  Settings,
} from '../types';
import type { Reminder, ReminderException } from './reminderService';
import type { NetWorthSnapshot } from './netWorthSnapshotService';

export function mapAccountRow(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    currency: row.currency,
    balance: row.balance,
    type: row.type ?? 'normal',
    stockSymbol: row.stock_symbol ?? undefined,
    montoInvertido: row.monto_invertido ?? undefined,
    shares: row.shares ?? undefined,
    displayOrder: row.display_order ?? undefined,
    investmentType: row.investment_type ?? undefined,
    principal: row.principal ?? undefined,
    interestRate: row.interest_rate ?? undefined,
    termMonths: row.term_months ?? undefined,
    maturityDate: row.maturity_date ?? undefined,
    compoundingFrequency: row.compounding_frequency ?? undefined,
    earlyWithdrawalPenalty: row.early_withdrawal_penalty ?? undefined,
    withholdingTaxRate: row.withholding_tax_rate ?? undefined,
    cdCreatedAt: row.cd_created_at ?? undefined,
    archivedAt: row.archived_at ?? null,
  };
}

export function mapPocketRow(row: any): Pocket {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    type: row.type,
    balance: row.balance,
    currency: row.currency,
    displayOrder: row.display_order ?? undefined,
    archivedAt: row.archived_at ?? null,
  };
}

export function mapSubPocketRow(row: any): SubPocket {
  return {
    id: row.id,
    pocketId: row.pocket_id,
    name: row.name,
    valueTotal: row.value_total,
    periodicityMonths: row.periodicity_months,
    balance: row.balance,
    groupId: row.group_id ?? undefined,
    displayOrder: row.display_order ?? undefined,
  };
}

export function mapFixedExpenseGroupRow(row: any): FixedExpenseGroup {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mapMovementRow(row: any): Movement {
  return {
    id: row.id,
    type: row.type as MovementType,
    accountId: row.account_id,
    pocketId: row.pocket_id,
    subPocketId: row.sub_pocket_id ?? undefined,
    amount: Number(row.amount),
    notes: row.notes ?? undefined,
    displayedDate: row.displayed_date,
    createdAt: row.created_at,
    isPending: Boolean(row.is_pending),
    isOrphaned: Boolean(row.is_orphaned),
    orphanedAccountName: row.orphaned_account_name ?? undefined,
    orphanedAccountCurrency: row.orphaned_account_currency ?? undefined,
    orphanedPocketName: row.orphaned_pocket_name ?? undefined,
    category: row.category ?? undefined,
    tags: row.tags ?? undefined,
  };
}

export function mapMovementTemplateRow(row: any): MovementTemplate {
  return {
    id: row.id,
    name: row.name,
    type: row.type as MovementType,
    accountId: row.account_id,
    pocketId: row.pocket_id,
    subPocketId: row.sub_pocket_id ?? undefined,
    defaultAmount:
      row.default_amount != null ? Number(row.default_amount) : undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReminderExceptionRow(row: any): ReminderException {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    originalDate: row.original_date,
    action: row.action,
    newTitle: row.new_title ?? undefined,
    newAmount: row.new_amount ?? undefined,
    newDate: row.new_date ?? undefined,
    isPaid: row.is_paid ?? undefined,
    linkedMovementId: row.linked_movement_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReminderRow(row: any): Reminder {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    amount: row.amount,
    dueDate: row.due_date,
    isPaid: row.is_paid,
    recurrence: {
      type: row.recurrence_type || 'once',
      interval: row.recurrence_interval || 1,
      daysOfWeek: row.recurrence_days_of_week || undefined,
      endType: row.recurrence_end_type || 'never',
      endCount: row.recurrence_end_count || undefined,
      endDate: row.recurrence_end_date || undefined,
    },
    linkedMovementId: row.linked_movement_id || undefined,
    fixedExpenseId: row.fixed_expense_id || undefined,
    templateId: row.template_id || undefined,
    exceptions: (row.reminder_exceptions || []).map(mapReminderExceptionRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSettingsRow(row: any): Settings {
  return {
    primaryCurrency: row.primary_currency,
    alphaVantageApiKey: row.alpha_vantage_api_key ?? undefined,
    snapshotFrequency: row.snapshot_frequency ?? undefined,
    accountCardDisplay: row.account_card_display ?? undefined,
    defaultExpenseAccountId: row.default_expense_account_id ?? undefined,
    defaultExpensePocketId: row.default_expense_pocket_id ?? undefined,
    defaultIncomeAccountId: row.default_income_account_id ?? undefined,
    defaultIncomePocketId: row.default_income_pocket_id ?? undefined,
    dateFormat: row.date_format ?? 'MMM d, yyyy',
    movementsPerPage: row.movements_per_page ?? 50,
    reminderAdvanceDays: row.reminder_advance_days ?? 7,
    defaultCurrencyForNewAccounts:
      row.default_currency_for_new_accounts ?? 'USD',
  };
}

export function mapNetWorthSnapshotRow(row: any): NetWorthSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    snapshotDate: row.snapshot_date,
    totalNetWorth: parseFloat(row.total_net_worth),
    baseCurrency: row.base_currency,
    breakdown: row.breakdown || {},
    createdAt: row.created_at,
  };
}
