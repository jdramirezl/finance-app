# Budget Page Button Cleanup

## Summary

The Unified Budget page has 3 action buttons that need consolidation into 1. The "Cancel Changes" button and "Bulk Generate" button should be removed. A single "Generate Movements" button should produce movements for both allocation distribution AND scenario-filtered fixed expenses.

---

## Current Button Locations

### 1. "Cancel Changes" button
- **File**: `frontend/src/components/budget/DistributionFooter.tsx` (line 24-27)
- **Rendered in**: Right panel (Distribution) footer
- **Visibility**: Only shown when `hasChanges` is true (i.e., `distributionEntries.length > 0`)
- **Handler**: `onCancel` → in `UnifiedBudgetPage.tsx` line ~213: `() => setDistributionEntries([])`
- **What it does**: Clears all distribution entries (resets the allocation sliders)

### 2. "Bulk Generate" button
- **File**: `frontend/src/components/budget/ObligationsFooter.tsx` (line 33-40)
- **Rendered in**: Left panel (Obligations) footer
- **Handler**: `onBulkGenerate` → `fixedExpenseActions.prepareBatchFromEnabled`
- **What it does**: Creates batch movement rows for ALL `fixedSubPockets` (monthly contributions), opens the BatchMovementForm modal

### 3. "Generate Movements" button
- **File**: `frontend/src/components/budget/DistributionFooter.tsx` (line 28-34)
- **Rendered in**: Right panel (Distribution) footer
- **Handler**: `onGenerate` → `budgetActions.prepareBatchFromDistribution`
- **What it does**: Creates batch movement rows from distribution entries (allocation percentages × remaining amount), opens the BatchMovementForm modal

---

## Handler Logic Details

### `prepareBatchFromDistribution` (useBudgetActions.ts, line ~163)
1. Filters `distributionEntries` to those with `percentage > 0`
2. For each entry, calculates `amount = (remaining * percentage) / 100`
3. Resolves account/pocket from entry's linked pocket or defaults
4. Creates `BatchMovementRow` with type `'IngresoNormal'`, notes `"Budget Distribution: {name}"`
5. Opens batch modal with prepared rows

### `prepareBatchFromEnabled` (useFixedExpenseActions.ts, line ~120)
1. Takes ALL `fixedSubPockets` (no scenario filtering)
2. For each sub-pocket, calculates monthly contribution via `calculateAporteMensual`
3. Creates `BatchMovementRow` with type `'IngresoFijo'`, notes `"Monthly contribution for {name}"`
4. Opens batch modal with prepared rows

### Key difference: `prepareBatchFromEnabled` ignores scenarios entirely — it generates for ALL fixed expenses. The scenario filtering only exists in `useBudgetActions.totalFijosMes` (for calculating the deduction from income).

---

## How to Merge Into One "Generate Movements" Button

The merged function should:
1. Collect distribution rows (same as current `prepareBatchFromDistribution`)
2. Collect fixed expense rows BUT filtered by active scenarios (same logic as `totalFijosMes`):
   - If scenarios exist and some are active → only expenses in those scenarios
   - If scenarios exist but none active → no fixed expense rows
   - If no scenarios exist → all fixed expenses
3. Combine both arrays into one batch
4. Open a single BatchMovementForm modal with all rows

### Scenario-aware filtering logic (from useBudgetActions.ts line ~87):
```typescript
let relevant: SubPocket[] = [];
if (activeScenarioIds.size > 0) {
  const allIds = new Set<string>();
  scenarios.forEach((s) => {
    if (activeScenarioIds.has(s.id)) s.expenseIds.forEach((id) => allIds.add(id));
  });
  relevant = fixedSubPockets.filter((sp) => allIds.has(sp.id));
} else if (scenarios.length > 0) {
  relevant = [];
} else {
  relevant = fixedSubPockets;
}
```

---

## What to Remove

### Components to modify:
| File | Change |
|------|--------|
| `DistributionFooter.tsx` | Remove `onCancel`, `hasChanges` props and the Cancel button. Keep Generate button. |
| `ObligationsFooter.tsx` | Remove `onBulkGenerate`, `bulkDisabled` props and the Bulk Generate button entirely. |
| `UnifiedBudgetPage.tsx` | Remove `onCancel` handler, remove `onBulkGenerate` wiring. Wire single Generate to new merged function. |

### Hooks to modify:
| File | Change |
|------|--------|
| `useBudgetActions.ts` | Add new `prepareUnifiedBatch` that combines distribution rows + scenario-filtered fixed expense rows. Can reuse existing `calculateEntryAmount` and the scenario filtering logic. |
| `useFixedExpenseActions.ts` | `prepareBatchFromEnabled` can stay (used internally) but is no longer called from the page. Optionally remove if unused elsewhere. |

### Tests to update:
| File | Change |
|------|--------|
| `__tests__/DistributionFooter.test.tsx` | Remove Cancel button tests, update props |
| `__tests__/ObligationsFooter.test.tsx` | Remove Bulk Generate tests, update props |

### Modals to consolidate:
Currently the page renders TWO batch modals (one for fixed expenses, one for distribution). After merge, only ONE is needed — the one from `budgetActions.batch`.

---

## Coder Task Breakdown

### Task 1: Add `prepareUnifiedBatch` to `useBudgetActions`
- Add scenario-aware fixed expense row generation (copy filtering logic from `totalFijosMes`)
- Merge with existing distribution row generation
- Return combined rows to the batch modal
- Needs access to: `fixedPockets`, `accounts`, `fixedSubPockets`, `activeScenarioIds`, `scenarios`
- Some of these (`fixedPockets`) aren't currently passed to `useBudgetActions` — add to params

### Task 2: Simplify `DistributionFooter`
- Remove `onCancel` and `hasChanges` props
- Remove the Cancel Changes button
- Keep only the Generate Movements button (rename handler to the unified one)
- Update test file

### Task 3: Simplify `ObligationsFooter`
- Remove `onBulkGenerate` and `bulkDisabled` props
- Remove the Bulk Generate button (keep Add Group + Add Expense)
- Update test file

### Task 4: Update `UnifiedBudgetPage` wiring
- Remove `fixedExpenseActions.batchForm` modal (the second BatchMovementForm)
- Wire the single Generate button to `budgetActions.prepareUnifiedBatch`
- Pass `fixedPockets` to `useBudgetActions` params
- Remove `hasChanges` and `onCancel` from DistributionFooter props
- Remove `onBulkGenerate` and `bulkDisabled` from ObligationsFooter props
- Update `generateDisabled` logic: should be disabled when there are no distribution entries AND no scenario-filtered fixed expenses

### Task 5: Clean up `useFixedExpenseActions`
- Remove `prepareBatchFromEnabled` from the return value (or keep if used elsewhere — grep first)
- Remove `batchForm` controller if no longer needed from the page
- Update the interface types

### Task 6: Update tests
- `DistributionFooter.test.tsx`: Remove cancel-related tests, update default props
- `ObligationsFooter.test.tsx`: Remove bulk-generate tests, update default props
- Add test for `prepareUnifiedBatch` in useBudgetActions (or integration test)
