# State Consistency — Task Breakdown

**Generated**: 2026-05-21
**Source**: `.agents/analysis/state-consistency-audit.md`
**Scope**: Cross-tab synchronization, stale data prevention, race condition fixes

---

## Execution Windows

| Window | Tasks | Can Parallel? | Notes |
|--------|-------|---------------|-------|
| W1 — DB Constraint | 1 | Independent | Snapshot dedup at DB level |
| W2 — QueryClient & Refetch | 2 | Independent | Trivial but UX-impactful |
| W3 — BroadcastChannel | 3 | After W2 | Builds on queryClient changes |
| W4 — Budget Cross-Tab | 4 | Independent | localStorage-only, no backend |
| W5 — Logout Hardening | 5 | Independent | Auth layer only |
| W6 — Singleton Cache Sync | 6 | After W3 | Uses BroadcastChannel from Task 3 |

**Dependency graph**:
```
W1 (independent)
W2 (independent)
W3 → depends on W2
W4 (independent)
W5 (independent)
W6 → depends on W3
```

---

## Task Details

### Task 1: Snapshot deduplication via DB unique constraint + frontend guard

- **Files touched**:
  1. `backend/migrations/028_snapshot_unique_per_day.sql` (new)
  2. `frontend/src/hooks/useAutoNetWorthSnapshot.ts`
  3. `frontend/src/services/netWorthSnapshotService.ts`

- **What to do**:

  **Database migration**: Add a unique constraint on `net_worth_snapshots(user_id, snapshot_date)` so duplicate snapshots for the same user+day are rejected at the DB level. Use a unique index (not constraint) to allow `ON CONFLICT` upsert semantics:

  ```sql
  -- Deduplicate: only one snapshot per user per calendar day
  CREATE UNIQUE INDEX IF NOT EXISTS idx_net_worth_snapshots_user_date
  ON net_worth_snapshots (user_id, snapshot_date);
  ```

  **Frontend — netWorthSnapshotService.create()**: Change the insert to an upsert using Supabase's `.upsert()` with `onConflict: 'user_id,snapshot_date'`. If a snapshot already exists for today, update it rather than failing:

  ```typescript
  // In netWorthSnapshotService.create():
  const { data, error } = await supabase
    .from('net_worth_snapshots')
    .upsert(
      { user_id, snapshot_date, total_net_worth, base_currency, breakdown },
      { onConflict: 'user_id,snapshot_date' }
    )
    .select()
    .single();
  ```

  **Frontend — useAutoNetWorthSnapshot.ts**: Suppress the error toast when the mutation "fails" due to a conflict (though with upsert this shouldn't happen). Add a comment explaining the multi-tab race is handled at DB level.

  **NOTE**: The `database-structure-breakdown.md` does NOT cover this constraint. This task owns it.

- **Acceptance criteria**:
  - Unique index `idx_net_worth_snapshots_user_date` exists on `(user_id, snapshot_date)`
  - Opening the app in 3 tabs simultaneously produces exactly 1 snapshot row for today
  - Manual snapshot creation still works (upserts over auto-snapshot if same day)
  - No duplicate snapshot rows can exist for the same user+date

- **Dependencies**: None

---

### Task 2: Enable refetchOnWindowFocus with smart staleTime tuning

- **Files touched**:
  1. `frontend/src/lib/queryClient.ts`
  2. `frontend/src/hooks/queries/useAccountQueries.ts` (or wherever account queries are defined)
  3. `frontend/src/hooks/queries/useMovementQueries.ts`
  4. `frontend/src/hooks/queries/useNetWorthSnapshotQueries.ts`

- **What to do**:

  **queryClient.ts**: Enable `refetchOnWindowFocus` globally and reduce `staleTime` for financial data:

  ```typescript
  export const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,        // 2 minutes (was 5)
        gcTime: 1000 * 60 * 30,           // 30 minutes (unchanged)
        refetchOnWindowFocus: true,        // ← ENABLED
        retry: 1,
      },
    },
  });
  ```

  **Per-query overrides for expensive/stable data**: Settings and net worth snapshots change rarely. Override their staleTime to avoid unnecessary refetches:

  ```typescript
  // In useSettingsQuery:
  staleTime: 1000 * 60 * 10, // 10 minutes — settings rarely change

  // In useNetWorthSnapshotsQuery:
  staleTime: 1000 * 60 * 10, // 10 minutes — snapshots are daily at most
  ```

  **UX consideration**: With `refetchOnWindowFocus: true`, switching tabs triggers background refetches for stale queries. This means:
  - Brief loading spinners if components show loading state during refetch (they shouldn't — TanStack Query shows stale data while refetching by default)
  - Extra API calls on tab switch (mitigated by 2-minute staleTime — if user switches back within 2 min, no refetch)
  - Verify no component uses `isLoading` where it should use `isFetching` (isLoading = first load only; isFetching = any fetch including background)

  **Do NOT** add `refetchOnWindowFocus: false` overrides to financial queries (accounts, movements, pockets). These are exactly the queries that benefit from cross-tab freshness.

- **Acceptance criteria**:
  - `refetchOnWindowFocus` is `true` in default options
  - `staleTime` is 2 minutes globally
  - Settings and snapshot queries override to 10 minutes
  - Switching to a tab that's been idle >2 minutes triggers background refetch of account/movement data
  - No loading spinners flash during background refetch (verify components use `data` not `isLoading` for conditional rendering)

- **Dependencies**: None

---

### Task 3: BroadcastChannel for cross-tab cache invalidation

- **Files touched**:
  1. `frontend/src/lib/queryClient.ts`
  2. `frontend/src/lib/crossTabSync.ts` (new)
  3. `frontend/src/main.tsx` (or App.tsx — wherever QueryClientProvider is set up)
  4. `frontend/src/hooks/queries/useAccountQueries.ts`
  5. `frontend/src/hooks/queries/useMovementQueries.ts`

- **What to do**:

  **Create `crossTabSync.ts`**: A module that uses `BroadcastChannel` to notify other tabs when a mutation invalidates queries. When Tab A mutates, it broadcasts the invalidated query keys. Tab B receives the message and calls `queryClient.invalidateQueries()` for those keys.

  ```typescript
  // frontend/src/lib/crossTabSync.ts
  import { queryClient } from './queryClient';

  const CHANNEL_NAME = 'finance-app-query-sync';

  interface SyncMessage {
    type: 'invalidate';
    queryKeys: string[][];
  }

  let channel: BroadcastChannel | null = null;

  export function initCrossTabSync(): void {
    if (typeof BroadcastChannel === 'undefined') return; // SSR/old browser guard

    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (event.data.type === 'invalidate') {
        for (const key of event.data.queryKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
    };
  }

  export function broadcastInvalidation(queryKeys: string[][]): void {
    if (!channel) return;
    const message: SyncMessage = { type: 'invalidate', queryKeys };
    channel.postMessage(message);
  }

  export function destroyCrossTabSync(): void {
    channel?.close();
    channel = null;
  }
  ```

  **Wire into app bootstrap** (`main.tsx` or top-level effect):
  ```typescript
  import { initCrossTabSync, destroyCrossTabSync } from './lib/crossTabSync';
  initCrossTabSync();
  // On unmount (if applicable): destroyCrossTabSync();
  ```

  **Wire into mutations**: In each mutation's `onSuccess`, call `broadcastInvalidation` with the same keys that `invalidateQueries` uses:

  ```typescript
  // Example in account mutations:
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    broadcastInvalidation([['accounts'], ['pockets']]);
  },
  ```

  Apply this pattern to all existing mutations that call `invalidateQueries`. The broadcast call goes right after the local invalidation.

- **Acceptance criteria**:
  - Creating an account in Tab A immediately shows it in Tab B (within ~100ms, no page reload)
  - Creating a movement in Tab A updates Tab B's movement list and account balances
  - Deleting data in Tab A removes it from Tab B
  - If BroadcastChannel is unavailable (e.g., Firefox private mode), the app still works (graceful degradation — falls back to refetchOnWindowFocus from Task 2)
  - No infinite invalidation loops (a tab receiving a broadcast invalidation does NOT re-broadcast)

- **Dependencies**: Task 2 (queryClient changes should be in place first)

---

### Task 4: Budget planning cross-tab sync via storage event

- **Files touched**:
  1. `frontend/src/hooks/useBudgetPersistence.ts`

- **What to do**:

  Add a `storage` event listener so that when another tab writes to `finance_app_budget_planning`, the current tab reloads the data. This prevents silent clobber — instead, the tab that didn't write gets the latest state.

  ```typescript
  // Inside useBudgetPersistence, add a useEffect:
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== BUDGET_PLANNING_KEY) return;
      if (event.newValue === null) return; // key was deleted

      try {
        const updated: BudgetPlanningData = { ...DEFAULT_DATA, ...JSON.parse(event.newValue) };
        setInitialAmount(updated.initialAmount || 0);
        setDistributionEntries(updated.distributionEntries || []);
        setScenarios(updated.scenarios || []);
      } catch {
        // Corrupt data from other tab — ignore
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  ```

  **Important**: The `storage` event only fires in OTHER tabs (not the tab that wrote). This means:
  - Tab A edits → debounce writes to localStorage → Tab B receives `storage` event → Tab B updates state
  - Tab A does NOT receive its own event (no infinite loop risk)

  **Edge case**: If both tabs are actively editing simultaneously, they'll ping-pong. This is acceptable — the last writer wins, and both tabs stay in sync. The debounce (500ms) limits the frequency.

  **Also**: Skip the debounced persist when the state change came from a storage event (to avoid writing back what was just received). Use a ref flag:

  ```typescript
  const isExternalUpdate = useRef(false);

  // In the storage handler:
  isExternalUpdate.current = true;
  setInitialAmount(updated.initialAmount || 0);
  // ... other setters
  // Reset after React processes the state updates:
  queueMicrotask(() => { isExternalUpdate.current = false; });

  // In the persist effect:
  if (isExternalUpdate.current) return;
  ```

- **Acceptance criteria**:
  - Editing budget in Tab A updates Tab B within 600ms (500ms debounce + event propagation)
  - Tab B does NOT write back the received data (no echo loop)
  - Closing one tab doesn't affect the other
  - If localStorage is cleared externally, tabs don't crash

- **Dependencies**: None

---

### Task 5: Logout race window hardening

- **Files touched**:
  1. `frontend/src/contexts/AuthContext.tsx`
  2. `frontend/src/lib/queryClient.ts` (import only)
  3. `frontend/src/services/apiClient.ts`

- **What to do**:

  **Problem**: Between Tab A calling `signOut()` and Tab B's `onAuthStateChange` firing, Tab B can still attempt API calls that will fail with 401. The UI shows individual query errors instead of a clean redirect.

  **Fix 1 — Clear query cache on logout detection**: In `AuthContext`, when `onAuthStateChange` fires with a `SIGNED_OUT` event, immediately clear the query cache so no stale data is displayed and no background refetches fire:

  ```typescript
  // In AuthContext.tsx:
  import { queryClient } from '../lib/queryClient';

  supabase.auth.onAuthStateChange((event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);

    if (event === 'SIGNED_OUT') {
      // Immediately stop all queries and clear cached data
      queryClient.cancelQueries();
      queryClient.clear();
    }
  });
  ```

  **Fix 2 — apiClient graceful 401 handling**: In `apiClient`, when a request returns 401, trigger a sign-out rather than throwing an error that surfaces as a toast:

  ```typescript
  // In apiClient.ts, in the response handling:
  if (response.status === 401) {
    // Session expired or was revoked in another tab — force local logout
    await supabase.auth.signOut();
    // Don't throw — the auth state change will redirect to login
    return null as never; // or throw a specific AuthExpiredError that the UI suppresses
  }
  ```

  **Fix 3 — signOut clears cache proactively**: In `AuthContext.signOut()`, clear the cache BEFORE calling Supabase signOut:

  ```typescript
  const signOut = async () => {
    queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  };
  ```

- **Acceptance criteria**:
  - Logging out in Tab A causes Tab B to redirect to `/login` within 2 seconds
  - Tab B does NOT show error toasts during the logout propagation
  - No stale financial data is visible after logout in any tab
  - After logout, navigating back doesn't show cached data (cache is cleared)
  - A 401 response from any API call triggers automatic logout + redirect (not an error toast)

- **Dependencies**: None

---

### Task 6: Singleton cache invalidation via BroadcastChannel

- **Files touched**:
  1. `frontend/src/lib/crossTabSync.ts` (extend from Task 3)
  2. `frontend/src/services/investmentService.ts`
  3. `frontend/src/services/currencyService.ts`

- **What to do**:

  **Extend the BroadcastChannel** (from Task 3) to also handle service cache invalidation messages. When one tab fetches a fresh price or rate, broadcast it so other tabs update their in-memory caches.

  **Add message type to crossTabSync.ts**:
  ```typescript
  interface CacheUpdateMessage {
    type: 'cache-update';
    service: 'investment' | 'currency';
    key: string;
    value: { rate?: number; price?: number; timestamp: number };
  }

  type SyncMessage =
    | { type: 'invalidate'; queryKeys: string[][] }
    | CacheUpdateMessage;
  ```

  **investmentService.ts**: After `savePriceCache()`, broadcast the updated entry:
  ```typescript
  // In getCurrentPrice(), after savePriceCache():
  broadcastCacheUpdate('investment', symbol, { price: response.price, timestamp: cachedAt });
  ```

  Add a listener registration method that `crossTabSync` calls when it receives a cache-update for 'investment':
  ```typescript
  // Add to InvestmentService class:
  updatePriceFromBroadcast(symbol: string, price: number, timestamp: number): void {
    this.priceCache.set(symbol, { symbol, price, timestamp });
    this.savePriceCache();
  }
  ```

  **currencyService.ts**: Same pattern — after populating `this.cache` in `getExchangeRateAsync()` or `convertBatch()`, broadcast the rate:
  ```typescript
  // Add to CurrencyService class:
  updateRateFromBroadcast(key: string, rate: number, timestamp: number): void {
    this.cache.set(key, { rate, timestamp });
  }
  ```

  **crossTabSync.ts**: Route incoming `cache-update` messages to the appropriate service:
  ```typescript
  if (event.data.type === 'cache-update') {
    const { service, key, value } = event.data;
    if (service === 'investment' && value.price != null) {
      investmentService.updatePriceFromBroadcast(key, value.price, value.timestamp);
    } else if (service === 'currency' && value.rate != null) {
      currencyService.updateRateFromBroadcast(key, value.rate, value.timestamp);
    }
  }
  ```

  **Import note**: `crossTabSync.ts` will import `investmentService` and `currencyService`. Ensure no circular dependency (these services don't import from `lib/`).

- **Acceptance criteria**:
  - Refreshing a stock price in Tab A updates the price display in Tab B without Tab B making its own API call
  - Currency rates fetched in Tab A are available synchronously in Tab B's `getExchangeRate()` within seconds
  - The in-memory caches stay in sync across tabs (verify by checking `getPriceTimestamp` returns the same value in both tabs)
  - No circular import issues
  - Graceful degradation if BroadcastChannel unavailable (each tab just uses its own cache independently, as before)

- **Dependencies**: Task 3 (BroadcastChannel infrastructure must exist)

---

## Cross-Task Coordination Notes

1. **Task 1 (DB constraint)** is independent and can be executed by a database-focused agent. It creates migration file `028`. Coordinate with `database-structure-breakdown.md` which uses migrations 014-027 — no conflict.

2. **Tasks 2 and 3** modify `queryClient.ts`. Task 2 changes the config; Task 3 adds the broadcast wiring. Execute Task 2 first, then Task 3 builds on it.

3. **Task 5** imports `queryClient` into `AuthContext.tsx`. This is a one-line import — no conflict with Tasks 2/3 as long as the export name doesn't change.

4. **Task 6** extends `crossTabSync.ts` created in Task 3. Must run after Task 3 is complete.

5. **All tasks** are backward-compatible. None require simultaneous deployment — they can be merged independently.

---

## Verification Plan

After all tasks are complete, verify with this manual test:

1. Open the app in 3 tabs
2. Create an account in Tab 1 → appears in Tabs 2 and 3 within 1 second
3. Add a movement in Tab 2 → balance updates in Tabs 1 and 3
4. Edit budget in Tab 1 → Tab 2 shows updated budget within 1 second
5. Log out in Tab 3 → Tabs 1 and 2 redirect to login, no error toasts
6. Open 3 tabs simultaneously on a day with no snapshot → exactly 1 snapshot row created
7. Refresh stock price in Tab 1 → Tab 2 shows updated price without its own API call
