# Budget Button Cleanup — Coder Tasks

## Summary

Remove "Cancel Changes" and "Bulk Generate" buttons. Keep one "Generate Movements" button in DistributionFooter that produces movements for both allocation distribution AND scenario-filtered fixed expenses.

---

### Task 1: Add `prepareUnifiedBatch` to `useBudgetActions`

**Files**: `frontend/src/hooks/actions/useBudgetActions.ts`

**What**: Add a new `prepareUnifiedBatch` method that combines distribution rows (existing `prepareBatchFromDistribution` logic) with scenario-filtered fixed expense rows. The scenario filtering logic already exists in `totalFijosMes` — reuse it to select which `fixedSubPockets` get rows. For each selected sub-pocket, generate a `BatchMovementRow` with type `'IngresoFijo'` using `calculateAporteMensual` (same as `useFixedExpenseActions.prepareBatchFromEnabled`). Merge both arrays and open the batch modal. Requires adding `fixedPockets: Pocket[]` to `UseBudgetActionsParams` so we can resolve parent account for fixed expense rows. Export `prepareUnifiedBatch` in the result interface alongside (but not replacing) `prepareBatchFromDistribution`.

**Verify**: Unit test — call `prepareUnifiedBatch` with distribution entries + active scenarios and confirm batch rows contain both distribution and fixed expense entries. Also confirm that with no scenarios, all fixed expenses are included; with scenarios active, only matching expenses appear.

**Depends on**: none

---

### Task 2: Simplify footer components (remove buttons + props)

**Files**: `frontend/src/components/budget/DistributionFooter.tsx`, `frontend/src/components/budget/ObligationsFooter.tsx`

**What**: In `DistributionFooter`, remove `onCancel` and `hasChanges` props and the Cancel Changes button — keep only the Generate Movements button with `onGenerate` and `generateDisabled` props. In `ObligationsFooter`, remove `onBulkGenerate` and `bulkDisabled` props and the Bulk Generate button — keep only the Add Group and Add Expense buttons in the grid.

**Verify**: `npm run build` passes. Existing tests in `__tests__/DistributionFooter.test.tsx` and `__tests__/ObligationsFooter.test.tsx` updated to match new props (remove cancel/bulk-generate assertions, update default prop factories).

**Depends on**: none

---

### Task 3: Rewire `UnifiedBudgetPage` to use unified generate

**Files**: `frontend/src/pages/UnifiedBudgetPage.tsx`

**What**: Pass `fixedPockets` to `useBudgetActions` params. Wire `DistributionFooter.onGenerate` to `budgetActions.prepareUnifiedBatch` instead of `prepareBatchFromDistribution`. Remove `onCancel`/`hasChanges` from `DistributionFooter` props. Remove `onBulkGenerate`/`bulkDisabled` from `ObligationsFooter` props. Remove the second `<Modal>` that wraps `fixedExpenseActions.batchForm` (only keep `budgetActions.batch` modal). Update `generateDisabled`: disabled when there are no distribution entries AND no scenario-filtered fixed expenses (use `distributionEntries.length === 0 && budgetActions.totalFijosMes === 0`).

**Verify**: `npm run build` passes. Manual test: open Budget page, select a scenario, click Generate Movements — batch modal shows both distribution rows and fixed expense rows. Without scenarios, all fixed expenses appear. With scenarios but none active, only distribution rows appear.

**Depends on**: Task 1, Task 2

---

### Task 4: Clean up unused exports and update tests

**Files**: `frontend/src/hooks/actions/useFixedExpenseActions.ts`, `frontend/src/hooks/__tests__/useFixedExpenseActions.test.ts`, `frontend/src/pages/__tests__/UnifiedBudgetPage.test.tsx`

**What**: Remove `prepareBatchFromEnabled` from `useFixedExpenseActions` return value (it's only used by `UnifiedBudgetPage` which no longer calls it). Remove `batchForm` from the return value since the page no longer renders its modal. Update `useFixedExpenseActions.test.ts` to remove tests for `prepareBatchFromEnabled`. Update `UnifiedBudgetPage.test.tsx` to remove references to `prepareBatchFromEnabled` and the second batch modal.

**Verify**: `npm run test` passes. `grep -r "prepareBatchFromEnabled" frontend/src` only shows the test file for `useBudgetActions` (the new unified test from Task 1) and the hook definition if kept as internal helper, or nothing at all.

**Depends on**: Task 3
