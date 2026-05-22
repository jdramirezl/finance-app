# UI Restore: Precise Coder Task Breakdown

## Overview

Restore the old visual appearance from commit `5199ad3` while keeping ALL new features, hooks, services, and bug fixes.

**Reference commit**: `5199ad3`
**Exception**: Settings page stays as current (DO NOT touch)

---

## Wave 1: Bulk Restore of Safe Files (1 agent)

### Task: Git checkout all purely-visual files

These files only had CSS class changes (removing `dark:` prefixes, hardcoding dark colors). No new logic, no new props, no new imports of new components.

**Command to run:**

```bash
cd /local/home/jdrami/finance-app

git checkout 5199ad3 -- \
  frontend/src/index.css \
  frontend/src/components/ui/Button.tsx \
  frontend/src/components/ui/Card.tsx \
  frontend/src/components/ui/Input.tsx \
  frontend/src/components/ui/Select.tsx \
  frontend/src/components/ui/Modal.tsx \
  frontend/src/components/ui/Skeleton.tsx \
  frontend/src/components/ui/PageHeader.tsx \
  frontend/src/components/ui/InlineEditableAmount.tsx \
  frontend/src/components/layout/Layout.tsx \
  frontend/src/components/layout/BottomNav.tsx \
  frontend/src/components/layout/Sidebar.tsx \
  frontend/src/components/feedback/Toast.tsx \
  frontend/src/pages/LoginPage.tsx \
  frontend/src/pages/SignUpPage.tsx \
  frontend/src/pages/ReportsPage.tsx \
  frontend/src/pages/TemplatesPage.tsx \
  frontend/src/components/accounts/PocketManagementSection.tsx \
  frontend/src/components/accounts/CascadeDeleteDialog.tsx \
  frontend/src/components/accounts/CDWarningsSection.tsx \
  frontend/src/components/accounts/AccountCard.tsx \
  frontend/src/components/accounts/AccountDetailPanel.tsx \
  frontend/src/components/accounts/AccountForm.tsx \
  frontend/src/components/accounts/CDAccountCard.tsx \
  frontend/src/components/accounts/PocketCard.tsx \
  frontend/src/components/movements/BatchMovementForm.tsx \
  frontend/src/components/movements/BatchMovementRow.tsx \
  frontend/src/components/movements/CategorySelector.tsx \
  frontend/src/components/movements/MovementFilters.tsx \
  frontend/src/components/movements/MovementFormPanel.tsx \
  frontend/src/components/movements/QuickAddMovement.tsx \
  frontend/src/components/movements/TagInput.tsx \
  frontend/src/components/reminders/MonthSection.tsx \
  frontend/src/components/reminders/ReminderCard.tsx \
  frontend/src/components/reports/CategoryTrend.tsx \
  frontend/src/components/reports/MonthlyTrend.tsx \
  frontend/src/components/reports/PeriodSelector.tsx \
  frontend/src/components/reports/SpendingByCategory.tsx \
  frontend/src/components/reports/TopExpenses.tsx \
  frontend/src/components/summary/AccountSummaryCard.tsx \
  frontend/src/components/summary/AccountSummaryCardCompact.tsx \
  frontend/src/components/summary/CDSummaryCard.tsx \
  frontend/src/components/summary/CDSummaryCardCompact.tsx \
  frontend/src/components/summary/CurrencySection.tsx \
  frontend/src/components/summary/FinancialCalendarWidget.tsx \
  frontend/src/components/summary/FixedExpensesSummary.tsx \
  frontend/src/components/summary/FloatingStatsBar.tsx \
  frontend/src/components/summary/InvestmentCard.tsx \
  frontend/src/components/summary/InvestmentCardCompact.tsx \
  frontend/src/components/summary/SpendingCard.tsx \
  frontend/src/components/summary/TotalsSummary.tsx \
  frontend/src/components/budget/BudgetDistribution.tsx \
  frontend/src/components/budget/BudgetEntryRow.tsx \
  frontend/src/components/budget/BudgetSummaryCard.tsx \
  frontend/src/components/budget/ScenarioSection.tsx \
  frontend/src/components/fixed-expenses/FixedExpensesHeader.tsx
```

### Post-checkout fixes (same agent must do these):

#### Fix 1: `frontend/src/components/ui/index.ts`

The old version is missing `SidePanel` export. Do NOT restore this file via git checkout. Instead, keep the current version as-is (it already has all exports including SidePanel).

#### Fix 2: `frontend/src/components/summary/index.ts`

Do NOT restore. Keep current version — it exports new components (`SpendingDensityCard`, `NetWorthHero`, `CapitalBreakdown`, `AccountSummaryRow`, `FixedObligationsWidget`, `FloatingActionBar`, `LiquidityConsumptionCard`) that are used by the new SummaryPage.

#### Fix 3: `frontend/src/components/budget/index.ts`

Do NOT restore. Keep current version — it exports new components (`BudgetScenarioTabs`, `BudgetIncomeCard`, `AllocationSliderRow`, `AllocationStrategy`, `PortfolioDonutChart`, `BudgetStatsCards`, `BudgetSidebar`).

#### Fix 4: `frontend/src/components/settings/index.ts`

Do NOT restore. Keep current version — it exports `AboutSection`, `DataPrivacySection`, `DisplaySection` used by the new SettingsPage.

#### Fix 5: `frontend/src/main.tsx` and `frontend/index.html`

Do NOT restore — they are already identical to `5199ad3` (no diff).

### Files explicitly NOT restored in Wave 1:

- `frontend/src/components/reminders/RemindersWidget.tsx` — has new calendar heatmap tab (functional change, handled in Wave 2)
- `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx` — has new Rates tab (functional change, handled in Wave 2)
- `frontend/src/components/fixed-expenses/FixedExpenseGroupCard.tsx` — has new status logic, MoveDropdown (functional change, handled in Wave 2)
- `frontend/src/components/fixed-expenses/FixedExpensesList.tsx` — removed sortable/collapse (functional change, handled in Wave 2)
- `frontend/src/components/movements/MovementList.tsx` — new pagination props (functional change, handled in Wave 2)
- All page files — handled in Wave 2
- All settings files — user wants to keep new version
- `frontend/src/pages/SettingsPage.tsx` — KEEP AS-IS

### Acceptance Criteria (Wave 1):

1. All listed files restored to `5199ad3` version
2. Index barrel files (`ui/index.ts`, `summary/index.ts`, `budget/index.ts`, `settings/index.ts`) kept as current
3. `main.tsx` and `index.html` untouched
4. Run `cd frontend && npx tsc --noEmit` — should have NO new type errors from this wave (existing errors from page files are expected and will be fixed in Wave 2)

---

## Wave 2: Page-by-Page Merge (4 agents in parallel)

### Agent 1: SummaryPage

**File**: `frontend/src/pages/SummaryPage.tsx`

**Strategy**: Restore old layout structure (single-column `space-y-6` with a 2-column grid inside), but use the NEW components instead of old ones.

**What to restore from old (`5199ad3`):**
- `PageHeader` import and usage at top of page
- Single-column `space-y-6` layout with `grid grid-cols-1 lg:grid-cols-2 gap-6` for the main content area
- Left column: totals + spending + accounts breakdown
- Right column: calendar + net worth + reminders + fixed expenses
- `FloatingStatsBar` at the bottom
- Old loading skeleton structure
- `DEFAULT_DISPLAY` constant and `accountCardDisplay` state (user preference: compact list)

**What to KEEP from current (DO NOT lose):**
- `useState`, `useEffect` imports (needed for `todaySpending`)
- `useMovementsQuery`, `useSpendingSummaryQuery` imports
- `currencyService`, `BatchConversionRequest` imports
- `Currency` and `PeriodSummary` type imports
- `convertPeriodTotal()` async helper function (entire function)
- `todaySpending` state + `useEffect` that calls `convertPeriodTotal`
- `fixedExpensesCurrency` derived value
- `NetWorthHero` component (replaces `TotalsSummary` in the old layout position)
- `SpendingDensityCard` component (replaces `SpendingCard` in the old layout position)
- `CapitalBreakdown` component (replaces `CurrencyBreakdownSection` in the old layout position)
- `FixedObligationsWidget` component (replaces `FixedExpensesSummary` in the old layout position)
- `FloatingActionBar` component (add at bottom, before `FloatingStatsBar`)
- `movements` query destructuring for `FloatingActionBar`
- Passing `primaryCurrency={fixedExpensesCurrency}` to fixed obligations widget

**Component mapping (old position → new component):**
| Old Layout Position | Old Component | New Component |
|---|---|---|
| Top of page | `TotalsSummary` | `NetWorthHero` |
| Below totals | `SpendingCard` | `SpendingDensityCard` |
| Left column | `CurrencyBreakdownSection` | `CapitalBreakdown` |
| Right column top | `FinancialCalendarWidget` | REMOVE (not needed) |
| Right column | `NetWorthTimelineWidget` | `NetWorthTimelineWidget` (same) |
| Right column | `RemindersWidget` | `RemindersWidget` (same) |
| Right column | `FixedExpensesSummary` | `FixedObligationsWidget` |
| Bottom | — | `FloatingActionBar` (new addition) |
| Bottom | `FloatingStatsBar` | `FloatingStatsBar` (same) |

**Acceptance Criteria:**
1. Page uses old `space-y-6` + `grid grid-cols-1 lg:grid-cols-2` layout
2. `PageHeader` with title "Summary" at top
3. All new components render correctly in old layout positions
4. `convertPeriodTotal`, `todaySpending`, `fixedExpensesCurrency` logic intact
5. `FloatingActionBar` receives `accounts`, `movements`, `todaySpending`, `primaryCurrency`
6. No TypeScript errors

---

### Agent 2: AccountsPage

**File**: `frontend/src/pages/AccountsPage.tsx`

**Strategy**: Restore old layout (PageHeader + sortable account list with detail panel), but keep the new search/filter functionality and `PocketManagementSection`.

**What to restore from old (`5199ad3`):**
- `PageHeader` import and usage
- `SortableList`, `SortableItem` imports from `../components/ui`
- `SkeletonList` import from Skeleton
- `AccountCard` import from `../components/accounts`
- `CDAccountCard` import
- `AccountDetailPanel` import
- `selectedAccountId` state
- `closeAccountForm`, `closeCDForm`, `switchToCDForm` callbacks
- Old layout: PageHeader → account list (sortable) → detail panel on selection
- Old account rendering with `AccountCard` and `CDAccountCard` components

**What to KEEP from current (DO NOT lose):**
- `currencyService` import and usage
- `getAccountSubtitle()` helper function
- `getAccountIcon()` helper function
- `AccountFilter` type and `FILTER_CHIPS` constant
- `searchQuery` and `activeFilter` state
- `Search`, `TrendingUp`, `Lock`, `Edit2`, `Trash2` icon imports
- `PocketManagementSection` import (use this INSTEAD of `AccountDetailPanel` for the detail view)
- `useAccountActions` hook import and usage
- `useConfirmDialog` import and usage

**Merge approach:**
1. Start from old file structure (PageHeader, sortable list layout)
2. Add search bar and filter chips above the account list
3. Keep `AccountCard`/`CDAccountCard` for rendering individual accounts
4. Replace `AccountDetailPanel` with `PocketManagementSection` in the detail view
5. Add `getAccountSubtitle`, `getAccountIcon`, filter logic
6. Wire `searchQuery` and `activeFilter` to filter the displayed accounts

**Acceptance Criteria:**
1. `PageHeader` with title at top
2. Search bar + filter chips visible
3. Accounts displayed using old `AccountCard`/`CDAccountCard` components
4. Clicking an account shows `PocketManagementSection` (not old `AccountDetailPanel`)
5. Filter and search work correctly
6. No TypeScript errors

---

### Agent 3: MovementsPage + MovementList

**Files**:
- `frontend/src/pages/MovementsPage.tsx`
- `frontend/src/components/movements/MovementList.tsx`

#### MovementsPage

**Strategy**: The current MovementsPage is almost identical to old — the main difference is `PAGE_SIZE` constant and removal of `format`/`Trash2` imports. Keep current version as-is (it's already correct).

**What to verify/ensure:**
- `PAGE_SIZE = 25` constant exists
- `useBulkSelection` is imported
- `QuickAddMovement` is imported and rendered
- No `PageHeader` (old version didn't have one either — it used a custom header)
- `apiCategory` and `apiTags` state for server-side filtering

**Action**: The current `MovementsPage.tsx` is functionally correct. Only restore the CSS classes if they differ. Check with:
```bash
git diff 5199ad3 HEAD -- frontend/src/pages/MovementsPage.tsx
```
If only CSS class changes, restore old. If functional changes exist (they do: `PAGE_SIZE`, removed `format`/`Trash2`), keep current.

**Decision: KEEP current MovementsPage.tsx as-is.** The functional changes (PAGE_SIZE, removed unused imports) are improvements. The CSS changes in this file are minimal.

#### MovementList

**Strategy**: This component was heavily rewritten. The current version uses pagination props (`movements`, `totalCount`, `page`, `pageSize`, `onPageChange`) instead of the old `movementsByMonth` + `expandedMonths` pattern. The current version is the correct one to keep because `MovementsPage` passes pagination props.

**Action: KEEP current `MovementList.tsx` as-is.** Restoring the old version would break the page because `MovementsPage` no longer passes `movementsByMonth` or `expandedMonths`.

However, restore the OLD CSS styling within the current structure:
1. Restore `dark:` prefix pattern for colors (e.g., `text-gray-900 dark:text-gray-100` instead of just `text-gray-100`)
2. Restore light/dark mode compatible class names
3. Keep all current logic, props, and structure unchanged

**Specific CSS restorations in MovementList.tsx:**
- Table header: restore `bg-gray-50 dark:bg-gray-800` (instead of just `bg-gray-800`)
- Text colors: restore `text-gray-900 dark:text-gray-100` pattern
- Borders: restore `border-gray-200 dark:border-gray-700` pattern
- Hover states: restore `hover:bg-gray-50 dark:hover:bg-gray-800` pattern

**Acceptance Criteria:**
1. MovementsPage renders with QuickAddMovement, filters, bulk selection, pagination
2. MovementList uses pagination props (NOT month grouping)
3. CSS classes use `dark:` prefix pattern for dual-mode support
4. No TypeScript errors
5. All movement features work: edit, delete, apply pending, inline amount edit, bulk select

---

### Agent 4: BudgetPlanningPage + FixedExpensesPage + Fixed Expense Components

**Files**:
- `frontend/src/pages/BudgetPlanningPage.tsx`
- `frontend/src/pages/FixedExpensesPage.tsx`
- `frontend/src/components/fixed-expenses/FixedExpenseGroupCard.tsx`
- `frontend/src/components/fixed-expenses/FixedExpensesList.tsx`
- `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx`
- `frontend/src/components/reminders/RemindersWidget.tsx`

#### BudgetPlanningPage

**Strategy**: Restore old layout (PageHeader, single-column with sections), but use new components.

**What to restore from old (`5199ad3`):**
- `PageHeader` import and usage
- `Button`, `EmptyState` imports
- `SkeletonList` import
- Old single-column layout with `space-y-6`
- Old loading/empty states

**What to KEEP from current (DO NOT lose):**
- `BudgetScenarioTabs`, `BudgetIncomeCard`, `AllocationStrategy`, `BudgetSidebar` imports
- `activeScenarioTabs` state
- `editingScenario` state
- All `useBudgetPersistence` destructuring
- `useBudgetActions` hook
- `BatchMovementForm` import and modal
- `ScenarioForm` import and modal
- `totalPercentage` derived value (if present)
- `fixedPockets` memo

**Component mapping:**
| Old Component | New Component |
|---|---|
| `BudgetIncomeSection` | `BudgetIncomeCard` |
| `BudgetDistribution` | `AllocationStrategy` |
| `BudgetSummaryCard` | `BudgetSidebar` |
| `ScenarioSection` | `BudgetScenarioTabs` |
| `AccountPocketSelector` | REMOVED (not needed) |

**Merge approach:**
1. Use old layout structure (PageHeader + space-y-6)
2. Replace old component names with new ones
3. Keep all state and logic from current version
4. Wire new components with their current props

#### FixedExpensesPage

**Strategy**: Restore old layout (PageHeader, Card wrapper, summary section), but use new calculation logic.

**What to restore from old (`5199ad3`):**
- `FolderPlus`, `Layers` icon imports
- `Button`, `Card`, `PageHeader` imports
- `FixedExpensesSummary` import from `../components/summary`
- `enabledCount` variable
- Old layout: PageHeader → Summary card → List
- Old `totalFijosMes` variable name (but use new calculation)

**What to KEEP from current (DO NOT lose):**
- `calculateSimpleMonthlyContribution` import
- New `totalMonthly` calculation using `calculateSimpleMonthlyContribution` (simpler than old `calculateAporteMensual` loop)
- Removal of `collapsedGroups` state (the new FixedExpensesList doesn't support it)
- Removal of `onReorderGroups` (no more drag-and-drop)
- `togglingGroupId` in actions

**Decision**: Use old layout with `PageHeader` and `FixedExpensesSummary`, but:
- Use `calculateSimpleMonthlyContribution` for `totalMonthly` (keep new calculation)
- Do NOT add back `collapsedGroups` or `onReorderGroups` (the new list component doesn't accept them)
- Add back `enabledCount` and `FixedExpensesSummary` in the layout

#### FixedExpenseGroupCard

**Strategy**: KEEP current version. It has new functional logic (status system, MoveDropdown, removed collapse) that the current FixedExpensesList depends on. Only restore CSS classes.

**CSS restorations:**
- Restore `dark:` prefix pattern for all colors
- Restore light/dark compatible backgrounds and borders

#### FixedExpensesList

**Strategy**: KEEP current version. It removed SortableList/SortableItem (functional change — no more drag-and-drop). Only restore CSS classes.

**CSS restorations:**
- Restore `dark:` prefix pattern for all colors

#### NetWorthTimelineWidget

**Strategy**: KEEP current version entirely. It has the new "Rates" tab with `ExchangeRateTrend` component. Only restore CSS classes.

**CSS restorations:**
- Restore `dark:` prefix pattern for card backgrounds, text colors, borders
- Restore `bg-gray-50 dark:bg-gray-800` patterns instead of just `bg-gray-800`

#### RemindersWidget

**Strategy**: KEEP current version entirely. It has the new calendar heatmap tab. Only restore CSS classes.

**CSS restorations:**
- Restore `dark:` prefix pattern: `bg-gray-100 dark:bg-gray-800` instead of just `bg-gray-800`
- Restore `text-gray-900 dark:text-gray-100` instead of just `text-gray-100`
- Restore `border-gray-100 dark:border-gray-800` instead of just `border-gray-700`
- Loading skeleton: `bg-gray-100 dark:bg-gray-800` instead of just `bg-gray-800`

**Acceptance Criteria (Agent 4):**
1. BudgetPlanningPage has `PageHeader`, uses new components in old layout
2. FixedExpensesPage has `PageHeader`, `FixedExpensesSummary`, uses `calculateSimpleMonthlyContribution`
3. FixedExpenseGroupCard keeps status logic, MoveDropdown; CSS uses `dark:` prefixes
4. FixedExpensesList keeps responsive grid (no sortable); CSS uses `dark:` prefixes
5. NetWorthTimelineWidget keeps Rates tab; CSS uses `dark:` prefixes
6. RemindersWidget keeps calendar heatmap tab; CSS uses `dark:` prefixes
7. No TypeScript errors

---

## Wave 3: Verification (1 agent)

After Waves 1 and 2 complete:

```bash
cd /local/home/jdrami/finance-app/frontend

# Type check
npx tsc --noEmit

# Build
npm run build

# Run tests
npm run test
```

**Fix any issues:**
1. Missing imports (components that were renamed or moved)
2. Prop mismatches (old components expecting props that new pages don't pass)
3. Broken barrel exports

---

## Critical Reminders

1. **NEVER touch** `frontend/src/pages/SettingsPage.tsx` or any `settings/` component
2. **NEVER restore** hooks, services, or utils — they contain bug fixes
3. **NEVER restore** files that didn't exist at `5199ad3` — they are new features
4. The CSS restoration pattern is: `hardcoded-dark-only` → `light dark:dark` (e.g., `text-gray-100` → `text-gray-900 dark:text-gray-100`)
5. When in doubt about a component, check if it's imported by a page that uses new features. If yes, keep current version and only fix CSS.
6. `index.ts` barrel files must NOT be restored — they export new components

## Files That Must NOT Be Touched

- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/components/settings/AboutSection.tsx`
- `frontend/src/components/settings/DataPrivacySection.tsx`
- `frontend/src/components/settings/DisplaySection.tsx`
- `frontend/src/components/settings/index.ts`
- `frontend/src/hooks/queries/useReportsQueries.ts`
- `frontend/src/hooks/queries/useSubPocketMutations.ts`
- `frontend/src/hooks/useNetWorthChartData.ts`
- `frontend/src/services/reportService.ts`
- Any file in `frontend/src/hooks/actions/`
- Any file in `frontend/src/hooks/` that is a custom hook
- Any file in `frontend/src/services/`
- Any file in `frontend/src/contexts/`
- Any file in `frontend/src/lib/`
- Any file in `frontend/src/utils/`
- Any file in `frontend/src/types/`
