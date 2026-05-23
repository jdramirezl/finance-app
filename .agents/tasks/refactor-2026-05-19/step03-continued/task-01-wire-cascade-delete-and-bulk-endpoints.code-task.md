# Task: Wire Cascade Delete RPC and Add Bulk Backend Endpoints

## Description
The `delete_account_cascade` RPC function exists in SQL (migration 011) but the frontend still does cascade deletes via multiple sequential calls. Additionally, `movementService.ts` still has 4 methods using direct Supabase calls because the backend lacks bulk endpoints. Create the backend endpoints and wire everything up.

## Technical Requirements

### Backend: Add bulk movement endpoints
Add to `/backend/src/modules/movements/presentation/routes.ts`:
1. `DELETE /api/movements/by-account/:accountId` — deletes all movements for an account
2. `DELETE /api/movements/by-pocket/:pocketId` — deletes all movements for a pocket
3. `POST /api/movements/mark-orphaned` — body: `{ entityId, entityType: 'account'|'pocket' }` — marks movements as orphaned with captured names
4. `POST /api/movements/update-account` — body: `{ pocketId, newAccountId }` — bulk updates account_id for a pocket's movements

Each endpoint should use the Supabase service-role client for bulk operations (single query, not loops).

### Frontend: Replace direct Supabase with API calls
In `frontend/src/services/movementService.ts`, replace:
- `deleteMovementsByAccount` → `apiClient.delete('/api/movements/by-account/${accountId}')`
- `deleteMovementsByPocket` → `apiClient.delete('/api/movements/by-pocket/${pocketId}')`
- `markMovementsAsOrphaned` → `apiClient.post('/api/movements/mark-orphaned', {...})`
- `updateMovementsAccountForPocket` → `apiClient.post('/api/movements/update-account', {...})`

Then remove the `supabase` import from movementService entirely.

### Frontend: Wire cascade delete to backend
In `frontend/src/services/accountService.ts`, the `deleteAccountCascade` method already calls `apiClient.post('/api/accounts/${id}/cascade', { deleteMovements })`. Verify the backend endpoint exists and works. If it doesn't use the RPC function, update it to do so.

## Acceptance Criteria
1. `movementService.ts` has zero `supabase` imports — all calls go through apiClient
2. All 4 bulk operations work via backend API
3. Cascade delete works end-to-end via the backend
4. Backend builds: `cd backend && npx tsc --noEmit`
5. Frontend builds: `cd frontend && npm run build`
