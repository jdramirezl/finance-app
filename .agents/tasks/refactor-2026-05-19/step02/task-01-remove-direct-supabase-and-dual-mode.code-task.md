# Task: Remove Direct Supabase Access and Dual-Mode Feature Flag Pattern

## Description
The frontend has 9 separate feature flags toggling between direct Supabase access and backend API calls. Every service method has two implementations. The "fallback" silently switches to direct DB access on ANY error (including auth failures), masking real bugs. Remove all direct Supabase access from services and use the backend API exclusively.

## Background
Current state:
- 9 feature flags: `VITE_USE_BACKEND_ACCOUNTS`, `VITE_USE_BACKEND_MOVEMENTS`, `VITE_USE_BACKEND_POCKETS`, `VITE_USE_BACKEND_SUBPOCKETS`, `VITE_USE_BACKEND_SETTINGS`, `VITE_USE_BACKEND_CURRENCY`, `VITE_USE_BACKEND_INVESTMENTS`, `VITE_USE_BACKEND_FIXED_EXPENSE_GROUPS`
- Every method has `if (this.useBackend) { try { apiClient } catch { supabaseDirect } } else { supabaseDirect }`
- The fallback catches ALL errors including 401/403/422, silently switching data paths
- `supabaseStorageService.ts` (22KB) is the direct DB access layer — should be deleted entirely
- `movementTemplateService.ts` uses ONLY Supabase (no backend path at all)
- `reminderService.ts` and `netWorthSnapshotService.ts` use ONLY apiClient (correct pattern)
- `currencyService.ts` exposes functions on `window` unconditionally (security issue)

## Technical Requirements
1. Delete `supabaseStorageService.ts` entirely
2. Delete `storageService.ts` (localStorage legacy — dead code)
3. Remove all `useBackend` flags and dual-mode logic from every service
4. Keep only the `apiClient` path in all services
5. For `movementTemplateService.ts`: add backend API routes and switch to apiClient
6. Remove all `window.*` assignments (debug functions exposed in production)
7. Remove all constructor console.logs
8. Remove the silent fallback pattern — if the backend fails, surface the error
9. Remove the `supabase` import from `lib/supabase.ts` usage in services (keep only for auth)

## Dependencies
- `frontend/src/services/accountService.ts`
- `frontend/src/services/movementService.ts`
- `frontend/src/services/pocketService.ts`
- `frontend/src/services/subPocketService.ts`
- `frontend/src/services/investmentService.ts`
- `frontend/src/services/currencyService.ts`
- `frontend/src/services/settingsService.ts`
- `frontend/src/services/fixedExpenseGroupService.ts`
- `frontend/src/services/supabaseStorageService.ts` (DELETE)
- `frontend/src/services/storageService.ts` (DELETE)
- `frontend/src/services/movementTemplateService.ts`
- Backend must have all necessary API endpoints (verify coverage)

## Implementation Approach
1. Audit which backend API endpoints exist vs which are needed
2. For any missing endpoints, create them in the backend first
3. Strip all `*Direct` methods from services
4. Remove the `useBackend` flag and try/catch fallback
5. Delete `supabaseStorageService.ts` and `storageService.ts`
6. Update imports across the codebase
7. Remove all `window.*` debug assignments
8. Verify the app works end-to-end with backend-only data path

## Acceptance Criteria

1. **No Direct DB Access**
   - Given the frontend codebase
   - When searching for `supabase.from(` in services
   - Then zero results are found (only `lib/supabase.ts` for auth remains)

2. **No Feature Flags**
   - Given the frontend codebase
   - When searching for `VITE_USE_BACKEND`
   - Then zero results are found

3. **Errors Surface to User**
   - Given a backend 500 error
   - When a service method is called
   - Then the error propagates to the UI (no silent fallback)

4. **No Window Globals**
   - Given production build
   - When checking `window.investmentService`, `window.currencyService`, etc.
   - Then they are all undefined

5. **All Features Work via Backend**
   - Given the backend API
   - When performing all CRUD operations (accounts, pockets, movements, templates, settings)
   - Then all operations succeed through the API path

## Metadata
- **Complexity**: High
- **Labels**: Security, Architecture, Services, Cleanup
- **Required Skills**: TypeScript, REST APIs, Supabase auth
