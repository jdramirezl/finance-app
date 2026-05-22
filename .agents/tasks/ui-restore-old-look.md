# Task: Restore Old Frontend Appearance (pre-5199ad3)

## Summary

Restore the frontend to look exactly like commit `5199ad3` (before the UI overhaul), while keeping all new features/fixes added since then.

**Reference commit**: `5199ad3` — "fix: Reports currency consolidation — convert to primary currency before summing"

**Commits since then**: 42 commits, mostly `feat(ui):` and `revert(ui):` prefixed, representing a full visual overhaul (Luminous Ledger theme → revert → structural rebuild).

**No files were deleted** since `5199ad3`.

---

## Category A: RESTORE from 5199ad3 (purely visual changes)

These files had ONLY visual/styling changes (CSS classes, dark mode hardcoding, removed `dark:` prefixes, layout tweaks). Safe to fully restore.

### Command

```bash
git checkout 5199ad3 -- \
  frontend/src/index.css \
  frontend/src/main.tsx \
  frontend/src/components/ui/Button.tsx \
  frontend/src/components/ui/Card.tsx \
  frontend/src/components/ui/Input.tsx \
  frontend/src/components/ui/Select.tsx \
  frontend/src/components/ui/Modal.tsx \
  frontend/src/components/ui/Skeleton.tsx \
  frontend/src/components/ui/PageHeader.tsx \
  frontend/src/components/ui/InlineEditableAmount.tsx \
  frontend/src/components/ui/index.ts \
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
  frontend/src/components/accounts/CDWarningsSection.tsx
```

**Rationale**: These files only had CSS class changes (removing `dark:` prefixes, hardcoding dark colors, changing border/bg colors). No new props, no new logic, no new imports of new components.

---

## Category B: KEEP current version (new files that didn't exist at 5199ad3)

These are entirely new files. They must be kept as-is.

### New Components (didn't exist before)

| File | Purpose |
|------|---------|
| `components/budget/AllocationSliderRow.tsx` | Budget slider with manual % and amount input |
| `components/budget/AllocationStrategy.tsx` | Budget allocation strategy component |
| `components/budget/BudgetIncomeCard.tsx` | Budget income display card |
| `components/budget/BudgetScenarioTabs.tsx` | Multi-scenario tab navigation |
| `components/budget/BudgetSidebar.tsx` | Budget page sidebar |
| `components/budget/BudgetStatsCards.tsx` | Budget statistics cards |
| `components/budget/PortfolioDonutChart.tsx` | Donut chart for budget |
| `components/budget/__tests__/AllocationSliderRow.test.tsx` | Test for slider |
| `components/net-worth/ExchangeRateTrend.tsx` | Exchange rate trend chart |
| `components/reminders/ReminderCalendarHeatmap.tsx` | Calendar heatmap for reminders |
| `components/settings/AboutSection.tsx` | Settings about section |
| `components/settings/DataPrivacySection.tsx` | Settings data/privacy section |
| `components/settings/DisplaySection.tsx` | Settings display section |
| `components/summary/AccountSummaryRow.tsx` | Compact account row for summary |
| `components/summary/CapitalBreakdown.tsx` | Capital breakdown widget |
| `components/summary/FixedObligationsWidget.tsx` | Fixed obligations widget |
| `components/summary/FloatingActionBar.tsx` | Floating action bar |
| `components/summary/LiquidityConsumptionCard.tsx` | Liquidity consumption card |
| `components/summary/NetWorthHero.tsx` | Net worth hero section |
| `components/summary/SpendingDensityCard.tsx` | Spending density card |
| `components/summary/__tests__/CapitalBreakdown.test.tsx` | Test |
| `components/ui/SidePanel.tsx` | Side panel component |

### New Hooks & Services

| File | Purpose |
|------|---------|
| `hooks/queries/useReportsQueries.ts` | Exchange rate history query (MODIFIED — has new `useExchangeRateHistoryQuery`) |
| `hooks/queries/useSubPocketMutations.ts` | Optimistic toggle mutation (MODIFIED — has optimistic update logic) |
| `hooks/useNetWorthChartData.ts` | Currency conversion in chart data (MODIFIED — converts to primary currency) |
| `services/reportService.ts` | Exchange rate history endpoint (MODIFIED — has new `getExchangeRateHistory`) |

---

## Category C: MERGE (files with both visual AND functional changes)

These files had their layout/styling completely rewritten AND gained new functionality. Strategy: restore old file, then re-apply the functional additions.

### C1: SummaryPage.tsx (HEAVY MERGE)

**Visual changes to revert**: Two-column grid layout, removed PageHeader, new component arrangement.

**Functional changes to KEEP**:
- Import and use of `useMovementsQuery`, `useSpendingSummaryQuery`
- Import of `currencyService` and `BatchConversionRequest`
- `convertPeriodTotal()` helper function for currency conversion
- `todaySpending` state with `useEffect` for currency conversion
- `fixedExpensesCurrency` derived from fixedPockets
- Passing `primaryCurrency={fixedExpensesCurrency}` to fixed expenses (was `primaryCurrency`)
- Removed `accountCardDisplay` / `DEFAULT_DISPLAY` (user preference: compact list)
- Removed `refreshingPrices` / `handleRefreshPrice` from investmentPrices destructuring

**New components used** (keep imports, wire into old layout):
- `NetWorthHero` → replaces `TotalsSummary`
- `SpendingDensityCard` → replaces `SpendingCard`
- `CapitalBreakdown` → replaces `CurrencyBreakdownSection`
- `FixedObligationsWidget` → replaces `FixedExpensesSummary`
- `FloatingActionBar` → new addition
- Removed: `FinancialCalendarWidget`, `PageHeader`

**Approach**: Restore old file. Re-add new imports. Replace old component references with new ones. Re-add `convertPeriodTotal`, `todaySpending`, `fixedExpensesCurrency` logic. Keep old layout structure (single column with grid).

---

### C2: AccountsPage.tsx (HEAVY MERGE)

**Visual changes to revert**: Grid layout with search/filters, compact rows, inline pocket management.

**Functional changes to KEEP**:
- `currencyService` import and usage
- `getAccountSubtitle()` helper function
- `getAccountIcon()` helper function
- `AccountFilter` type and `FILTER_CHIPS` constant
- `searchQuery` and `activeFilter` state
- `PocketManagementSection` import (replaces `AccountDetailPanel`)
- Removed: `SortableList`, `SortableItem`, `SkeletonList`, `PageHeader`, `AccountCard`, `CDAccountCard`, `AccountDetailPanel`

**Approach**: Restore old file. Re-add search/filter state and helpers. Replace `AccountDetailPanel` with `PocketManagementSection`. Keep filter logic but use old visual layout.

---

### C3: BudgetPlanningPage.tsx (HEAVY MERGE)

**Visual changes to revert**: Two-column layout with sidebar, scenario tabs.

**Functional changes to KEEP**:
- `BudgetScenarioTabs`, `BudgetIncomeCard`, `AllocationStrategy`, `BudgetSidebar` imports (new components)
- `activeScenarioTabs` state
- `totalPercentage` derived value
- Removed: `AccountPocketSelector`, `BudgetDistribution`, `BudgetIncomeSection`, `BudgetSummaryCard`, `ScenarioSection`, `PageHeader`, `EmptyState`, `SkeletonList`

**Approach**: Restore old file. Replace old component imports with new ones. Keep `totalPercentage` and `activeScenarioTabs`. Wire new components into old layout structure.

---

### C4: MovementsPage.tsx (MODERATE MERGE)

**Visual changes to revert**: Table layout, compact filters.

**Functional changes to KEEP**:
- `PAGE_SIZE` constant and pagination state (`page`, `setPage`)
- `flatSortedMovements` memo (flattens month grouping for pagination)
- Removed `format` from date-fns import, removed `Trash2` icon
- Removed `useBulkSelection` from old position, re-added in new position
- Removed verbose comments

**Approach**: Restore old file. Add pagination state and `flatSortedMovements`. Keep `useBulkSelection` in new position.

---

### C5: FixedExpensesPage.tsx (MODERATE MERGE)

**Visual changes to revert**: Removed PageHeader, Card, Button imports; simplified layout.

**Functional changes to KEEP**:
- Import `calculateSimpleMonthlyContribution` (new utility)
- `totalMonthly` replaces `totalFijosMes` with simpler calculation using `calculateSimpleMonthlyContribution`
- Removed `collapsedGroups` state and `onToggleCollapse` (UI simplification — functional)
- Removed `onReorderGroups` (removed drag-and-drop — functional)
- Removed `FixedExpensesSummary` import
- Removed `enabledCount` variable

**Approach**: Restore old file. Replace `totalFijosMes` with `totalMonthly` using new utility. Remove `collapsedGroups` and reorder logic. Remove `FixedExpensesSummary`.

---

### C6: SettingsPage.tsx (HEAVY MERGE)

**Visual changes to revert**: Left nav + right content panel layout.

**Functional changes to KEEP**:
- `SettingsSection` type and `NAV_ITEMS` constant
- `activeSection` state
- `DisplaySection`, `DataPrivacySection`, `AboutSection` imports (new components)
- Removed: `DangerZoneSection`, `ExportImportSection` from imports (replaced by new sections)

**Approach**: Restore old file. Add new section imports and navigation state. Wire new sections into old layout.

---

### C7: MovementList.tsx (HEAVY MERGE)

**Visual changes to revert**: Table layout, monospace amounts, compact rows.

**Functional changes to KEEP**:
- Changed props interface: `movements` flat array + pagination props (`totalCount`, `page`, `pageSize`, `onPageChange`) replaces `movementsByMonth`
- Removed `expandedMonths` / `toggleMonth` props
- Added `isSelected`, `onToggleSelection`, `onSelectAll`, `selectedCount` optional props
- `getTypeIcon()` and `getTypeIconColor()` helpers
- `formatDistanceToNow` import from date-fns
- Pagination controls in render

**Approach**: Restore old file. Replace props interface with new pagination-based one. Add pagination rendering. Keep new helper functions.

---

### C8: FixedExpenseGroupCard.tsx (HEAVY MERGE)

**Visual changes to revert**: Card styling, status badges, dropdown menus.

**Functional changes to KEEP**:
- Removed `isCollapsed` / `onToggleCollapse` props
- Removed `pocketAccountMap` prop
- Added `togglingGroupId` prop
- `ExpenseStatus` type and `getExpenseStatus()` function
- `getStatusColor()` function
- `MoveDropdown` sub-component
- Removed `AnimatedProgressBar` import, removed `Button` import

**Approach**: Restore old file. Remove collapse logic. Add status helpers and MoveDropdown. Update props interface.

---

### C9: FixedExpensesList.tsx (MODERATE MERGE)

**Functional changes to KEEP**:
- Removed `SortableList` / `SortableItem` imports (no more drag-and-drop)
- Removed `collapsedGroups`, `onReorderGroups`, `onToggleCollapse` props
- Added `togglingGroupId` prop
- Changed to responsive grid layout (functional: no more sortable)

**Approach**: Restore old file. Remove sortable imports and props. Add `togglingGroupId`.

---

### C10: NetWorthTimelineWidget.tsx (MODERATE MERGE)

**Functional changes to KEEP**:
- `ExchangeRateTrend` import and "Rates" tab
- `WidgetTab` type extending `NetWorthViewMode`
- Conditional rendering: `viewMode === 'rates'` shows `ExchangeRateTrend`
- `viewMode: viewMode === 'rates' ? 'total' : viewMode` passed to chart data hook

**Approach**: Restore old file. Add Rates tab button and ExchangeRateTrend conditional render.

---

### C11: Other Modified Components (VISUAL ONLY — can restore)

These components had only CSS class changes:

```bash
git checkout 5199ad3 -- \
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
  frontend/src/components/reminders/RemindersWidget.tsx \
  frontend/src/components/reports/CategoryTrend.tsx \
  frontend/src/components/reports/MonthlyTrend.tsx \
  frontend/src/components/reports/PeriodSelector.tsx \
  frontend/src/components/reports/SpendingByCategory.tsx \
  frontend/src/components/reports/TopExpenses.tsx \
  frontend/src/components/settings/DangerZoneSection.tsx \
  frontend/src/components/settings/DefaultAccountsSection.tsx \
  frontend/src/components/settings/ExportImportSection.tsx \
  frontend/src/components/settings/PreferencesSection.tsx \
  frontend/src/components/settings/index.ts \
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
  frontend/src/components/summary/index.ts \
  frontend/src/components/budget/BudgetDistribution.tsx \
  frontend/src/components/budget/BudgetEntryRow.tsx \
  frontend/src/components/budget/BudgetSummaryCard.tsx \
  frontend/src/components/budget/ScenarioSection.tsx \
  frontend/src/components/budget/index.ts \
  frontend/src/components/fixed-expenses/FixedExpensesHeader.tsx
```

---

## Category D: KEEP current version (modified hooks/services with functional changes)

These must NOT be restored — they contain important bug fixes and new features:

| File | Reason to keep |
|------|----------------|
| `hooks/queries/useReportsQueries.ts` | New `useExchangeRateHistoryQuery` hook |
| `hooks/queries/useSubPocketMutations.ts` | Optimistic update for toggle (UX improvement) |
| `hooks/useNetWorthChartData.ts` | Currency conversion fix (converts to primary currency for comparable Y-axis) |
| `services/reportService.ts` | New `getExchangeRateHistory` endpoint |

---

## Execution Plan

### Phase 1: Bulk Restore (Category A + C11)
Run the two `git checkout` commands above to restore all purely-visual files.

### Phase 2: Merge Pages (Category C)
For each page (C1-C10), manually:
1. Restore old file from `5199ad3`
2. Re-add new imports
3. Re-add new state/logic
4. Wire new components into old layout
5. Verify TypeScript compiles

**Priority order** (by complexity):
1. C4: MovementsPage (moderate)
2. C5: FixedExpensesPage (moderate)
3. C9: FixedExpensesList (moderate)
4. C10: NetWorthTimelineWidget (moderate)
5. C8: FixedExpenseGroupCard (heavy)
6. C7: MovementList (heavy)
7. C2: AccountsPage (heavy)
8. C3: BudgetPlanningPage (heavy)
9. C6: SettingsPage (heavy)
10. C1: SummaryPage (heavy)

### Phase 3: Verify
1. `npm run build` — ensure TypeScript compiles
2. `npm run test` — ensure tests pass
3. Visual inspection of each page

### Phase 4: Fix Import Errors
After restoring old files, some will reference components that no longer exist in the old versions (e.g., old `SummaryPage` imports `CurrencyBreakdownSection` which may have been restyled). Fix any broken imports by pointing to the correct current component names.

---

## Risk Notes

- **settings/index.ts**: Restoring this will remove exports for `DisplaySection`, `DataPrivacySection`, `AboutSection`. The new `SettingsPage` imports these — must update index.ts after merge.
- **summary/index.ts**: Restoring removes exports for new components (`CapitalBreakdown`, etc.). New `SummaryPage` imports these directly (not via index), so this should be safe.
- **budget/index.ts**: Restoring removes exports for new budget components. `BudgetPlanningPage` imports them directly, so safe.
- **SidePanel.tsx**: New file, kept as-is. But `ui/index.ts` restore will remove its export. Must re-add.
- **FixedExpenseGroupCard**: Heavy rewrite with new status logic. The old version has collapse/sortable logic that the new FixedExpensesList no longer supports. These two files must be merged together consistently.
