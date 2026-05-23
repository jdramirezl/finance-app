# Task: Delete Dead Code Files and Remove All No-ops

## Description
Several files and methods are now dead code after the refactor. Delete them entirely and remove all callers.

## Technical Requirements

### Delete files
1. `frontend/src/services/supabaseStorageService.ts` — was the direct DB access layer. Check if anything still imports it. If yes, migrate that caller first, then delete.
2. `frontend/src/services/storageService.ts` — localStorage legacy. Check if anything still imports it (currencyService may still use it for sync getPrimaryCurrency). If yes, replace with a proper async call or inline the logic, then delete.
3. `frontend/src/lib/supabase.ts` — check if anything besides AuthContext still imports it. If only auth uses it, keep it. If services still import it, those services need fixing first.

### Remove no-op methods and their callers
1. `movementService.recalculateAllPocketBalances()` — find all callers (likely SettingsPage "Recalculate Balances" button), remove the button or replace with a proper backend endpoint that re-runs the trigger logic.
2. `accountService.recalculateAccountBalance()` and `accountService.recalculateAllBalances()` — find all callers, remove them.

### Remove the "Recalculate Balances" button from SettingsPage
Since balances are now trigger-managed, this button is meaningless. Either remove it entirely or replace it with a backend endpoint that forces a full recalculation (run the SQL from migration 002's final UPDATE statements).

## Acceptance Criteria
1. `supabaseStorageService.ts` is deleted
2. `storageService.ts` is deleted (or only kept if truly needed for sync reads with justification)
3. No no-op methods exist anywhere
4. No callers of deleted methods remain
5. No orphaned imports
6. Frontend builds clean
