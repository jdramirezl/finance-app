# Budget Account Selection Fix — Task Breakdown

## Summary

**Bug**: When clicking "Create Movements" on the Budget Planning page, the generated movements get assigned to whatever account/pocket each distribution entry happens to be linked to. If an entry has no linked pocket, the movement gets an empty `accountId`/`pocketId`, which either fails silently or creates orphaned movements.

**Root Cause**: There is no global "target account" selector. The system relies entirely on per-entry pocket linking (the optional dropdown in `BudgetEntryRow`). Users who don't manually link every entry to a pocket get movements with blank account references.

## Current Flow Analysis

### How It Works Today

1. User enters income amount in `BudgetIncomeSection`
2. User adds distribution entries (name + percentage) in `BudgetDistribution`
3. Each entry **optionally** links to a pocket via a dropdown in `BudgetEntryRow` (edit mode)
4. User clicks "Create Movements" button (top-right of page)
5. `prepareBatchFromDistribution()` in `useBudgetActions.ts` runs:
   - For each entry with percentage > 0, it tries to find a matching pocket:
     - First by `entry.pocketId` (if user explicitly linked one)
     - Fallback: case-insensitive name match against all pockets
   - Sets `accountId` from the matched pocket's `accountId`, or from `entry.accountId`, or empty string
6. Opens `BatchMovementForm` modal with pre-filled rows
7. User can still edit each row's account/pocket in the batch form before saving

### The Problem

- The per-entry pocket linking is buried in edit mode and easy to miss
- The name-based fallback matching is unreliable and feels "random" to the user
- There's no way to say "put all budget movements into Account X" without linking every single entry individually
- Entries without a linked pocket produce movements with empty `accountId: ''`

### Relevant Code Locations

| File | Role |
|------|------|
| `frontend/src/hooks/actions/useBudgetActions.ts` | `prepareBatchFromDistribution()` — builds the batch rows |
| `frontend/src/pages/BudgetPlanningPage.tsx` | Page layout, "Create Movements" button |
| `frontend/src/components/budget/BudgetDistribution.tsx` | Distribution table with per-entry pocket linking |
| `frontend/src/components/budget/BudgetEntryRow.tsx` | Individual entry row with pocket dropdown (edit mode only) |
| `frontend/src/components/movements/BatchMovementForm.tsx` | Modal that shows generated movements before saving |

## Proposed Fix

Add a **default target account + pocket selector** that appears near the "Create Movements" button. This serves as the fallback for any entry that doesn't have an explicit pocket link. The per-entry linking remains as an override.

**UX flow after fix:**
1. User sets up distribution entries as before
2. Before clicking "Create Movements", user selects a default account + pocket from a dropdown
3. Entries with explicit pocket links use their linked pocket (existing behavior)
4. Entries WITHOUT a pocket link use the default account + pocket
5. Batch form opens with all rows properly assigned

This is better than per-entry-only selection because:
- Most users distribute into a single account anyway
- The default selector is visible without entering edit mode on each entry
- Per-entry overrides still work for users who split across accounts

---

## Coder Tasks

### Task 1: Add Default Account/Pocket Selector + Wire Into Generation Logic

**Scope**: Single task — the UI addition and logic change are tightly coupled and small enough for one agent.

**Files to modify:**
- `frontend/src/pages/BudgetPlanningPage.tsx` — add state for default account/pocket, render selector near the "Create Movements" button
- `frontend/src/hooks/actions/useBudgetActions.ts` — accept `defaultAccountId` and `defaultPocketId` params; use them as fallback in `prepareBatchFromDistribution()` when an entry has no linked pocket
- `frontend/src/hooks/useBudgetPersistence.ts` — persist the default account/pocket selection in localStorage alongside other budget state

**Implementation details:**

1. **Add to `BudgetPlanningData` interface** in `useBudgetPersistence.ts`:
   - `defaultAccountId?: string`
   - `defaultPocketId?: string`
   - Expose `setDefaultAccountId` and `setDefaultPocketId` setters

2. **Add selector UI** in `BudgetPlanningPage.tsx`:
   - Place an account dropdown + pocket dropdown (filtered by selected account) in the header area, next to the "Create Movements" button
   - Use the existing `accounts` and `pockets` data already fetched on the page
   - Style consistently with the rest of the page (use existing `select` patterns from `BudgetEntryRow`)

3. **Update `UseBudgetActionsParams`** to accept `defaultAccountId` and `defaultPocketId`

4. **Update `prepareBatchFromDistribution()`** logic:
   ```
   // Current: accountId = matchedPocket?.accountId ?? entry.accountId ?? ''
   // Fixed:  accountId = matchedPocket?.accountId ?? entry.accountId ?? defaultAccountId ?? ''
   // Same pattern for pocketId
   ```

5. **Remove the unreliable name-based fallback** (the `pockets.find(p => p.name.trim().toLowerCase() === entry.name.trim().toLowerCase())` line) — it's the source of the "random" behavior. If a user wants to link to a specific pocket, they should do it explicitly via the per-entry dropdown or rely on the default.

**Acceptance criteria:**
- Default account/pocket selector visible on Budget Planning page
- Selection persists across page reloads (localStorage)
- Entries with explicit pocket links still use their linked pocket
- Entries without links use the default account/pocket
- If no default is set and no entry link exists, the batch row shows empty (user must pick in BatchMovementForm)
- Name-based fallback matching removed
