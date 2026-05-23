# Toggle Removal + Budget Currency — Frontend Task Waves

Backend toggle removal is complete (commit `af79633`). The `enabled` field no longer exists in the backend SubPocket domain/DTO. These tasks remove it from the frontend and add budget currency selection + per-allocation conversion.

---

## Wave 1: Data Layer Cleanup (types, services, mutations)

Leaf changes — no UI impact, no inter-task dependencies.

### Task 1.1 — Remove `enabled` from SubPocket type and test mocks

**Files:**
- `frontend/src/types/index.ts`
- `frontend/src/test/mockData.ts`
- `frontend/src/test/contracts/subPocketContracts.test.ts`

**Instructions:**
1. In `types/index.ts`, remove the `enabled: boolean` field from the `SubPocket` interface.
2. In `test/mockData.ts`, remove the `enabled` property from all mock SubPocket objects (lines 68, 77, 86).
3. In `test/contracts/subPocketContracts.test.ts`, remove the `enabled: true` from the valid sub-pocket fixture (line 148). The assertions on lines 187 and 314 that check `enabled` is NOT a valid update field should remain (they confirm the backend rejects it) — actually, since the backend no longer has this field at all, remove those assertions too.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(types): remove enabled field from SubPocket interface`

---

### Task 1.2 — Remove toggle methods from subPocketService

**Files:**
- `frontend/src/services/subPocketService.ts`

**Instructions:**
1. Delete the `toggleSubPocketEnabled` method (the one calling `POST /api/sub-pockets/${id}/toggle`).
2. Delete the `toggleGroup` method (the one calling `POST /api/fixed-expense-groups/${groupId}/toggle`).
3. In `calculateTotalFijosMes`, remove `.filter(sp => sp.enabled)` — sum ALL sub-pockets unconditionally.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(services): remove toggle methods from subPocketService`

---

### Task 1.3 — Remove toggleSubPocketEnabled mutation

**Files:**
- `frontend/src/hooks/queries/useSubPocketMutations.ts`

**Instructions:**
1. Delete the entire `toggleSubPocketEnabled` mutation definition (the `useMutation` block with `onMutate` optimistic update, `onError` rollback, and `onSettled` invalidation).
2. Remove `toggleSubPocketEnabled` from the returned object.
3. Remove the `SubPocket` type import if no longer used (check — it's used in the optimistic update only).

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(hooks): remove toggleSubPocketEnabled mutation`

---

### Task 1.4 — Remove toggleFixedExpenseGroup mutation

**Files:**
- `frontend/src/hooks/queries/useFixedExpenseGroupMutations.ts`

**Instructions:**
1. Delete the entire `toggleFixedExpenseGroup` mutation definition (the `useMutation` block that dynamically imports subPocketService).
2. Remove `toggleFixedExpenseGroup` from the returned object.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(hooks): remove toggleFixedExpenseGroup mutation`

---

## Wave 2: Hook Layer Cleanup (actions)

Depends on Wave 1 (types and mutations removed).

### Task 2.1 — Remove toggle logic from useFixedExpenseActions

**Files:**
- `frontend/src/hooks/actions/useFixedExpenseActions.ts`

**Instructions:**
1. Remove from the interface `UseFixedExpenseActionsResult`:
   - `handleToggleSubPocket`
   - `handleToggleGroup`
   - `togglingId`
   - `togglingGroupId`
2. Remove from `UseFixedExpenseActionsParams`: no change needed (the mutation types are inferred).
3. Remove state: `togglingId`, `togglingGroupId` (the `useState` declarations).
4. Remove destructuring of `toggleSubPocketEnabled` and `toggleFixedExpenseGroup` from mutations.
5. Delete the `handleToggleSubPocket` function entirely.
6. Delete the `handleToggleGroup` function entirely.
7. In `prepareBatchFromEnabled`:
   - Remove `const enabled = fixedSubPockets.filter((sp) => sp.enabled);` — use `fixedSubPockets` directly.
   - Change the empty check to `if (fixedSubPockets.length === 0)` with message "No fixed expenses found".
   - Map over `fixedSubPockets` instead of `enabled`.
8. Remove `handleToggleSubPocket`, `handleToggleGroup`, `togglingId`, `togglingGroupId` from the return object.
9. KEEP `toggleGroupCollapse` and `collapsedGroups` — those are UI collapse, not enable/disable.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(hooks): remove toggle logic from useFixedExpenseActions`

---

### Task 2.2 — Remove enabled filter from useBudgetActions

**Files:**
- `frontend/src/hooks/actions/useBudgetActions.ts`

**Instructions:**
1. In the `totalFijosMes` useMemo, find the `else` branch (line ~111):
   ```ts
   relevant = fixedSubPockets.filter((sp) => sp.enabled);
   ```
   Change to:
   ```ts
   relevant = fixedSubPockets;
   ```
   This is the fallback when no scenarios exist — now it includes ALL expenses.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(hooks): remove enabled filter from budget deduction calculation`

---

### Task 2.3 — Remove toggle from ObligationsHeader

**Files:**
- `frontend/src/components/budget/ObligationsHeader.tsx`

**Instructions:**
1. Remove the `enabledCount` prop from the interface — keep only `totalCount`, `totalMonthly`, `currency`.
2. Change the badge from `{enabledCount}/{totalCount}` to just `{totalCount}`.
3. Update the component signature to remove `enabledCount`.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(budget): remove enabledCount from ObligationsHeader`

---

### Task 2.4 — Remove toggle styling from summary widgets

**Files:**
- `frontend/src/components/summary/FixedObligationsWidget.tsx`
- `frontend/src/components/summary/FixedExpensesSummary.tsx`

**Instructions:**
1. In `FixedObligationsWidget.tsx` (~line 51-54): Remove the conditional `!sp.enabled` styling. Remove the `line-through` class and the "OFF" badge `<span>`. Always render the name normally.
2. In `FixedExpensesSummary.tsx` (~line 76-79): Same — remove the `!subPocket.enabled` conditional, the `line-through` class, and the "OFF" badge. Always render normally.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(summary): remove enabled/disabled styling from fixed expense widgets`

---

## Wave 3: Component Layer Cleanup (StitchGroupCard, StitchExpensesList)

Depends on Wave 2 (action hooks no longer export toggle handlers).

### Task 3.1 — Remove toggle from StitchGroupCard

**Files:**
- `frontend/src/components/fixed-expenses/StitchGroupCard.tsx`

**Instructions:**
1. Remove from `StitchGroupCardProps`:
   - `onToggleGroup`
   - `onToggleExpense`
   - `isTogglingGroup`
   - `togglingExpenseId`
2. Remove imports: `ToggleLeft`, `ToggleRight` from lucide-react.
3. In the `useMemo` that calculates `groupTotal`: remove the `if (!sp.enabled) continue;` filter — sum ALL expenses. Remove `enabledCount` and `allEnabled` from the return. Just return `{ groupTotal }`.
4. Remove the `groupToggleLabel` variable.
5. In the group header actions div: delete the entire toggle button (the one with `onToggleGroup`).
6. In the header left side: remove the `{enabledCount}/{expenses.length}` span — replace with just `{expenses.length}` (or remove entirely).
7. In expense rows: remove the `expense.enabled ? '' : 'opacity-50'` conditional class — always render full opacity.
8. Remove the `line-through` conditional on the expense name.
9. Delete the entire `<input type="checkbox">` toggle at the end of each expense row.
10. Remove `isToggling` and `expenseToggleLabel` variables from the expense map.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(fixed-expenses): remove toggle UI from StitchGroupCard`

---

### Task 3.2 — Remove toggle from StitchExpensesList

**Files:**
- `frontend/src/components/fixed-expenses/StitchExpensesList.tsx`

**Instructions:**
1. Remove from `StitchExpensesListProps`:
   - `onToggleGroup`
   - `onToggleExpense`
   - `togglingGroupId`
   - `togglingId`
2. Remove these props from the component destructuring.
3. Remove `onToggleGroup` from the `buildCardHandlers` callback.
4. Remove the following props passed to `<StitchGroupCard>`:
   - `onToggleGroup={cardHandlers.onToggleGroup}`
   - `onToggleExpense={onToggleExpense}`
   - `isTogglingGroup={togglingGroupId === group.id}`
   - `togglingExpenseId={togglingId}`
5. KEEP: `onToggleCollapse`, `collapsedGroups`, `onEditGroup`, `onDeleteGroup`, `onEditExpense`, `onDeleteExpense`, `deletingExpenseId`.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(fixed-expenses): remove toggle props from StitchExpensesList`

---

### Task 3.3 — Clean up UnifiedBudgetPage toggle wiring

**Files:**
- `frontend/src/pages/UnifiedBudgetPage.tsx`

**Instructions:**
1. Remove the `enabledCount` calculation: `const enabledCount = fixedSubPockets.filter((sp) => sp.enabled).length;`
2. Remove the `totalFixedExpensesMonthly` useMemo's `.filter((sp) => sp.enabled)` — sum ALL fixedSubPockets.
3. Delete the entire `handleToggleExpense` callback.
4. Delete the entire `handleToggleGroup` callback (the large one that computes `allEnabled` and calls `handleToggleSubPocket`/`handleToggleGroup`).
5. On `<ObligationsHeader>`: remove the `enabledCount` prop.
6. On `<StitchExpensesList>`: remove props `onToggleGroup`, `onToggleExpense`, `togglingGroupId={fixedExpenseActions.togglingGroupId}`, `togglingId={fixedExpenseActions.togglingId}`.
7. On `<ObligationsFooter>`: change `bulkDisabled={enabledCount === 0}` to `bulkDisabled={fixedSubPockets.length === 0}`.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `refactor(page): remove toggle wiring from UnifiedBudgetPage`

---

### Task 3.4 — Remove ObligationsFooter dependency on enabledCount

**Files:**
- `frontend/src/components/budget/ObligationsFooter.tsx`

**Instructions:**
This file has no direct toggle references — it just receives `bulkDisabled` as a boolean. No changes needed here. **This task is a NO-OP placeholder.** If the build passes after Task 3.3, this slot is free.

**Alternative use for this slot — verify full build:**
```bash
cd frontend && npm run build
```

**Commit:** (none — verification only)

---

## Wave 4: Budget Currency Selector + Conversion Legend

Depends on Wave 3 (page is clean of toggle code).

### Task 4.1 — Add budgetCurrency to persistence

**Files:**
- `frontend/src/hooks/useBudgetPersistence.ts`

**Instructions:**
1. Add `budgetCurrency: Currency` to the `BudgetPlanningData` interface (import `Currency` from types).
2. Set default to `''` (empty string means "auto-detect from fixed pocket").
3. Add `budgetCurrency` / `setBudgetCurrency` state (same pattern as `defaultAccountId`).
4. Include `budgetCurrency` in the persist effect and the return interface `UseBudgetPersistenceResult`.

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `feat(budget): persist budget currency selection in localStorage`

---

### Task 4.2 — Add BudgetCurrencySelector component

**Files:**
- `frontend/src/components/budget/BudgetCurrencySelector.tsx` (NEW)

**Instructions:**
Create a small dropdown component:
```tsx
import type { Currency } from '../../types';

const CURRENCIES: Currency[] = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

interface BudgetCurrencySelectorProps {
  value: Currency | '';
  onChange: (currency: Currency) => void;
  inferredCurrency: Currency;
}

const BudgetCurrencySelector = ({ value, onChange, inferredCurrency }: BudgetCurrencySelectorProps) => {
  const effective = value || inferredCurrency;
  return (
    <select
      value={effective}
      onChange={(e) => onChange(e.target.value as Currency)}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      aria-label="Budget currency"
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
};

export default BudgetCurrencySelector;
```

**Verify:**
```bash
cd frontend && npx tsc --noEmit
```

**Commit:** `feat(budget): add BudgetCurrencySelector component`

---

### Task 4.3 — Wire currency selector into UnifiedBudgetPage

**Files:**
- `frontend/src/pages/UnifiedBudgetPage.tsx`
- `frontend/src/components/budget/index.ts` (add export if needed)

**Instructions:**
1. Destructure `budgetCurrency: persistedBudgetCurrency, setBudgetCurrency` from `useBudgetPersistence()`.
2. Compute effective budget currency: `const budgetCurrency = (persistedBudgetCurrency || fixedPockets[0]?.currency || primaryCurrency) as Currency;`
3. Import `BudgetCurrencySelector` and render it in the left panel header (next to `ObligationsHeader`), passing `value={persistedBudgetCurrency}`, `onChange={setBudgetCurrency}`, `inferredCurrency={(fixedPockets[0]?.currency || primaryCurrency) as Currency}`.
4. Ensure the existing `budgetCurrency` variable used throughout the page now uses the persisted value.

**Verify:**
```bash
cd frontend && npm run build
```

**Commit:** `feat(budget): wire budget currency selector into unified page`

---

### Task 4.4 — Add per-allocation conversion legend to AllocationSliderRow

**Files:**
- `frontend/src/components/budget/AllocationSliderRow.tsx`
- `frontend/src/components/budget/AllocationStrategy.tsx`

**Instructions:**
1. In `AllocationSliderRowProps`, add optional `convertedAmount?: number` and `primaryCurrency?: string`.
2. In the row render, after the amount display (both the static `<span>` and the editing `<input>`), add a subtle conversion line:
   ```tsx
   {convertedAmount !== undefined && primaryCurrency && (
     <span className="text-xs text-gray-500">
       ≈ {fmt(convertedAmount, primaryCurrency)}
     </span>
   )}
   ```
   Place this below the amount in the flex layout (add a wrapping `<div className="flex flex-col items-end">` around the amount + conversion if needed).
3. In `AllocationStrategy`, add props `convertedAmounts?: Map<string, number>` and `primaryCurrency?: string` to `AllocationStrategyProps`.
4. Pass `convertedAmount={convertedAmounts?.get(entry.id)}` and `primaryCurrency={primaryCurrency}` to each `<AllocationSliderRow>`.

**Verify:**
```bash
cd frontend && npm run build
```

**Commit:** `feat(budget): show per-allocation converted amount legend`

---

## Post-Wave Verification

After all 4 waves complete, run the full test suite:

```bash
cd frontend && npm run test -- --run
cd frontend && npx playwright test
```

Expected: All tests pass. The `enabled` field is fully gone from the frontend. Budget currency is selectable and persisted. Each allocation row shows a subtle converted amount when currencies differ.
