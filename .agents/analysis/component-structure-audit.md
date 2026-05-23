# Component Structure Audit

## Executive Summary

The recent page-level decomposition (pages → hooks + components) was well-executed. However, the **components themselves** have significant structural issues: 7 files exceed 300 lines, duplicated domain constants appear in 4+ places, several directories lack barrel exports, and a misplaced top-level component belongs in a subdirectory. The biggest wins are extracting shared constants/utilities and adding a `ConfirmDialog` provider to eliminate ~50 lines of boilerplate per page.

---

## 1. Oversized Components (>200 lines)

### Critical (>400 lines)

| File | Lines | Issue |
|------|-------|-------|
| `components/net-worth/NetWorthTimelineWidget.tsx` | 553 | Chart widget + edit modal + confirm dialog + data processing all in one |
| `components/accounts/CDAccountForm.tsx` | 441 | Form + validation + preview calculation + preview UI |
| `components/movements/MovementList.tsx` | 433 | MovementRow sub-component + list + sort controls + floating stats bar |
| `components/reminders/RemindersWidget.tsx` | 400 | Full CRUD orchestrator with 5 modals and complex recurrence logic |
| `components/BatchMovementForm.tsx` | 399 | Multi-row form with complex pocket filtering logic |
| `components/reminders/ReminderForm.tsx` | 396 | Form with recurrence UI, day-of-week picker, end conditions |
| `components/movements/MovementForm.tsx` | 382 | Form with transfer mode, fixed-expense auto-selection, template loading |

### High (300-400 lines)

| File | Lines | Issue |
|------|-------|-------|
| `components/accounts/CDDetailsPanel.tsx` | 375 | Detail view with calculations, advanced toggle, maturity section |
| `components/calendar/FinancialCalendarWidget.tsx` | 369 | Calendar grid + day data processing + navigation |
| `components/FixedExpenseGroupCard.tsx` | 358 | Group header + expense rows + progress bars + actions |
| `components/Layout.tsx` | 312 | Sidebar + bottom nav + quick actions FAB + mobile menu |
| `components/budget/BudgetDistribution.tsx` | 304 | Entry list + donut chart + edit state management |

### Medium (200-300 lines)

| File | Lines | Issue |
|------|-------|-------|
| `components/summary/FixedExpensesSummary.tsx` | 242 | |
| `components/movements/MovementFilters.tsx` | 240 | |
| `components/budget/ScenarioForm.tsx` | 239 | |
| `components/summary/CDSummaryCard.tsx` | 237 | |
| `components/budget/BudgetEntryRow.tsx` | 232 | |
| `components/accounts/PocketManagementSection.tsx` | 223 | |
| `components/settings/PreferencesSection.tsx` | 216 | |
| `components/summary/AccountSummaryCard.tsx` | 207 | |
| `components/ColorPickerModal.tsx` | 207 | |

### Specific Extraction Recommendations

#### NetWorthTimelineWidget.tsx (553 → ~200 + 150 + 100 + 100)
- **Extract**: `NetWorthChart.tsx` — the `<ResponsiveContainer>` + `<LineChart>` block (~150 lines)
- **Extract**: `NetWorthEditModal.tsx` — the edit/delete modal (~100 lines)
- **Extract**: `useNetWorthChartData.ts` hook — the `chartData` useMemo + `filteredSnapshots` + `rates` logic (~100 lines)
- **Priority**: High

#### CDAccountForm.tsx (441 → ~250 + 100 + 90)
- **Extract**: `CDPreviewSection.tsx` — the preview calculation display block (lines 320-400)
- **Extract**: `CDWarningsSection.tsx` — the two warning banners (lines 400-420)
- **Keep**: Form fields are cohesive and should stay together
- **Priority**: Medium

#### RemindersWidget.tsx (400 → ~200 + 200)
- **Extract**: `useReminderActions.ts` hook — all the `handleRecurrenceAction`, `handleCreate`, `handleUpdate`, `handleConfirmMarkAsPaid` logic (~150 lines of handlers)
- **Priority**: High

#### BatchMovementForm.tsx (399 → ~200 + 150)
- **Extract**: `BatchMovementRow.tsx` — the per-row rendering block (lines 225-370)
- **Extract**: `useBatchMovementLogic.ts` — the `updateRow` logic with pocket filtering (lines 100-160)
- **Priority**: Medium

#### MovementForm.tsx (382 → ~250 + 130)
- **Extract**: `useMovementFormFiltering.ts` — the account/pocket filtering logic that's duplicated with BatchMovementForm (lines 75-110)
- **Priority**: High (because it's duplicated)

#### Layout.tsx (312 → ~150 + 80 + 80)
- **Extract**: `Sidebar.tsx` — desktop sidebar navigation
- **Extract**: `BottomNav.tsx` — mobile bottom navigation
- **Extract**: `QuickActionsFAB.tsx` — the floating action button with quick actions
- **Priority**: Medium

---

## 2. Duplicated Patterns

### 2.1 Movement Type Constants (Duplicated 4 times) — Priority: HIGH

The movement type options array is defined identically in:
- `components/BatchMovementForm.tsx:75-78`
- `components/movements/MovementForm.tsx:130-135`
- `components/movements/MovementTemplateForm.tsx:60-63`
- `pages/TemplatesPage.tsx:106-109` (label function)

The `isFixedMove` check (`type === 'IngresoFijo' || type === 'EgresoFijo'`) appears **11 times** across the codebase.

**Recommendation**: Create `utils/movementTypes.ts`:
```typescript
export const MOVEMENT_TYPE_OPTIONS = [...];
export const isFixedMovement = (type: MovementType) => ...;
export const isIncome = (type: MovementType) => ...;
export const getMovementTypeLabel = (type: MovementType) => ...;
export const getMovementTypeColor = (type: MovementType) => ...;
```

### 2.2 Currency List (Duplicated 3 times) — Priority: HIGH

The `['USD', 'MXN', 'COP', 'EUR', 'GBP']` array is defined in:
- `components/accounts/AccountForm.tsx:25`
- `components/settings/PreferencesSection.tsx:11`
- `components/accounts/CDAccountForm.tsx:148-154` (as options with labels)
- `services/settingsService.ts:14`

The CDAccountForm version also includes labels (`'USD - US Dollar'`), which is a richer version.

**Recommendation**: Create `constants/currencies.ts`:
```typescript
export const CURRENCIES: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];
export const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c, label: CURRENCY_LABELS[c] }));
```

### 2.3 Account/Pocket Filtering Logic (Duplicated 5+ times) — Priority: HIGH

The pattern of filtering accounts by whether they have fixed pockets, then filtering pockets by account and type, appears in:
- `components/movements/MovementForm.tsx:80-92`
- `components/BatchMovementForm.tsx:231-245`
- `components/movements/MovementTemplateForm.tsx:50-54`
- `pages/FixedExpensesPage.tsx:57,274`
- `pages/BudgetPlanningPage.tsx:63,195`

**Recommendation**: Create a `useAccountPocketFiltering` hook or utility:
```typescript
export function useAccountPocketFiltering(accounts, pockets, movementType) {
  // Returns: filteredAccounts, getFilteredPockets(accountId), getFixedPocket(accountId)
}
```

### 2.4 ConfirmDialog Boilerplate (Duplicated 7 times) — Priority: HIGH

Every page and some components repeat this exact pattern:
```tsx
const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();
// ... later in JSX:
<ConfirmDialog
  isOpen={confirmState.isOpen}
  title={confirmState.title}
  message={confirmState.message}
  confirmText={confirmState.confirmText}
  cancelText={confirmState.cancelText}
  variant={confirmState.variant}
  onConfirm={handleConfirm}
  onClose={handleClose}
/>
```

Found in: `AccountsPage`, `FixedExpensesPage`, `MovementsPage`, `TemplatesPage`, `BudgetPlanningPage`, `NetWorthTimelineWidget`, `RemindersWidget`

**Recommendation**: Create a `ConfirmDialogProvider` that wraps the app and exposes `confirm()` via context. The `<ConfirmDialog>` renders once at the provider level. Pages just call `const confirm = useConfirmDialog()` — no JSX needed.

### 2.5 Currency Formatting Inconsistency (Mixed approaches) — Priority: MEDIUM

Two different formatting approaches are used:
1. `currencyService.formatCurrency(amount, currency)` — used in CD components, calendar, net-worth
2. `amount.toLocaleString(undefined, { style: 'currency', currency })` — used in FixedExpenseGroupCard, MovementList

The `NetWorthTimelineWidget` even defines its own local `formatCurrency` function (line 229).

**Recommendation**: Standardize on `currencyService.formatCurrency()` everywhere. Remove the local function in NetWorthTimelineWidget.

### 2.6 Section Header Pattern (Duplicated 10+ times) — Priority: LOW

The pattern `<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">` appears 10+ times.

**Recommendation**: Create a `SectionHeader` component:
```tsx
<SectionHeader icon={TrendingUp} title="Net Worth Timeline" />
```

### 2.7 Form Action Buttons (Duplicated 10+ times) — Priority: LOW

Every form ends with a nearly identical footer:
```tsx
<div className="flex justify-end gap-2 pt-4">
  <Button variant="secondary" onClick={onCancel}>Cancel</Button>
  <Button variant="primary" loading={isSaving}>{label}</Button>
</div>
```

Minor variations: some add `border-t`, some use `gap-3`.

**Recommendation**: Create a `FormActions` component:
```tsx
<FormActions onCancel={onCancel} isSaving={isSaving} submitLabel="Create" />
```

---

## 3. Inline JSX That Should Be Components

### Pages with remaining inline JSX

| File | Lines | What to extract |
|------|-------|-----------------|
| `pages/AccountsPage.tsx` | 317 | Well-decomposed already. The error banner (lines 170-174) is minor. |
| `pages/FixedExpensesPage.tsx` | 316 | Well-decomposed. No major inline blocks. |
| `pages/TemplatesPage.tsx` | 300 | The template card rendering (lines 130-250) should be a `TemplateCard` component. Currently renders inline with edit/delete buttons, type badge, account/pocket info. ~120 lines of JSX. **Priority: Medium** |
| `pages/MovementsPage.tsx` | 292 | Well-decomposed into sub-components. |
| `pages/BudgetPlanningPage.tsx` | 219 | Clean. |
| `pages/SummaryPage.tsx` | 213 | Clean. |

### Components with extractable inline JSX

| File | Block | Recommendation |
|------|-------|----------------|
| `NetWorthTimelineWidget.tsx` | Lines 330-470 (chart controls + chart) | Extract `NetWorthChartControls` |
| `MovementList.tsx` | Lines 300-340 (empty state) | Already uses Card but could use `EmptyState` component |
| `RemindersWidget.tsx` | Lines 315-330 (empty state) | Should use the shared `EmptyState` component |
| `FixedExpenseGroupCard.tsx` | Lines 200-310 (expense row) | Extract `FixedExpenseRow` sub-component |

---

## 4. Shared Components: Usage Consistency

### EmptyState — Inconsistently Used

The `EmptyState` component exists and is well-designed, but several places roll their own:
- `MovementList.tsx:290-300` — custom empty state with Card wrapper
- `RemindersWidget.tsx:315-330` — custom empty state inline
- `NetWorthTimelineWidget.tsx:320-330` — custom empty state inline
- `BudgetDistribution.tsx:209` — plain text empty state
- `PocketManagementSection.tsx:129` — plain text

**Recommendation**: Replace all custom empty states with the shared `EmptyState` component. **Priority: Medium**

### Skeleton — Well Used

The `Skeleton` component and its variants (`SkeletonList`, `SkeletonTable`, `SkeletonAccountCard`, `SkeletonStats`) are used consistently across pages. No issues.

### PageHeader — Well Used

Used in `AccountsPage`, `FixedExpensesPage`. Other pages that could benefit: `TemplatesPage`, `BudgetPlanningPage`.

### Modal — Consistently Used

All modals use the shared `Modal` component. Good.

---

## 5. Missing Shared Abstractions

### 5.1 `ConfirmDialogProvider` — Priority: HIGH

As described in section 2.4. Would eliminate ~50 lines of boilerplate per page/widget that uses confirmation dialogs (7 instances).

### 5.2 `AccountPocketSelector` component — Priority: HIGH

The account → pocket → sub-pocket cascading select pattern appears in:
- `MovementForm.tsx`
- `BatchMovementForm.tsx` (per row)
- `MovementTemplateForm.tsx`
- `RestoreOrphanedModal.tsx`
- `MovementFilters.tsx` (account + pocket filter)

Each re-implements the filtering logic (fixed vs normal, auto-select fixed pocket, etc.)

**Recommendation**: Create `components/selectors/AccountPocketSelector.tsx`:
```tsx
interface AccountPocketSelectorProps {
  movementType: MovementType;
  selectedAccountId: string;
  selectedPocketId: string;
  selectedSubPocketId?: string;
  onAccountChange: (id: string) => void;
  onPocketChange: (id: string) => void;
  onSubPocketChange?: (id: string) => void;
  showSubPockets?: boolean;
}
```

### 5.3 `CurrencyAmount` display component — Priority: MEDIUM

Currency formatting appears 30+ times with two different approaches. A display component would standardize:
```tsx
<CurrencyAmount value={1234.56} currency="USD" sign="+" colorize />
// Renders: +$1,234.56 in green
```

### 5.4 `MovementTypeSelect` component — Priority: MEDIUM

The movement type dropdown with its options array is duplicated 3 times. Extract:
```tsx
<MovementTypeSelect value={type} onChange={setType} includeTransfer={true} />
```

### 5.5 `FormSection` component — Priority: LOW

Many forms use a pattern of:
```tsx
<div className="space-y-4">
  <h3 className="text-sm font-semibold ...">Section Title</h3>
  {children}
</div>
```

Seen in: `ReminderForm`, `CDAccountForm`, `MovementForm`. A `FormSection` wrapper would reduce repetition.

---

## 6. Directory Structure Issues

### 6.1 Missing `index.ts` Barrel Exports — Priority: MEDIUM

Directories **with** barrel exports: `accounts/`, `fixed-expenses/`, `settings/`, `summary/`, `budget/`

Directories **missing** barrel exports:
- `components/movements/` — 8 component files, no index
- `components/reminders/` — 6 component files, no index
- `components/net-worth/` — 1 component file (borderline, but should have one for consistency)
- `components/calendar/` — 1 component file

**Impact**: Imports from these directories use full paths (`../movements/MovementList`) instead of barrel imports (`../movements`).

### 6.2 Misplaced Component — Priority: MEDIUM

`components/FixedExpenseGroupCard.tsx` is at the **top level** but belongs in `components/fixed-expenses/`.

It's the only feature-specific component at the top level (everything else at the top level is a shared/generic component like Button, Card, Modal, etc.)

**Recommendation**: Move to `components/fixed-expenses/FixedExpenseGroupCard.tsx` and re-export from the barrel.

### 6.3 `BatchMovementForm.tsx` at Top Level — Priority: LOW

`components/BatchMovementForm.tsx` is at the top level but is movement-specific. It could live in `components/movements/`. However, it's also used from `FixedExpensesPage`, so the top level is defensible. Low priority.

### 6.4 No Top-Level `index.ts` for Shared Components — Priority: LOW

The shared components at `components/` root (Button, Card, Modal, Input, Select, EmptyState, etc.) have no barrel export. Each is imported individually. A `components/ui/index.ts` or `components/shared/index.ts` barrel would clean up imports.

### 6.5 Hooks Directory Organization — Priority: LOW

Current structure:
```
hooks/
├── queries/          # TanStack Query hooks (good)
├── mutations/        # Only useSettingsMutations (mostly empty)
├── useAccountActions.ts
├── useBudgetActions.ts
├── useFixedExpenseActions.ts
├── usePocketActions.ts
├── useMovementFormState.ts
├── useMovementSubmit.ts
├── useMovementRowActions.ts
├── useMovementBulkActions.ts
├── useMovementsFilter.ts
├── useMovementsSort.ts
├── ... (15 more)
```

**Issues**:
- The `mutations/` directory only has one file. All other mutations live in `queries/` (e.g., `useAccountMutations.ts` is in `queries/`). This is confusing.
- Movement-related hooks (6 files) could be grouped into `hooks/movements/`
- The `queries/` directory mixes queries and mutations (e.g., `useAccountMutations.ts` is in `queries/`)

**Recommendation**:
1. Merge `mutations/useSettingsMutations.ts` into `queries/` for consistency (or rename `queries/` to `data/`)
2. Optionally group: `hooks/movements/` for the 6 movement-specific hooks

---

## 7. Hook Organization Issues

### 7.1 Mutations in Wrong Directory — Priority: LOW

`hooks/mutations/useSettingsMutations.ts` is the only file in `mutations/`, while all other mutation hooks (`useAccountMutations`, `usePocketMutations`, `useMovementMutations`, etc.) live in `hooks/queries/`.

**Recommendation**: Move `useSettingsMutations.ts` into `hooks/queries/` and delete the `mutations/` directory. Or rename `queries/` to `data/` to better reflect that it contains both queries and mutations.

### 7.2 No Duplicated Hook Logic Found

The hooks are well-separated with clear responsibilities. No two hooks duplicate significant logic. The page-level decomposition was done well.

---

## 8. Priority Summary

### High Priority (do first — high duplication or >300 lines with clear extraction path)

| # | Item | Impact |
|---|------|--------|
| 1 | Create `utils/movementTypes.ts` (constants + helpers) | Eliminates 4 duplicated arrays + 11 inline checks |
| 2 | Create `constants/currencies.ts` | Eliminates 3 duplicated arrays |
| 3 | Create `ConfirmDialogProvider` | Eliminates ~350 lines of boilerplate across 7 files |
| 4 | Create `AccountPocketSelector` component | Eliminates duplicated filtering logic in 4 forms |
| 5 | Extract `NetWorthChart` + `NetWorthEditModal` + `useNetWorthChartData` | Breaks 553-line file into manageable pieces |
| 6 | Extract `useReminderActions` hook from RemindersWidget | Breaks 400-line widget into ~200 + hook |

### Medium Priority (clear improvement, less urgent)

| # | Item | Impact |
|---|------|--------|
| 7 | Add `index.ts` to `movements/`, `reminders/` | Cleaner imports |
| 8 | Move `FixedExpenseGroupCard.tsx` to `fixed-expenses/` | Correct organization |
| 9 | Extract `TemplateCard` from TemplatesPage | ~120 lines of inline JSX |
| 10 | Create `CurrencyAmount` display component | Standardizes 30+ formatting sites |
| 11 | Create `MovementTypeSelect` component | Eliminates 3 duplicated dropdowns |
| 12 | Replace custom empty states with shared `EmptyState` | Consistency (5 sites) |
| 13 | Extract `CDPreviewSection` from CDAccountForm | Breaks 441-line form |
| 14 | Extract `BatchMovementRow` from BatchMovementForm | Breaks 399-line form |
| 15 | Extract `Sidebar`, `BottomNav`, `QuickActionsFAB` from Layout | Breaks 312-line layout |

### Low Priority (nice-to-have)

| # | Item | Impact |
|---|------|--------|
| 16 | Create `SectionHeader` component | Minor DRY improvement |
| 17 | Create `FormActions` component | Minor DRY improvement |
| 18 | Create `FormSection` component | Minor DRY improvement |
| 19 | Merge `mutations/` into `queries/` | Directory cleanup |
| 20 | Standardize currency formatting to `currencyService` everywhere | Consistency |
| 21 | Add barrel export for shared UI components | Cleaner imports |

---

## Appendix: File Size Reference

All component files >150 lines, sorted by size:

```
553  components/net-worth/NetWorthTimelineWidget.tsx
441  components/accounts/CDAccountForm.tsx
433  components/movements/MovementList.tsx
400  components/reminders/RemindersWidget.tsx
399  components/BatchMovementForm.tsx
396  components/reminders/ReminderForm.tsx
382  components/movements/MovementForm.tsx
375  components/accounts/CDDetailsPanel.tsx
369  components/calendar/FinancialCalendarWidget.tsx
358  components/FixedExpenseGroupCard.tsx
312  components/Layout.tsx
304  components/budget/BudgetDistribution.tsx
242  components/summary/FixedExpensesSummary.tsx
240  components/movements/MovementFilters.tsx
239  components/budget/ScenarioForm.tsx
237  components/summary/CDSummaryCard.tsx
232  components/budget/BudgetEntryRow.tsx
223  components/accounts/PocketManagementSection.tsx
216  components/settings/PreferencesSection.tsx
207  components/summary/AccountSummaryCard.tsx
207  components/ColorPickerModal.tsx
197  components/movements/AccountContextPanel.tsx
194  components/fixed-expenses/FixedExpenseForm.tsx
191  components/summary/InvestmentCard.tsx
190  components/movements/MovementFormPanel.tsx
182  components/reminders/ReminderCard.tsx
180  components/summary/CDSummaryCardCompact.tsx
180  components/movements/QuickCalculator.tsx
166  components/reminders/MarkAsPaidModal.tsx
165  components/movements/MovementTemplateForm.tsx
157  components/Modal.tsx
```
