# State Consistency Across Tabs/Sessions Audit

## Summary

The finance app has **no cross-tab synchronization** mechanism. Each tab operates as an isolated island with its own TanStack Query cache, service singleton instances, and localStorage reads. Mutations in one tab are invisible to another until a full page reload. The risk of stale data display is high; the risk of duplicate data creation (auto-snapshot) is moderate.

---

## 1. Do mutations in one tab reflect in the other?

**No.** TanStack Query caches are per-`QueryClient` instance, and each tab creates its own `QueryClient` in `main.tsx`. There is no shared cache layer (no `broadcastQueryClient`, no `persistQueryClient`, no `BroadcastChannel`).

Additionally, `refetchOnWindowFocus` is explicitly **disabled**:

```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 minutes
      gcTime: 1000 * 60 * 30,          // 30 minutes
      refetchOnWindowFocus: false,      // ← DISABLED
      retry: 1,
    },
  },
});
```

**Impact**: If a user creates an account in Tab A, Tab B will show stale data for up to 5 minutes (staleTime) or until the user navigates away and back (triggering a remount). With `refetchOnWindowFocus: false`, even switching to Tab B won't trigger a refresh.

---

## 2. Stale-state protection

**None.** There is no optimistic locking, no version/ETag checking, and no conflict detection. The pattern is simple last-write-wins via Supabase upserts.

Scenario: Tab A shows account balance $100. Tab B adds a $50 movement. Tab A still shows $100 until its cache expires or the component remounts. If Tab A then performs a mutation based on the stale $100 figure, there's no guard against the inconsistency.

---

## 3. localStorage/sessionStorage conflicts between tabs

The following localStorage keys are used:

| Key | Purpose | Conflict Risk |
|-----|---------|---------------|
| `finance-app-theme` | Theme preference (light/dark) | **Low** — cosmetic only, last-write-wins is acceptable |
| `finance_app_budget_planning` | Budget planning state (amounts, distributions, scenarios) | **Medium** — two tabs editing budget simultaneously will overwrite each other's data silently |
| `movementSortField` | Sort preference | **Low** — UI preference |
| `movementSortOrder` | Sort preference | **Low** — UI preference |
| `investment_price_cache` | Cached stock prices with timestamps | **Low** — read-only cache, worst case is slightly stale display |
| `sb-*` (Supabase internal) | Auth tokens, session data | **None** — Supabase client handles this correctly |

**Key concern**: `finance_app_budget_planning` is debounce-written (500ms delay) on every state change. Two tabs editing budget simultaneously will silently clobber each other. Since budget planning is device-local only (never synced to backend), data loss is permanent.

---

## 4. Real-time subscriptions (Supabase Realtime)

**None.** The only `subscribe` call in the codebase is `supabase.auth.onAuthStateChange()` in `AuthContext.tsx`, which listens for auth state changes (login/logout/token refresh). There are zero Postgres Changes subscriptions, zero Broadcast channels, zero Presence channels.

```typescript
// AuthContext.tsx — the ONLY subscription
const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  setLoading(false);
});
```

**Impact**: No mechanism exists for one tab to learn about data changes made by another tab (or another device entirely).

---

## 5. Logout detection across tabs

**Partially handled by Supabase.** Supabase stores the session in localStorage under `sb-<project-ref>-auth-token`. When Tab A calls `signOut()`, Supabase removes this key. Tab B's `onAuthStateChange` listener will fire on the next Supabase client heartbeat (typically within seconds) because Supabase's JS client uses a `storage` event listener internally.

However, the app's `ProtectedRoute` only checks `user` from `AuthContext`:

```typescript
// ProtectedRoute.tsx
const { user, loading } = useAuth();
if (!user) return <Navigate to="/login" replace />;
```

**What works**: Supabase's internal `storage` event propagation will eventually trigger `onAuthStateChange` in Tab B, setting `user` to `null`, which causes `ProtectedRoute` to redirect to `/login`.

**What doesn't work**: There's a race window. Between logout in Tab A and the `onAuthStateChange` firing in Tab B, Tab B can still make API calls. The `apiClient` fetches the token via `supabase.auth.getSession()` on every request, so once the localStorage token is cleared, subsequent requests will fail with 401 — but the UI won't show an error boundary, it'll show individual query errors.

---

## 6. Global singletons holding stale state

Three service singletons hold in-memory state:

### `investmentService` (class instance)
```typescript
export const investmentService = new InvestmentService();
// Holds: private priceCache: Map<string, PriceCache>
```
- Each tab has its own instance with its own `priceCache` Map
- The Map is hydrated from localStorage on `getPriceTimestamp()` calls (lazy load)
- **Risk**: Low — prices are also cached in TanStack Query; the Map is just for timestamp display

### `currencyService` (class instance)
```typescript
export const currencyService = new CurrencyService();
// Holds: private cache: Map<string, CachedRate> (24-hour TTL)
```
- Each tab has its own in-memory rate cache
- **Risk**: Low — rates are fetched from backend; the cache is a performance optimization with 24h TTL
- **Issue**: If rates change significantly, one tab could show a different converted total than another for up to 24 hours

### `apiClient` (class instance)
```typescript
export const apiClient = new ApiClient();
// Holds: private readonly baseURL (immutable)
```
- No mutable state — safe

---

## 7. Auth token sharing across tabs

**Correctly handled.** Supabase stores the JWT in localStorage under a well-known key (`sb-<project-ref>-auth-token`). All tabs share this token. The `apiClient.getAuthToken()` method calls `supabase.auth.getSession()` on every request, which reads from this shared localStorage entry.

```typescript
// apiClient.ts
private async getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
```

Token refresh is also handled by Supabase's client library, which uses localStorage events to propagate refreshed tokens across tabs.

**No issues here.**

---

## 8. Duplicate data creation (auto-snapshot race)

**Moderate risk.** The `useAutoNetWorthSnapshot` hook runs on every app mount:

```typescript
// useAutoNetWorthSnapshot.ts
const hasRun = useRef(false);

useEffect(() => {
  if (hasRun.current) return;
  // ... checks if snapshot is due ...
  if (shouldTakeSnapshot()) {
    hasRun.current = true;
    calculateNetWorth(); // → createMutation.mutate(...)
  }
}, [accounts, settings, latestSnapshot, loadingSnapshot, createMutation]);
```

**The guard is per-tab only** (`useRef` resets on each mount). If two tabs load simultaneously:
1. Both fetch `latestSnapshot` from the backend
2. Both determine `shouldTakeSnapshot() === true`
3. Both call `createMutation.mutate()`
4. Two duplicate snapshots are created

**Mitigation needed**: A backend-side uniqueness constraint (e.g., one snapshot per user per day) or a distributed lock.

---

## Risk Matrix

| Issue | Severity | Likelihood | Impact |
|-------|----------|------------|--------|
| Stale data across tabs (no refetchOnWindowFocus) | Medium | High | User sees outdated balances/transactions |
| Budget planning localStorage clobber | Medium | Low | Silent data loss for budget entries |
| Duplicate auto-snapshots | Medium | Medium | Polluted net worth history |
| No conflict detection on mutations | Low | Medium | Last-write-wins, potential data inconsistency |
| Logout race window | Low | Low | Brief period where stale tab can attempt API calls |
| Singleton cache divergence | Low | Low | Minor display differences between tabs |

---

## Recommendations

### Quick Wins (Low Effort)
1. **Enable `refetchOnWindowFocus: true`** — This is the single highest-impact change. When a user switches to a stale tab, all queries marked as stale will refetch automatically.
2. **Add a unique constraint** on `net_worth_snapshots(user_id, snapshot_date)` in the database to prevent duplicate auto-snapshots.

### Medium Effort
3. **Add a `BroadcastChannel` wrapper** around `queryClient.invalidateQueries()` so that when Tab A mutates, Tab B's cache is invalidated immediately.
4. **Add a `storage` event listener** for `finance_app_budget_planning` so tabs can detect external writes and reload.

### Higher Effort
5. **Subscribe to Supabase Realtime** for critical tables (accounts, movements) to get push-based cross-tab/cross-device sync.
6. **Add optimistic locking** (version column + conflict detection) for entities where concurrent edits are possible.

---

## Files Examined

- `lib/queryClient.ts` — QueryClient configuration
- `lib/supabase.ts` — Supabase client initialization
- `contexts/AuthContext.tsx` — Auth state management and subscription
- `components/ProtectedRoute.tsx` — Route guard
- `main.tsx` — App bootstrap
- `App.tsx` — Route structure
- `services/apiClient.ts` — HTTP client singleton
- `services/investmentService.ts` — Investment price cache singleton
- `services/currencyService.ts` — Currency rate cache singleton
- `services/settingsService.ts` — Settings service (stateless)
- `store/useThemeStore.ts` — Zustand theme store with localStorage
- `hooks/useBudgetPersistence.ts` — Budget localStorage persistence
- `hooks/useMovementsSort.ts` — Sort preference localStorage
- `hooks/useAutoNetWorthSnapshot.ts` — Auto-snapshot logic
- `hooks/useInvestmentPrices.ts` — Investment price fetching
- `hooks/queries/useNetWorthSnapshotQueries.ts` — Snapshot mutations
