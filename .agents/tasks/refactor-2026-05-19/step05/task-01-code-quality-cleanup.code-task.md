# Task: Code Quality Cleanup — Console Logs, Dead Code, Type Safety

## Description
Remove all production console.logs (some leak financial data), eliminate dead code, fix all `any` types, remove eslint-disable comments, standardize error handling patterns, and clean up inconsistencies across the codebase.

## Background
Issues to address:
- **Console.logs**: `accountService.ts` logs every account's full financial details. `SummaryPage.tsx` logs currency breakdowns. `FixedExpensesPage.tsx` has debug logging in delete handler. Multiple services log on construction.
- **Dead code**: `StorageService` (localStorage legacy), `SummaryPage` `setLoadingInvestments` state (value never read), `error = null` hardcoded variable, empty try/catch in orphan restore, `fixIncompleteCDAccounts` migration-in-read-path.
- **`any` types**: Lazy service caches, `StorageService.get*()` returns, `err: any` in catch blocks, `settingsData: any` in supabaseStorageService.
- **eslint-disable**: 12+ comments all for the same `any` cache issue.
- **Inconsistent patterns**: Some services are classes, some are object literals. Some use `err: any`, others use `err: unknown`. Error messages mix user-facing and developer-facing strings.
- **`fixIncompleteCDAccounts`**: A migration that runs on EVERY `getAllAccounts()` call, assigning arbitrary defaults ($1000 principal, 5% rate) to CD accounts missing fields. Should be a one-time migration script.

## Technical Requirements
1. Remove ALL `console.log`/`console.error` statements from production code (or gate behind `import.meta.env.DEV`)
2. Delete `storageService.ts` and all references
3. Remove `fixIncompleteCDAccounts` from the read path — run it once as a migration, then delete
4. Remove dead state variables (`setLoadingInvestments`, hardcoded `error = null`)
5. Implement or remove the orphan restore button (currently empty try/catch)
6. Replace all `err: any` with `err: unknown` and proper type narrowing
7. Remove all `eslint-disable` comments (fix the underlying issues instead)
8. Standardize service patterns: all services should be classes with the same structure
9. Create a proper error class hierarchy with codes (separate user-facing from developer messages)
10. Remove `fixIncompleteCDAccounts` side-effect-on-read pattern
11. Fix `apiClient.handleError` which checks for Axios patterns (`error.response`) but uses fetch

## Dependencies
- All service files in `frontend/src/services/`
- All page files in `frontend/src/pages/`
- `frontend/src/services/apiClient.ts`
- `frontend/src/services/storageService.ts` (DELETE)

## Implementation Approach
1. Grep for `console.log`, `console.error`, `console.warn` — remove or gate behind DEV
2. Grep for `: any` and `as any` — replace with proper types
3. Grep for `eslint-disable` — fix underlying issues
4. Delete dead files and dead code paths
5. Create `shared/errors/AppError.ts` with error codes
6. Standardize all catch blocks to use `err: unknown` with `instanceof Error` checks
7. Fix `apiClient.handleError` to handle fetch errors (not Axios patterns)
8. Run the CD migration once, then remove from read path

## Acceptance Criteria

1. **Zero Console Logs in Production**
   - Given a production build
   - When running the app
   - Then no console.log/error/warn statements execute (or only behind DEV flag)

2. **Zero `any` Types**
   - Given the frontend codebase
   - When running `grep -r ": any\|as any" src/`
   - Then zero results (excluding node_modules and test mocks)

3. **Zero eslint-disable Comments**
   - Given the frontend codebase
   - When searching for `eslint-disable`
   - Then zero results

4. **No Dead Code**
   - Given the codebase
   - When searching for `storageService` imports
   - Then zero results (file deleted)
   - And no unused state variables exist
   - And no empty try/catch blocks exist

5. **Consistent Error Handling**
   - Given any catch block
   - When an error is caught
   - Then it uses `err: unknown` with proper narrowing and surfaces a user-friendly message

6. **No Side Effects on Read**
   - Given `getAllAccounts()` is called
   - When accounts are returned
   - Then no database writes occur as a side effect

## Metadata
- **Complexity**: Medium
- **Labels**: Code Quality, Cleanup, Type Safety, Security
- **Required Skills**: TypeScript strict mode, error handling patterns, code cleanup
