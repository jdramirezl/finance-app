# Task: Fix Remaining Page-Level Bugs

## Description
Three bugs from the original task-01 were not addressed. Fix them properly.

## Technical Requirements

### 1. MovementsPage: Implement orphaned movements restore
File: `frontend/src/pages/MovementsPage.tsx`
The orphaned movements section has a restore button with an empty try/catch. Implement it:
- Show a modal/form asking which account and pocket to restore to
- Call `movementService.restoreOrphanedMovements(movementIds, accountId, pocketId)`
- Show success/error feedback
- Invalidate queries after restore

If the UI for selecting account/pocket is complex, create a `RestoreOrphanedModal` component in `frontend/src/components/movements/`.

### 2. BudgetPlanningPage: Fix pocket matching by name
File: `frontend/src/pages/BudgetPlanningPage.tsx`
Currently matches pockets by name string comparison which breaks if pockets are renamed.
- Add a `pocketId` field to the `DistributionEntry` type (in the types file or locally)
- When creating entries from pockets, store the `pocketId`
- When matching for movement creation, use `pocketId` first, fall back to name only for legacy entries without an ID
- Update the localStorage persistence to include `pocketId`

### 3. AccountsPage: Remove redundant isSaving state
File: `frontend/src/pages/AccountsPage.tsx`
- Find `const [isSaving, setIsSaving] = useState(false)`
- Replace all usages with the relevant mutation's `.isPending` property
- Remove the state variable and all `setIsSaving` calls

## Acceptance Criteria
1. Orphaned movements can be restored to a user-selected account/pocket
2. Budget entries match pockets by ID, not name
3. No redundant `isSaving` state in AccountsPage
4. Frontend builds clean
