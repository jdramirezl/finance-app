# Task: Remove All Console.logs, Fix All `any` Types, Remove eslint-disables

## Description
Production code still has console.log statements (some leaking financial data), `any` types defeating TypeScript safety, and eslint-disable comments hiding problems. Remove all of them.

## Technical Requirements

### Remove ALL console.log/error/warn statements
Search entire `frontend/src/` for `console.log`, `console.error`, `console.warn`. Remove them all. Do NOT gate behind DEV — just remove. If something needs logging, it should use a proper error reporting mechanism (which we don't have yet, so just remove).

Exception: `console.error` in a catch block that also shows a toast is acceptable ONLY if it adds context the toast doesn't have. But prefer removing.

### Fix ALL `any` types
Search for `: any`, `as any`, `<any>` in `frontend/src/`. For each:
- `apiClient.ts` `handleError(error: any)` → `handleError(error: unknown)` with proper narrowing
- `apiClient.ts` `post<T>(path: string, data?: any)` → `post<T>(path: string, data?: Record<string, unknown>)`
- `storageService.ts` — if file still exists, delete it (dead code). If deleted, skip.
- `supabaseStorageService.ts` `settingsData: any` → proper type
- Any remaining `err: any` in catch blocks → `err: unknown` with `instanceof Error` check

### Remove ALL eslint-disable comments
Search for `eslint-disable`. Fix the underlying issue instead of suppressing it. Most are for `any` types which we're fixing above.

### Replace all `confirm()` and `alert()` with proper UI
Search for `window.confirm`, `confirm(`, `alert(`. Replace with the existing `useConfirm` hook or toast system. The app already has `ConfirmDialog` and `useConfirm` — use them.

## Acceptance Criteria
1. `grep -r "console\." frontend/src/ | grep -v node_modules | grep -v ".test."` returns zero results
2. `grep -r ": any\|as any" frontend/src/ | grep -v node_modules | grep -v ".test."` returns zero results
3. `grep -r "eslint-disable" frontend/src/ | grep -v node_modules` returns zero results
4. No `alert()` or `confirm()` calls remain
5. Frontend builds clean with zero TypeScript errors
