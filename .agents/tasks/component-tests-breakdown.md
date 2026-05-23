# Component & Hook Test Coverage Breakdown

## Summary

- **Total existing test files**: 36
- **Total untested components**: 95
- **Total untested hooks**: 35
- **Total untested pages**: 7
- **Grand total needing tests**: 137 files

Already tested (excluded from this doc):
- Components: `AllocationSliderRow`, `ThemeProvider`, `CategorySelector`, `MovementForm`, `QuickAddMovement`, `TagInput`, `ReminderCard`, `FinancialCalendarWidget`, `CapitalBreakdown`, `SpendingCard`, `Modal`, `InlineEditableAmount`
- Hooks: `useBalanceDeltas`, `useBulkSelection`, `useConfirm`, `useConsolidatedTotal`, `useLastUsedPocket`, `useMovementsFilter`, `useMovementsSort`, `useMovementSubmit`, `useNetWorthChartData`, `useToast`
- Pages: `LoginPage`, `SignUpPage`
- Services: `accountService`, `cdCalculationService`, `movementService`, `pocketService`, `subPocketService`
- Utils: `dateUtils`, `fixedExpenseUtils`, `idGenerator`, `reminderProjections`

---

## Untested Pages

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `pages/MovementsPage.tsx` | **High** | Main movements page with filters, bulk actions, pagination, form panel | Filter application, year/month nav, bulk selection, form open/close, URL action handling |
| `pages/AccountsPage.tsx` | **High** | Account management with CRUD, sorting, CD accounts | Account create/edit/delete flow, cascade delete, pocket management, drag-drop reorder |
| `pages/BudgetPlanningPage.tsx` | **High** | Budget distribution with income, scenarios, batch movements | Income input, distribution calculation, scenario switching, batch movement generation |
| `pages/FixedExpensesPage.tsx` | **High** | Fixed expense groups with sub-pockets, bulk generation | Group CRUD, expense toggle, bulk generate, batch form integration |
| `pages/SummaryPage.tsx` | **High** | Dashboard with totals, investment prices, widgets | Data loading states, consolidated total display, widget rendering, slow query indicator |
| `pages/SettingsPage.tsx` | **Medium** | Settings with section navigation | Section switching, settings update, export trigger |
| `pages/TemplatesPage.tsx` | **Medium** | Movement template CRUD | Template create/edit/delete, form validation |

---

## Untested Hooks — Action Hooks

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `hooks/actions/useAccountActions.ts` | **High** | Account CRUD orchestration, cascade delete controller | Create/edit/delete flows, cascade delete modal state, confirmation dialogs |
| `hooks/actions/useBudgetActions.ts` | **High** | Budget distribution logic, batch movement generation | Distribution calculation, scenario management, batch row generation |
| `hooks/actions/useFixedExpenseActions.ts` | **High** | Fixed expense group/sub-pocket actions, bulk generation | Toggle groups, generate batch movements, CRUD operations |
| `hooks/actions/useMovementBulkActions.ts` | **High** | Bulk delete/pending/apply for selected movements | Bulk delete with confirmation, apply pending, mark as pending, cache invalidation |
| `hooks/actions/useMovementRowActions.ts` | **High** | Single movement row actions (delete, apply pending) | Delete with confirm, apply pending movement, error handling |
| `hooks/actions/usePocketActions.ts` | **Medium** | Pocket CRUD with migration controller | Create/edit/delete pocket, migration between accounts |
| `hooks/actions/useReminderActions.ts` | **Medium** | Reminder CRUD with recurrence handling | Create/edit/delete, recurrence scope (this/all/future), mark as paid |
| `hooks/actions/useSettingsActions.ts` | **Medium** | Settings update orchestration, data export | Update individual settings, export data, budget persistence |

---

## Untested Hooks — Query/Mutation Hooks

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `hooks/queries/useMovementMutations.ts` | **High** | Movement create/update/delete mutations with targeted cache invalidation | Mutation calls, correct query invalidation keys, error toasts |
| `hooks/queries/useAccountMutations.ts` | **High** | Account create/update/delete/reorder mutations | Mutation calls, cache invalidation, cross-tab broadcast |
| `hooks/queries/usePocketMutations.ts` | **Medium** | Pocket CRUD mutations | Create/update/delete, selective cache invalidation |
| `hooks/queries/useSubPocketMutations.ts` | **Medium** | Sub-pocket CRUD mutations | Create/update/delete/toggle, error handling |
| `hooks/queries/useFixedExpenseGroupMutations.ts` | **Medium** | Fixed expense group mutations | Create/update/delete/reorder |
| `hooks/queries/useReminderQueries.ts` | **Medium** | Reminder queries + mutations (create, update, delete, exceptions) | Query config, mutation flows, exception creation |
| `hooks/queries/useMovementTemplates.ts` | **Medium** | Template queries + mutations | CRUD mutations, cache invalidation |
| `hooks/queries/useNetWorthSnapshotQueries.ts` | **Medium** | Net worth snapshot queries + mutations | Query/create/update/delete snapshots |
| `hooks/queries/useAccountsQuery.ts` | **Low** | Simple query wrapper | Query key, stale time config |
| `hooks/queries/usePocketsQuery.ts` | **Low** | Simple query wrapper | Query key, stale time config |
| `hooks/queries/useSettingsQuery.ts` | **Low** | Simple query wrapper | Query key, stale time config |
| `hooks/queries/useSettingsMutations.ts` | **Low** | Settings update mutation | Mutation call, cache invalidation |
| `hooks/queries/useMovementsQuery.ts` | **Low** | Movements query with pagination | Query keys, page size, infinite query config |
| `hooks/queries/useMonthlyMovementsQuery.ts` | **Low** | Monthly movements paginated query | Query key includes year/month/page/filters |
| `hooks/queries/useMovementYearsQuery.ts` | **Low** | Available years query | Query key, stale time |
| `hooks/queries/useOrphanedMovementsQuery.ts` | **Low** | Orphaned movements query | Query key |
| `hooks/queries/useFixedExpenseGroupsQuery.ts` | **Low** | Fixed expense groups query | Query key, stale time |
| `hooks/queries/useSubPocketsQuery.ts` | **Low** | Sub-pockets query | Query key, stale time |
| `hooks/queries/useSpendingSummaryQuery.ts` | **Low** | Spending summary query | Query key, refetch config |

---

## Untested Hooks — Standalone

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `hooks/useMovementFormState.ts` | **High** | Form state management for movement creation/editing | Open/close form, edit mode, template application, default values |
| `hooks/useURLActions.ts` | **High** | URL-driven actions (deep links to create movements, apply templates) | Parse URL params, trigger form open, apply filters from URL |
| `hooks/useInvestmentPrices.ts` | **High** | Investment price fetching with triple-click force refresh | Price queries, force refresh cooldown, click threshold |
| `hooks/useAutoNetWorthSnapshot.ts` | **Medium** | Auto-snapshot on app load based on frequency settings | Frequency check, skip if manual, skip if recent snapshot exists |
| `hooks/useBudgetPersistence.ts` | **Medium** | LocalStorage persistence for budget planning data | Save/load from localStorage, debounced persistence |
| `hooks/useOrphanedRestore.ts` | **Medium** | Modal state for restoring orphaned movements | Open/close modal, movement ID tracking |
| `hooks/useGlobalKeyboardShortcuts.ts` | **Medium** | Global keyboard shortcut registration | Shortcut matching, input focus skip, modifier keys |
| `hooks/useDateFormat.ts` | **Low** | Date formatting using user settings | Format with settings preference, fallback format |
| `hooks/useOnlineStatus.ts` | **Low** | Browser online/offline status tracking | Online/offline events, useSyncExternalStore |
| `hooks/useSlowQuery.ts` | **Low** | Slow query detection after threshold | Timer starts on loading, clears on done, isSlow flag |
| `hooks/useUnsavedChanges.ts` | **Low** | Beforeunload + popstate warning for dirty forms | beforeunload event, popstate interception |

---

## Untested Components — Movements (Highest Priority)

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `movements/BatchMovementForm.tsx` | **High** | Multi-row batch movement entry with field arrays | Add/remove rows, validation, form submission, unsaved changes warning |
| `movements/MovementFilters.tsx` | **High** | Filter panel for movements (type, account, date range, search) | Filter changes, clear filters, active filter count |
| `movements/MovementList.tsx` | **High** | Movement list with inline editing, sorting, selection | Render movements, sort toggle, inline edit, bulk select checkbox |
| `movements/MovementFormPanel.tsx` | **High** | Side panel containing form + calculator + account context | Panel open/close, mode switching (single/batch), calculator integration |
| `movements/AccountPocketSelector.tsx` | **High** | Cascading account→pocket→sub-pocket dropdown | Auto-select logic, filtering by movement type, sub-pocket visibility |
| `movements/BulkActionsToolbar.tsx` | **Medium** | Toolbar for bulk operations on selected movements | Button clicks dispatch callbacks, selected count display |
| `movements/BatchMovementRow.tsx` | **Medium** | Single row in batch form | Field rendering, account/pocket selection per row |
| `movements/OrphanedMovementsPanel.tsx` | **Medium** | Panel showing orphaned movements with restore option | Render orphaned list, restore click callback |
| `movements/QuickCalculator.tsx` | **Medium** | Calculator for quick amount computation | Arithmetic operations, result callback |
| `movements/YearMonthNav.tsx` | **Medium** | Year/month navigation tabs | Year/month selection, highlight months with data |
| `movements/AccountContextPanel.tsx` | **Low** | Account details sidebar in movement form | Render account/pocket balances |
| `movements/MovementTypeSelect.tsx` | **Low** | Movement type dropdown | Type selection, "all" option |
| `movements/PaginationControls.tsx` | **Low** | Page navigation controls | Page change callbacks |
| `movements/TemplateCard.tsx` | **Low** | Template display card | Render template info, edit/delete callbacks |
| `movements/RestoreOrphanedModal.tsx` | **Low** | Modal for selecting target account/pocket for restore | Account selection, confirm restore |
| `movements/MovementTemplateForm.tsx` | **Low** | Form for creating/editing templates | Form validation, submit |

---

## Untested Components — Accounts

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `accounts/AccountForm.tsx` | **High** | Account create/edit form with validation | Form validation, submit, currency selection, color picker, unsaved changes |
| `accounts/CDAccountForm.tsx` | **High** | CD/investment account form with APY, maturity date | Form fields, preview calculation, validation |
| `accounts/CascadeDeleteDialog.tsx` | **High** | Confirmation dialog for cascade account deletion | Toggle delete movements, confirm/cancel callbacks |
| `accounts/PocketForm.tsx` | **Medium** | Pocket create/edit form | Form validation, type selection, submit |
| `accounts/AccountCard.tsx` | **Medium** | Account display card with actions | Render account info, select callback, edit/delete actions |
| `accounts/AccountDetailPanel.tsx` | **Medium** | Detailed account view with pockets | Render pockets, balance display |
| `accounts/PocketCard.tsx` | **Low** | Pocket display card | Render pocket info |
| `accounts/CDAccountCard.tsx` | **Low** | CD account card with APY/maturity info | Render CD details |
| `accounts/CDDetailsPanel.tsx` | **Low** | CD account detail panel | Render CD calculations |
| `accounts/CDPreviewSection.tsx` | **Low** | Preview section in CD form | Render projected values |
| `accounts/CDWarningsSection.tsx` | **Low** | Warnings for CD accounts | Conditional warning display |
| `accounts/PocketManagementSection.tsx` | **Low** | Pocket list within account detail | Render pocket list, add pocket |

---

## Untested Components — Budget

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `budget/BudgetDistribution.tsx` | **High** | Distribution entries with percentage/amount editing, donut chart | Add/remove entries, percentage calculation, remaining amount |
| `budget/ScenarioForm.tsx` | **High** | Scenario create/edit with expense selection | Form validation, expense toggle, monthly calculation |
| `budget/BudgetIncomeSection.tsx` | **Medium** | Income input card | Amount change callback |
| `budget/BudgetEntryRow.tsx` | **Medium** | Single distribution entry row | Percentage/amount editing, delete callback |
| `budget/BudgetScenarioTabs.tsx` | **Medium** | Scenario tab navigation | Tab switching, add/delete scenario |
| `budget/BudgetSidebar.tsx` | **Low** | Budget sidebar with stats | Render stats |
| `budget/BudgetStatsCards.tsx` | **Low** | Stats cards display | Render calculated values |
| `budget/BudgetSummaryCard.tsx` | **Low** | Summary card | Render totals |
| `budget/BudgetIncomeCard.tsx` | **Low** | Income display card | Render income |
| `budget/DonutChart.tsx` | **Low** | SVG donut chart | Render segments proportionally |
| `budget/PortfolioDonutChart.tsx` | **Low** | Portfolio allocation donut | Render portfolio segments |
| `budget/AllocationStrategy.tsx` | **Low** | Strategy selection | Strategy change callback |

---

## Untested Components — Reminders

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `reminders/ReminderForm.tsx` | **High** | Reminder create/edit form with recurrence options | Form validation, recurrence config, linked template/expense |
| `reminders/RemindersWidget.tsx` | **High** | Full reminders widget with month sections, actions | Render upcoming reminders, action callbacks, view toggle |
| `reminders/MarkAsPaidModal.tsx` | **Medium** | Modal to mark reminder paid with movement linking | Movement search, link selection, confirm |
| `reminders/RecurrenceActionModal.tsx` | **Medium** | Scope selection for recurring reminder actions | Scope selection (this/all/future), action dispatch |
| `reminders/ReminderCalendarHeatmap.tsx` | **Medium** | Calendar heatmap showing reminder density | Month navigation, day highlighting, tooltip |
| `reminders/MonthSection.tsx` | **Low** | Month group rendering for reminders | Render reminder cards in month group |

---

## Untested Components — Fixed Expenses

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `fixed-expenses/FixedExpenseForm.tsx` | **High** | Sub-pocket create/edit form with monthly calculation | Form validation, periodicity, amount calculation |
| `fixed-expenses/FixedExpenseGroupCard.tsx` | **High** | Group card with progress bars, toggle, expand/collapse | Toggle group, expand/collapse, progress display |
| `fixed-expenses/FixedExpenseGroupForm.tsx` | **Medium** | Group create/edit form | Form validation, color picker, submit |
| `fixed-expenses/FixedExpensesList.tsx` | **Medium** | Sortable list of expense groups | Render groups, drag-drop reorder |
| `fixed-expenses/FixedExpensesHeader.tsx` | **Low** | Header with stats summary | Render counts and totals |

---

## Untested Components — Net Worth

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `net-worth/NetWorthChart.tsx` | **High** | Recharts line chart for net worth timeline | Render chart with data, click handler, series styling |
| `net-worth/NetWorthTimelineWidget.tsx` | **High** | Orchestrator widget with view mode, date range, variation toggle | Mode switching, date range filter, chart rendering |
| `net-worth/NetWorthEditModal.tsx` | **Medium** | Imperative modal for editing/deleting snapshots | Open with snapshot, edit form, delete confirmation |
| `net-worth/ExchangeRateTrend.tsx` | **Medium** | Exchange rate line chart | Render multi-currency lines, date range |

---

## Untested Components — Settings

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `settings/PreferencesSection.tsx` | **Medium** | Currency, date format, snapshot frequency settings | Setting changes trigger callbacks |
| `settings/DefaultAccountsSection.tsx` | **Medium** | Default account/pocket selectors for income/expense | Selector changes, callback dispatch |
| `settings/DisplaySection.tsx` | **Low** | Account card display mode settings | Mode toggle |
| `settings/DataPrivacySection.tsx` | **Low** | Data export button | Export click callback |
| `settings/ExportImportSection.tsx` | **Low** | Export/import section | Export click |
| `settings/DangerZoneSection.tsx` | **Low** | Debug tools (stock price, exchange rate refresh) | Render debug tools |
| `settings/AboutSection.tsx` | **Low** | App info display | Render version info |
| `settings/DebugExchangeRate.tsx` | **Low** | Debug exchange rate refresh | Refresh click |
| `settings/DebugStockPrice.tsx` | **Low** | Debug stock price refresh | Refresh click |

---

## Untested Components — Summary

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `summary/NetWorthHero.tsx` | **Medium** | Net worth display with trend indicator | Render total, trend arrow, percentage change |
| `summary/FixedObligationsWidget.tsx` | **Medium** | Fixed expenses progress widget | Render progress bars, navigate on click |
| `summary/TotalsSummary.tsx` | **Medium** | Totals by currency with selectable values | Render currency breakdown, selection |
| `summary/LiquidityConsumptionCard.tsx` | **Medium** | Spending summary (today/week/month) | Render period totals, loading state |
| `summary/FloatingStatsBar.tsx` | **Medium** | Floating bar showing sum/avg of selected values | Render when selection active, calculations |
| `summary/AccountSummaryCard.tsx` | **Low** | Account card on summary page | Render account with pockets |
| `summary/AccountSummaryCardCompact.tsx` | **Low** | Compact account card variant | Render compact layout |
| `summary/AccountSummaryRow.tsx` | **Low** | Account row in summary | Render row |
| `summary/CDSummaryCard.tsx` | **Low** | CD account summary card | Render CD info |
| `summary/CDSummaryCardCompact.tsx` | **Low** | Compact CD card | Render compact |
| `summary/CurrencyBreakdownSection.tsx` | **Low** | Currency breakdown section | Render per-currency totals |
| `summary/CurrencySection.tsx` | **Low** | Currency section wrapper | Render accounts by currency |
| `summary/FixedExpensesSummary.tsx` | **Low** | Fixed expenses in summary | Render expense list |
| `summary/FloatingActionBar.tsx` | **Low** | Floating action bar | Render action buttons |
| `summary/InvestmentCard.tsx` | **Low** | Investment account card | Render investment data |
| `summary/InvestmentCardCompact.tsx` | **Low** | Compact investment card | Render compact |
| `summary/SpendingDensityCard.tsx` | **Low** | Spending density visualization | Render density data |

---

## Untested Components — Feedback & Layout

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `feedback/ErrorBoundary.tsx` | **High** | React error boundary with recovery | Catches render errors, shows fallback, retry button |
| `feedback/ConfirmDialog.tsx` | **Medium** | Reusable confirmation dialog | Render variants (warning/info/danger), confirm/cancel |
| `feedback/SessionExpiredModal.tsx` | **Medium** | Session expired notification with redirect | Show on auth event, redirect to login |
| `feedback/ConnectionBanner.tsx` | **Low** | Offline/online status banner | Show when offline, hide when online |
| `feedback/QueryErrorCard.tsx` | **Low** | Error display card for failed queries | Render error message, retry button |
| `feedback/SlowQueryIndicator.tsx` | **Low** | Loading indicator for slow queries | Show after threshold |
| `feedback/ToastContainer.tsx` | **Low** | Toast notification container | Render active toasts |
| `feedback/Toast.tsx` | **Low** | Individual toast component | Render variants, auto-dismiss |
| `layout/ProtectedRoute.tsx` | **Medium** | Auth guard for routes | Redirect if unauthenticated, show loading |
| `layout/Sidebar.tsx` | **Medium** | Navigation sidebar | Active route highlighting, logout |
| `layout/Layout.tsx` | **Low** | App layout wrapper | Render sidebar + content |
| `layout/BottomNav.tsx` | **Low** | Mobile bottom navigation | Render nav items, active state |
| `layout/QuickActionsFAB.tsx` | **Low** | Mobile floating action button | Expand/collapse menu, navigation |

---

## Untested Components — UI Primitives

| File | Priority | Description | Key Behaviors to Test |
|------|----------|-------------|----------------------|
| `ui/SortableList.tsx` | **Medium** | Drag-and-drop sortable container | Render children, reorder callback |
| `ui/SortableItem.tsx` | **Medium** | Draggable item wrapper | Drag handle, render children |
| `ui/Select.tsx` | **Medium** | Custom select dropdown | Option rendering, change callback, disabled state |
| `ui/Input.tsx` | **Medium** | Custom input with label/error | Render label, error message, disabled state |
| `ui/Button.tsx` | **Low** | Button with variants | Render variants, loading state, disabled |
| `ui/Card.tsx` | **Low** | Card container | Render with padding variants |
| `ui/CollapsibleSection.tsx` | **Low** | Expandable/collapsible section | Toggle expand/collapse |
| `ui/ColorPickerModal.tsx` | **Low** | Color picker modal | Color selection, confirm |
| `ui/ColorSelector.tsx` | **Low** | Inline color selector | Color change callback |
| `ui/CurrencyAmount.tsx` | **Low** | Formatted currency display | Format with currency symbol |
| `ui/EmptyState.tsx` | **Low** | Empty state placeholder | Render message and action |
| `ui/FloatingPanel.tsx` | **Low** | Floating panel container | Render positioned panel |
| `ui/PageHeader.tsx` | **Low** | Page header with title/actions | Render title, action buttons |
| `ui/ProgressBar.tsx` | **Low** | Progress bar | Render percentage fill |
| `ui/AnimatedProgressBar.tsx` | **Low** | Animated progress bar | Animate on mount |
| `ui/AnimatedCounter.tsx` | **Low** | Animated number counter | Animate value change |
| `ui/SelectableValue.tsx` | **Low** | Clickable value for selection context | Click adds to selection |
| `ui/SidePanel.tsx` | **Low** | Slide-in side panel | Open/close animation |
| `ui/Skeleton.tsx` | **Low** | Loading skeleton | Render placeholder shapes |
| `ui/ActionButtons.tsx` | **Low** | Edit/delete action button group | Click callbacks |

---

## Execution Waves (Groups of 4 for Parallel Coder Agents)

### Wave 1 — Critical Pages
1. `pages/MovementsPage.tsx`
2. `pages/AccountsPage.tsx`
3. `pages/BudgetPlanningPage.tsx`
4. `pages/FixedExpensesPage.tsx`

### Wave 2 — Critical Pages + Error Boundary
1. `pages/SummaryPage.tsx`
2. `pages/SettingsPage.tsx`
3. `pages/TemplatesPage.tsx`
4. `feedback/ErrorBoundary.tsx`

### Wave 3 — High-Priority Action Hooks
1. `hooks/actions/useAccountActions.ts`
2. `hooks/actions/useBudgetActions.ts`
3. `hooks/actions/useFixedExpenseActions.ts`
4. `hooks/actions/useMovementBulkActions.ts`

### Wave 4 — High-Priority Action Hooks (cont.)
1. `hooks/actions/useMovementRowActions.ts`
2. `hooks/actions/usePocketActions.ts`
3. `hooks/actions/useReminderActions.ts`
4. `hooks/actions/useSettingsActions.ts`

### Wave 5 — High-Priority Mutation Hooks
1. `hooks/queries/useMovementMutations.ts`
2. `hooks/queries/useAccountMutations.ts`
3. `hooks/queries/usePocketMutations.ts`
4. `hooks/queries/useSubPocketMutations.ts`

### Wave 6 — High-Priority Standalone Hooks
1. `hooks/useMovementFormState.ts`
2. `hooks/useURLActions.ts`
3. `hooks/useInvestmentPrices.ts`
4. `hooks/useAutoNetWorthSnapshot.ts`

### Wave 7 — High-Priority Movement Components
1. `movements/BatchMovementForm.tsx`
2. `movements/MovementFilters.tsx`
3. `movements/MovementList.tsx`
4. `movements/MovementFormPanel.tsx`

### Wave 8 — High-Priority Movement + Account Components
1. `movements/AccountPocketSelector.tsx`
2. `accounts/AccountForm.tsx`
3. `accounts/CDAccountForm.tsx`
4. `accounts/CascadeDeleteDialog.tsx`

### Wave 9 — High-Priority Budget + Fixed Expense Components
1. `budget/BudgetDistribution.tsx`
2. `budget/ScenarioForm.tsx`
3. `fixed-expenses/FixedExpenseForm.tsx`
4. `fixed-expenses/FixedExpenseGroupCard.tsx`

### Wave 10 — High-Priority Reminders + Net Worth
1. `reminders/ReminderForm.tsx`
2. `reminders/RemindersWidget.tsx`
3. `net-worth/NetWorthChart.tsx`
4. `net-worth/NetWorthTimelineWidget.tsx`

### Wave 11 — Medium-Priority Hooks
1. `hooks/useBudgetPersistence.ts`
2. `hooks/useOrphanedRestore.ts`
3. `hooks/useGlobalKeyboardShortcuts.ts`
4. `hooks/queries/useFixedExpenseGroupMutations.ts`

### Wave 12 — Medium-Priority Hooks (cont.)
1. `hooks/queries/useReminderQueries.ts`
2. `hooks/queries/useMovementTemplates.ts`
3. `hooks/queries/useNetWorthSnapshotQueries.ts`
4. `hooks/queries/useSettingsMutations.ts`

### Wave 13 — Medium-Priority Components (Movements)
1. `movements/BulkActionsToolbar.tsx`
2. `movements/BatchMovementRow.tsx`
3. `movements/OrphanedMovementsPanel.tsx`
4. `movements/QuickCalculator.tsx`

### Wave 14 — Medium-Priority Components (Mixed)
1. `movements/YearMonthNav.tsx`
2. `accounts/PocketForm.tsx`
3. `accounts/AccountCard.tsx`
4. `accounts/AccountDetailPanel.tsx`

### Wave 15 — Medium-Priority Components (Budget + Reminders)
1. `budget/BudgetIncomeSection.tsx`
2. `budget/BudgetEntryRow.tsx`
3. `budget/BudgetScenarioTabs.tsx`
4. `reminders/MarkAsPaidModal.tsx`

### Wave 16 — Medium-Priority Components (Reminders + Fixed + Net Worth)
1. `reminders/RecurrenceActionModal.tsx`
2. `reminders/ReminderCalendarHeatmap.tsx`
3. `fixed-expenses/FixedExpenseGroupForm.tsx`
4. `fixed-expenses/FixedExpensesList.tsx`

### Wave 17 — Medium-Priority Components (Net Worth + Settings + Summary)
1. `net-worth/NetWorthEditModal.tsx`
2. `net-worth/ExchangeRateTrend.tsx`
3. `settings/PreferencesSection.tsx`
4. `settings/DefaultAccountsSection.tsx`

### Wave 18 — Medium-Priority Components (Summary + Feedback + Layout)
1. `summary/NetWorthHero.tsx`
2. `summary/FixedObligationsWidget.tsx`
3. `summary/TotalsSummary.tsx`
4. `summary/LiquidityConsumptionCard.tsx`

### Wave 19 — Medium-Priority Components (Layout + UI)
1. `summary/FloatingStatsBar.tsx`
2. `feedback/ConfirmDialog.tsx`
3. `feedback/SessionExpiredModal.tsx`
4. `layout/ProtectedRoute.tsx`

### Wave 20 — Medium-Priority (Layout + UI Primitives)
1. `layout/Sidebar.tsx`
2. `ui/SortableList.tsx`
3. `ui/SortableItem.tsx`
4. `ui/Select.tsx`

### Wave 21 — Medium + Low Priority UI
1. `ui/Input.tsx`
2. `ui/Button.tsx`
3. `ui/Card.tsx`
4. `ui/CollapsibleSection.tsx`

### Wave 22-25 — Low Priority (remaining components)

Remaining ~40 low-priority components (display-only cards, simple wrappers, debug tools) can be batched in waves 22-25 as capacity allows. These are mostly presentational with minimal logic.

---

## Testing Strategy Notes

- **Pages**: Use integration-style tests with mocked hooks/queries. Test user flows (open form, submit, see result).
- **Action hooks**: Unit test with mocked mutation/query hooks. Verify state transitions and callback behavior.
- **Query/mutation hooks**: Test with `@tanstack/react-query` test utilities. Verify query keys, invalidation patterns, error handling.
- **Form components**: Test validation rules, submit behavior, unsaved changes warning.
- **Display components**: Snapshot or render tests verifying correct data display and conditional rendering.
- **Use existing test patterns**: Follow patterns from `useMovementSubmit.test.ts` and `MovementForm.test.tsx` for consistency.
