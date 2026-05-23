# Task: Replace Sequential Batch Operations With Parallel/Bulk Operations

## Description
All batch operations (delete movements by account, bulk apply pending, reorder, batch create) use sequential `await` in loops, making them O(n) network calls. A user with 500 movements in an account waits 50-150 seconds for deletion. Replace with bulk Supabase queries or `Promise.allSettled()`.

## Background
The following operations are confirmed sequential:
- `deleteMovementsByAccount()` — loops movements, deletes one by one
- `deleteMovementsByPocket()` — same pattern
- `markMovementsAsOrphaned()` — loops movements, updates one by one
- `reorderAccountsDirect()` — saves ALL accounts to update display_order
- `reorderPocketsDirect()` — same pattern
- `toggleSubPocketEnabledDirect()` — saves ALL sub-pockets to toggle one boolean
- `fixedExpenseGroupService.reorderDirect()` — sequential UPDATE per group
- `BatchMovementForm` — creates movements one by one in a loop
- `MovementsPage` bulk actions — applies pending movements one by one

Additionally, `BatchMovementForm.tsx` has a `useEffect` that calls `onRowsChange(rows)` on every state change, creating a render cascade that makes the form extremely slow even before saving.

## Technical Requirements
1. Replace `for...await` loops with single Supabase queries using `.in()`, `.eq()`, or batch operations
2. For `deleteMovementsByAccount`: use `supabase.from('movements').delete().eq('account_id', accountId)`
3. For `markMovementsAsOrphaned`: use `supabase.from('movements').update({...}).in('id', movementIds)`
4. For reorder operations: use a single RPC call or `Promise.all` with individual updates
5. For `BatchMovementForm` saves: use `Promise.allSettled()` and report partial success/failure
6. Fix the `useEffect` render cascade in `BatchMovementForm.tsx` — remove the effect, call `onRowsChange` directly in state setters
7. For bulk pending apply: use `Promise.allSettled()` and show "Applied X/Y, Z failed"

## Dependencies
- `frontend/src/services/movementService.ts`
- `frontend/src/services/accountService.ts`
- `frontend/src/services/pocketService.ts`
- `frontend/src/services/subPocketService.ts`
- `frontend/src/services/fixedExpenseGroupService.ts`
- `frontend/src/components/BatchMovementForm.tsx`
- `frontend/src/pages/MovementsPage.tsx` (bulk actions)

## Implementation Approach
1. Identify all `for...await` patterns in services (grep for `for.*await` and `forEach.*await`)
2. Replace with bulk Supabase operations where possible
3. For operations that must remain individual (e.g., each needs validation), use `Promise.allSettled()`
4. Fix `BatchMovementForm.tsx` useEffect cascade
5. Add proper error reporting for partial failures ("5 of 10 succeeded")
6. Add loading progress indicators for bulk operations

## Acceptance Criteria

1. **Bulk Delete Performance**
   - Given an account with 100 movements
   - When deleting the account
   - Then all movements are deleted in 1-2 database calls (not 100)

2. **Batch Movement Creation**
   - Given 10 movements to create in batch form
   - When submitting
   - Then all 10 are created in parallel (total time ~= 1 network call, not 10x)

3. **Partial Failure Reporting**
   - Given a batch of 10 operations where 3 fail
   - When the batch completes
   - Then the user sees "7 succeeded, 3 failed" with details

4. **BatchMovementForm Responsiveness**
   - Given the batch form with 10 rows
   - When typing in any input field
   - Then there is no perceptible lag (no render cascade)

5. **Reorder Performance**
   - Given 20 accounts being reordered
   - When the reorder is saved
   - Then only the changed display_order values are sent (not all account data)

## Metadata
- **Complexity**: Medium
- **Labels**: Performance, Critical Bug, Services, Components
- **Required Skills**: Supabase queries, Promise.allSettled, React performance
