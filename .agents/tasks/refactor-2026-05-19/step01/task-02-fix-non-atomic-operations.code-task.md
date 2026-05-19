# Task: Fix Non-Atomic Operations (Transfers, Cascade Deletes, Batch Saves)

## Description
Multiple critical operations are non-atomic: transfers can debit without crediting, cascade deletes can leave partial state, and batch saves (budget entries) delete-all-then-insert with no transaction safety. These must be wrapped in database transactions via Supabase RPC functions.

## Background
- **Transfers**: `createTransferDirect()` creates an expense movement, then an income movement. If the second fails, money disappears from the source with no credit to the target.
- **Cascade Delete**: `deleteAccountCascadeDirect()` marks movements as orphaned, deletes sub-pockets one by one, deletes pockets one by one, then deletes the account. Any failure mid-way leaves corrupted state.
- **Budget Entries**: `saveBudgetEntries()` does `DELETE ALL` then `INSERT ALL`. If insert fails after delete, all budget data is lost.
- **Missing await**: `validateSubPocketUniqueness` in `subPocketService.ts` is async but called without `await`, so the uniqueness check never fires.

## Technical Requirements
1. Create a Supabase RPC function `create_transfer(source_account_id, target_account_id, amount, ...)` that wraps both movement inserts in a transaction
2. Create a Supabase RPC function `delete_account_cascade(account_id)` that handles the full cascade in a transaction with proper rollback
3. Create a Supabase RPC function `save_budget_entries(user_id, entries[])` that does atomic delete+insert
4. Fix the missing `await` on `validateSubPocketUniqueness` in `subPocketService.ts`
5. Update frontend services to call these RPC functions instead of doing multi-step operations client-side

## Dependencies
- `frontend/src/services/movementService.ts` (transfer logic)
- `frontend/src/services/accountService.ts` (cascade delete)
- `frontend/src/services/subPocketService.ts` (missing await)
- `frontend/src/services/supabaseStorageService.ts` (budget entries)
- New SQL migration file for RPC functions

## Implementation Approach
1. Write PostgreSQL functions for each atomic operation
2. Create a new migration file (`011_atomic_operations.sql`)
3. Update frontend services to call `supabase.rpc('create_transfer', {...})` etc.
4. Add the `await` keyword to `validateSubPocketUniqueness` call
5. Add error handling that surfaces failures to the user (no silent fallbacks)

## Acceptance Criteria

1. **Atomic Transfers**
   - Given a transfer where the second insert would fail
   - When the RPC function is called
   - Then neither movement is created (full rollback)

2. **Atomic Cascade Delete**
   - Given an account with pockets, sub-pockets, and movements
   - When cascade delete is called and fails mid-way
   - Then no data is deleted (full rollback)

3. **Atomic Budget Save**
   - Given existing budget entries
   - When save fails during insert phase
   - Then original entries are preserved (not deleted)

4. **SubPocket Uniqueness Enforced**
   - Given an existing sub-pocket named "Rent"
   - When creating another sub-pocket named "Rent" in the same pocket
   - Then the operation is rejected with an error message

5. **Unit Tests**
   - Given the RPC functions
   - When running tests with simulated failures
   - Then rollback behavior is verified

## Metadata
- **Complexity**: High
- **Labels**: Critical Bug, Data Integrity, Database, Transactions
- **Required Skills**: PostgreSQL, Supabase RPC, TypeScript
