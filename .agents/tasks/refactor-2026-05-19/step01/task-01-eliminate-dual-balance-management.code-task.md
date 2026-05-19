# Task: Eliminate Dual Balance Management System

## Description
The app has two competing balance management systems: database triggers that recalculate balances from all movements, AND frontend code that manually does incremental `+amount`/`-amount` updates. These race against each other and guarantee data corruption. Remove ALL manual balance updates from the frontend and trust the database triggers exclusively.

## Background
The database has `calculate_pocket_balance` and `calculate_account_balance` triggers (migrations 001, 002) that fire on every movement INSERT/UPDATE/DELETE and recalculate balances from scratch. Meanwhile, `movementService.ts` calls `updatePocketBalance()` and `updateSubPocketBalance()` which do incremental updates. When both run, the last write wins — creating incorrect balances.

Additionally, `supabaseStorageService.ts` methods like `saveAccounts()` and `savePockets()` include the `balance` field in upserts, overwriting trigger-calculated values with stale frontend-cached values.

## Technical Requirements
1. Remove `updatePocketBalance()` and `updateSubPocketBalance()` methods from `movementService.ts`
2. Remove all balance manipulation from `createMovementDirect()`, `updateMovementDirect()`, `deleteMovementDirect()`
3. Remove `recalculateAllPocketBalances()` entirely — the triggers handle this
4. Remove `calculateAccountBalance()` from `accountService.ts` (except for investment accounts which need price data)
5. Exclude `balance` field from all upsert operations in `supabaseStorageService.ts` (`saveAccounts`, `savePockets`, `saveSubPockets`)
6. After any movement mutation, invalidate queries and let the UI refetch trigger-calculated balances
7. Fix the trigger in migration 002 to correctly handle sub-pocket movements (currently counts them toward parent pocket balance too)
8. Verify the `is_pending` filter in the trigger correctly excludes pending movements from balance calculation

## Dependencies
- Database trigger code in `backend/migrations/001_balance_calculation.sql` and `002_fix_pending_balance.sql`
- `frontend/src/services/movementService.ts`
- `frontend/src/services/accountService.ts`
- `frontend/src/services/pocketService.ts`
- `frontend/src/services/subPocketService.ts`
- `frontend/src/services/supabaseStorageService.ts`
- `frontend/src/hooks/queries/useMovementMutations.ts` (invalidation logic)

## Implementation Approach
1. Read and understand the existing trigger logic in migrations 001 and 002
2. Identify all places in the frontend that manually update balances (grep for `balance`, `updatePocketBalance`, `updateSubPocketBalance`, `calculateAccountBalance`, `recalculateAllPocketBalances`)
3. Remove all manual balance update code from services
4. Remove `balance` from upsert payloads in `supabaseStorageService.ts`
5. Ensure mutation hooks properly invalidate `['accounts']`, `['pockets']`, `['subPockets']` after movement changes
6. Write a new migration to fix the trigger's sub-pocket handling
7. Test that creating/updating/deleting movements produces correct balances via triggers alone

## Acceptance Criteria

1. **No Manual Balance Updates**
   - Given the frontend codebase
   - When searching for balance manipulation code
   - Then no service method manually sets `balance` on pockets, sub-pockets, or accounts (except investment price-based calculations)

2. **Trigger Handles All Balance Cases**
   - Given a movement is created for a sub-pocket
   - When the trigger fires
   - Then the sub-pocket balance is updated correctly AND the parent pocket balance reflects the sum of its sub-pockets

3. **Upserts Don't Overwrite Balances**
   - Given an account reorder operation
   - When `saveAccounts` is called
   - Then the `balance` field is NOT included in the upsert payload

4. **Pending Movements Excluded**
   - Given a pending movement exists
   - When balance is calculated by the trigger
   - Then the pending movement's amount is NOT included in the balance

5. **Unit Tests**
   - Given the refactored services
   - When running the test suite
   - Then tests verify that no balance manipulation occurs in service methods

## Metadata
- **Complexity**: High
- **Labels**: Critical Bug, Data Integrity, Database, Services
- **Required Skills**: PostgreSQL triggers, Supabase, TypeScript, TanStack Query
