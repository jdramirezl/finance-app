# Task: Decompose Remaining God-Pages (FixedExpenses, Settings, Summary, Budget)

## Description
Four more pages exceed 400 lines and need decomposition into focused components.

## Technical Requirements

### FixedExpensesPage (561 lines)
Extract:
- `FixedExpensesList.tsx` — the list of groups with their sub-pockets
- `useFixedExpenseActions.ts` — CRUD operations for sub-pockets and groups
- Keep the page as composition (~150 lines)

### SettingsPage (492 lines)
Extract:
- `ExportImportSection.tsx` — export/import data functionality
- `PreferencesSection.tsx` — currency, theme, display settings
- `DangerZoneSection.tsx` — destructive operations (close account, clear data)
- Remove the "Recalculate Balances" button (no-op now) or the debug sections
- Keep the page as a tabbed/sectioned layout (~100 lines)

### SummaryPage (478 lines)
Extract:
- `InvestmentSummarySection.tsx` — investment accounts with price refresh
- `CurrencyBreakdownSection.tsx` — per-currency account grouping
- `ConsolidatedTotalCard.tsx` — the total with loading state
- `useInvestmentPrices.ts` — the investment price loading logic (already has the ignore flag from task-05)
- Keep the page as composition (~150 lines)

### BudgetPlanningPage (458 lines)
Extract:
- `BudgetIncomeSection.tsx` — income input and fixed expense deduction
- `BudgetDistributionSection.tsx` — percentage-based distribution (already partially extracted as BudgetDistribution component)
- `ScenarioSection.tsx` — scenario management
- `useBudgetPersistence.ts` — localStorage save/load with debounce
- Keep the page as composition (~150 lines)

## Acceptance Criteria
1. No page file exceeds 300 lines
2. All extracted components are in appropriate directories
3. All functionality preserved
4. Frontend builds clean
5. No inline JSX blocks longer than 50 lines in any page
