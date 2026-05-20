# Devil's Advocate Review — Finance App Refactoring

**Date**: 2026-05-20  
**Verdict**: Build passes, but there are **2 runtime-breaking route mismatches** and significant prop drilling that undermines the decomposition goals.

---

## 1. TypeScript & Build Status

| Check | Result |
|-------|--------|
| `tsc --noEmit` | **PASS** — 0 errors |
| `npm run build` | **PASS** — built in 4.55s |
| Broken imports | None detected |

The refactoring is type-safe. No dangling imports to deleted files.

---

## 2. CRITICAL: Frontend/Backend Route Mismatches (Runtime Bugs)

These will 404 in production. TypeScript can't catch them because the URLs are string literals.

### Bug 1: Orphaned Movement Restore

| Layer | Route |
|-------|-------|
| **Frontend** (`movementService.ts:146`) | `POST /api/movements/restore` |
| **Backend** (`routes.ts:92`) | `POST /api/movements/restore-orphaned` |

**Impact**: Clicking "Restore" on orphaned movements will silently fail with a 404. The entire orphan restore feature is broken.

### Bug 2: Sub-Pocket Move to Group

| Layer | Route |
|-------|-------|
| **Frontend** (`subPocketService.ts:108`) | `POST /api/sub-pockets/${id}/move` |
| **Backend** (`subPocketRoutes.ts:88`) | `POST /api/sub-pockets/:id/move-to-group` |

**Impact**: Moving a sub-pocket between fixed expense groups will 404. Feature is broken.

---

## 3. Prop Drilling — Decomposition Partially Defeated

The refactoring decomposed pages into components, but several components receive an absurd number of props, indicating the decomposition was mechanical (split the JSX) rather than architectural (split the concerns).

| Component | Props | Verdict |
|-----------|-------|---------|
| `MovementForm.tsx` | **29** | Extreme. Every form field is a separate prop + setter pair. Should use a form state object or React Hook Form. |
| `MovementList.tsx` | **25** (14 list + 11 row) | High. Row props are reasonable individually but the list passes too many callbacks. |
| `MovementFilters.tsx` | **23** (via nested objects) | Mitigated by grouping into `filters` and `setFilters` objects — acceptable pattern. |
| `BudgetEntryRow.tsx` | **19** | High. Mix of data, callbacks, and UI state. |
| `FixedExpensesList.tsx` | **17** | Borderline. Many callbacks for group/expense operations. |
| `MovementTemplateForm.tsx` | **10** | Acceptable. |
| `AccountDetailPanel.tsx` | **10** | Acceptable. |

**Worst offender**: `MovementForm` with 29 props is a code smell. The refactoring moved JSX out of the page but kept all state management in the parent, creating a "prop waterfall" that's harder to maintain than the original monolith. The form should own its own state and expose only `onSubmit(data)` and `onCancel()`.

---

## 4. Dead Exports

**None found.** All exports from component barrel files (`components/*/index.ts`) have at least one importer. All hooks are imported somewhere. Clean.

---

## 5. Missing Functionality Check

### Orphaned Movement Restore
- `RestoreOrphanedModal` exists at `components/movements/RestoreOrphanedModal.tsx` ✓
- Wired into `MovementsPage.tsx` at line 279 ✓
- `useOrphanedRestore` hook exists ✓
- **BUT**: The API call will 404 due to route mismatch (see Bug 1 above) ✗

### Budget PocketId Matching
- `DistributionEntry` type has `pocketId?: string` and `accountId?: string` ✓
- `BudgetDistribution` component implements pocket selection with `handleEditPocketChange` ✓
- Pocket linking auto-fills entry name ✓
- Persisted via `useBudgetPersistence` to localStorage ✓
- **Verdict**: Fully implemented ✓

### Cascade Delete
- Frontend calls `POST /api/accounts/${id}/cascade` with `{ deleteMovements }` ✓
- Backend has `DeleteAccountCascadeUseCase` with proper orchestration ✓
- **BUT**: Does NOT use an RPC/database function. It performs sequential operations:
  1. Fetch pockets → loop delete sub-pockets → loop delete pockets
  2. Either `deleteByAccountId` (single bulk query) or `markAsOrphanedByAccountId` (N+2 queries — one per movement!)
- **Risk**: `markAsOrphanedByAccountId` iterates movements one-by-one with individual UPDATE calls. For an account with 500 movements, that's 500 sequential HTTP calls to Supabase. No transaction wrapping means a failure mid-way leaves data in an inconsistent state (some movements orphaned, some not).

---

## 6. Backend Gaps

### Routes fully covered:
- Accounts: CRUD, cascade, reorder ✓
- Pockets: CRUD, reorder, migrate ✓
- Sub-pockets: CRUD, toggle, move-to-group, reorder ✓
- Fixed expense groups: CRUD, reorder, toggle ✓
- Movements: CRUD, pending, orphaned, restore-orphaned, mark-orphaned, transfer ✓
- Movement templates: CRUD ✓
- Settings: GET, PUT ✓
- Currency: rates, convert ✓
- Investments: prices, update ✓
- Reminders: CRUD, pay, exceptions, split ✓
- Net worth snapshots: CRUD, latest ✓

### Mismatches (already reported above):
1. `/api/movements/restore` vs `/api/movements/restore-orphaned`
2. `/api/sub-pockets/:id/move` vs `/api/sub-pockets/:id/move-to-group`

---

## 7. Circular Dependencies

**None.** All service files import only from `./apiClient` or `./cdCalculationService` (which is a pure calculation utility). The circular dependency between `accountService` and other services has been successfully eliminated.

---

## 8. Architectural Concerns

### Cascade Delete Has No Transaction Safety
The `DeleteAccountCascadeUseCase` performs 4+ sequential database operations (delete sub-pockets, delete pockets, handle movements, delete account) with no transaction wrapping. If the process fails after deleting pockets but before deleting the account, you get orphaned pockets in the database with no parent account.

Supabase doesn't natively support multi-table transactions via the JS client, but an RPC function (`SELECT cascade_delete_account(...)`) would be atomic.

### markAsOrphanedByAccountId is O(n) Network Calls
```typescript
// Current implementation — one HTTP round-trip per movement
for (const movement of movements) {
  await this.ensureClient()
    .from('movements')
    .update({ is_orphaned: true, ... })
    .eq('id', movement.id)
    .eq('user_id', userId);
}
```
This should be a single bulk update with `.in('id', movementIds)` or an RPC function.

### SummaryPage Bundle Size
`SummaryPage-DqTHn1Ze.js` is **407 KB** (120 KB gzipped). This is enormous for a single route chunk. It likely bundles a charting library (Recharts) that should be further code-split or lazy-loaded.

---

## Summary of Required Fixes

| Priority | Issue | Fix |
|----------|-------|-----|
| **P0** | Frontend calls `/api/movements/restore`, backend exposes `/restore-orphaned` | Rename one to match the other |
| **P0** | Frontend calls `/api/sub-pockets/:id/move`, backend exposes `/:id/move-to-group` | Rename one to match the other |
| **P1** | `markAsOrphanedByAccountId` does N sequential updates | Use bulk `.in()` update or RPC |
| **P1** | Cascade delete has no transaction safety | Wrap in Supabase RPC function |
| **P2** | `MovementForm` has 29 props | Refactor to own its form state internally |
| **P2** | SummaryPage chunk is 407 KB | Lazy-load charting library |

---

## What the Refactoring Got Right

- Zero TypeScript errors — type safety maintained throughout
- No circular dependencies — clean service graph
- No dead exports — barrel files are lean
- All hooks are used — no orphaned code
- Budget pocketId matching fully implemented
- Supabase removed from frontend services (all go through apiClient)
- Build passes cleanly with reasonable chunk sizes (except SummaryPage)
