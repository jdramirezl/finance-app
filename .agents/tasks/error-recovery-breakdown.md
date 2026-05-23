# Error Recovery & Resilience — Task Breakdown

## Execution Windows

| Window | Tasks | Can Parallel? |
|--------|-------|---------------|
| 1 | Task 1 (Atomic Transfer), Task 2 (401 Interceptor) | Yes — backend vs. frontend auth, no overlap |
| 2 | Task 3 (Timeouts + Retry), Task 4 (Offline Detection + Connection Indicator) | Yes — apiClient internals vs. new context/component |
| 3 | Task 5 (Toast Deduplication + Slow Indicators) | Solo — touches toast store used by everything |
| 4 | Task 6 (Partial Page Rendering + Batch Atomicity) | Solo — touches SummaryPage and movement submit |

---

## Task Details

### Task 1: Atomic Transfer & Batch Save via Supabase RPC

**Files touched**:
1. `backend/src/modules/movements/application/useCases/CreateTransferUseCase.ts`
2. `backend/src/modules/movements/infrastructure/SupabaseMovementRepository.ts`
3. `backend/src/modules/movements/infrastructure/IMovementRepository.ts`
4. `backend/migrations/014_batch_create_movements.sql`
5. `frontend/src/hooks/useMovementSubmit.ts`

**What to do**:

The `create_transfer` RPC already exists in migration `011_atomic_operations.sql`. The backend `CreateTransferUseCase` ignores it and does two separate `movementRepo.save()` calls. Fix this.

1. **Add `createTransferAtomic` method to `IMovementRepository`**:
```typescript
createTransferAtomic(params: {
  userId: string;
  sourceAccountId: string;
  sourcePocketId: string;
  targetAccountId: string;
  targetPocketId: string;
  amount: number;
  displayedDate: string;
  notes?: string;
}): Promise<{ expense: Movement; income: Movement }>;
```

2. **Implement in `SupabaseMovementRepository`** — call the existing `create_transfer` RPC:
```typescript
async createTransferAtomic(params) {
  const { data, error } = await this.ensureClient().rpc('create_transfer', {
    p_user_id: params.userId,
    p_source_account_id: params.sourceAccountId,
    p_source_pocket_id: params.sourcePocketId,
    p_target_account_id: params.targetAccountId,
    p_target_pocket_id: params.targetPocketId,
    p_amount: params.amount,
    p_displayed_date: params.displayedDate,
    p_notes: params.notes ?? null,
  });
  if (error) throw new DatabaseError(`Atomic transfer failed: ${error.message}`);
  return {
    expense: MovementMapper.toDomain(data.expense),
    income: MovementMapper.toDomain(data.income),
  };
}
```

3. **Rewrite `CreateTransferUseCase.execute`** to call `this.movementRepo.createTransferAtomic(...)` instead of two separate saves. Keep the validation logic (negative amount, same pocket check, ownership verification) but remove the manual Movement construction — the RPC handles IDs and timestamps.

4. **Create migration `014_batch_create_movements.sql`** — a new RPC for batch movement creation:
```sql
CREATE OR REPLACE FUNCTION batch_create_movements(
    p_user_id UUID,
    p_movements JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_result JSONB := '[]'::JSONB;
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    INSERT INTO movements (id, user_id, type, account_id, pocket_id, sub_pocket_id, amount, notes, displayed_date, is_pending, created_at)
    SELECT
        COALESCE(entry->>'id', gen_random_uuid()::text),
        p_user_id,
        entry->>'type',
        entry->>'accountId',
        entry->>'pocketId',
        NULLIF(entry->>'subPocketId', ''),
        (entry->>'amount')::DECIMAL,
        NULLIF(entry->>'notes', ''),
        entry->>'displayedDate',
        COALESCE((entry->>'isPending')::BOOLEAN, FALSE),
        NOW()
    FROM jsonb_array_elements(p_movements) AS entry;

    SELECT jsonb_agg(to_jsonb(m))
      INTO v_result
      FROM movements m
     WHERE m.user_id = p_user_id
       AND m.id IN (
           SELECT COALESCE(entry->>'id', '') FROM jsonb_array_elements(p_movements) AS entry
       );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION batch_create_movements(UUID, JSONB) TO authenticated;
```

5. **Add `batchCreate` to `IMovementRepository` and implement in Supabase repo** — calls the RPC.

6. **Update `useMovementSubmit.handleBatchSave`** — replace the sequential loop with a single backend call to a new `/api/movements/batch` endpoint that calls the RPC. If the RPC throws, all rows fail atomically (no partial state). The frontend shows a single error or success toast.

**Acceptance criteria**:
- Transfer creates both movements or neither — verified by killing the server mid-request and checking DB state
- Batch save creates all movements or none
- Existing transfer and batch tests still pass
- The old sequential `save` calls in `CreateTransferUseCase` are gone

**Dependencies**: None

---

### Task 2: Auth Token Expiry — 401 Interceptor

**Files touched**:
1. `frontend/src/services/apiClient.ts`
2. `frontend/src/contexts/AuthContext.tsx`
3. `frontend/src/lib/supabase.ts` (minor — export for reuse)
4. `frontend/src/components/SessionExpiredModal.tsx` (new)
5. `frontend/src/App.tsx` (mount the modal)

**What to do**:

1. **Add a 401 interceptor in `apiClient.ts`**. In the `request` method, after detecting a non-ok response with status 401:
   - Attempt a single token refresh via `supabase.auth.refreshSession()`
   - If refresh succeeds, retry the original request once with the new token
   - If refresh fails, emit a custom event `auth:session-expired`
   - Do NOT show a toast for 401s — the modal handles it

```typescript
if (response.status === 401) {
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshData.session) {
    // Retry with fresh token
    const retryHeaders = { ...headers, Authorization: `Bearer ${refreshData.session.access_token}` };
    const retryResponse = await fetch(`${this.baseURL}${path}`, { method, headers: retryHeaders, body });
    if (retryResponse.ok) {
      if (retryResponse.status === 204) return undefined as T;
      return (await retryResponse.json()) as T;
    }
  }
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
  throw new AppError(401, 'Session expired. Please sign in again.');
}
```

2. **Update `AuthContext.tsx`** — differentiate auth events:
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    setSession(session);
    setUser(session?.user ?? null);
  }
  if (event === 'SIGNED_OUT') {
    // Clear any cached query data
    queryClient.clear();
  }
});
```

3. **Create `SessionExpiredModal.tsx`** — listens for `auth:session-expired` event, shows a non-dismissable modal with "Your session has expired. Please sign in again." and a button that calls `signOut()` then navigates to `/login`.

4. **Mount in `App.tsx`** — render `<SessionExpiredModal />` inside the auth provider.

**Acceptance criteria**:
- When a token expires mid-session, the user sees a clear modal (not a cryptic toast)
- If the token can be silently refreshed, the request succeeds transparently
- After clicking "Sign In" on the modal, the user lands on `/login` with a clean state
- No "Unauthorized" toasts appear for 401 errors

**Dependencies**: None

---

### Task 3: Request Timeouts + Mutation Retry with Backoff

**Files touched**:
1. `frontend/src/services/apiClient.ts`
2. `frontend/src/lib/queryClient.ts`
3. `frontend/src/utils/AppError.ts` (add `isTransient` helper)

**What to do**:

1. **Add request timeout to `apiClient.ts`** using `AbortController`:

```typescript
private async request<T>(method: HttpMethod, path: string, data?: Record<string, unknown>): Promise<T> {
  const body = data !== undefined ? JSON.stringify(data) : undefined;
  const context: RequestContext = { method, path, payloadSize: body?.length };

  try {
    const headers = await this.buildHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout

    const response = await fetch(`${this.baseURL}${path}`, {
      method, headers, body, signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // ... rest of handling
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AppError(0, `${method} ${path} timed out after 30s`, { isTimeout: true });
    }
    return this.handleError(error, context);
  }
}
```

2. **Add `isTransient` static method to `AppError`**:
```typescript
static isTransient(error: unknown): boolean {
  if (!(error instanceof AppError)) return false;
  // Network errors (status 0) and server errors (5xx) are transient
  return error.status === 0 || (error.status >= 500 && error.status < 600);
}
```

3. **Configure mutation retry in `queryClient.ts`**:
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Only retry transient failures
      // TanStack Query passes (failureCount, error) to retry when it's a function
    },
  },
});
```

Since TanStack Query's `retry` for mutations accepts a function `(failureCount, error) => boolean`, set it to:
```typescript
mutations: {
  retry: (failureCount, error) => {
    if (failureCount >= 2) return false;
    return AppError.isTransient(error);
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
},
```

This ensures 4xx errors (validation, auth) are never retried, but network drops and 5xx are retried twice with exponential backoff.

**Acceptance criteria**:
- Requests that hang longer than 30s throw a timeout error with a clear message
- Mutations retry up to 2 times on network errors or 5xx, with 1s/2s delays
- 4xx errors (400, 401, 403, 404, 422) are never retried
- The `AbortController` is properly cleaned up on success

**Dependencies**: Task 2 (the 401 interceptor must exist so retried 401s don't loop)

---

### Task 4: Offline Detection + Connection Status Indicator

**Files touched**:
1. `frontend/src/contexts/ConnectionContext.tsx` (new)
2. `frontend/src/components/ConnectionBanner.tsx` (new)
3. `frontend/src/App.tsx` (mount provider + banner)
4. `frontend/src/lib/queryClient.ts` (integrate `onlineManager`)
5. `frontend/src/services/apiClient.ts` (check online before request)

**What to do**:

1. **Create `ConnectionContext.tsx`** — a context that tracks online/offline state:

```typescript
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onlineManager } from '@tanstack/react-query';

type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

interface ConnectionContextType {
  status: ConnectionStatus;
  lastOnlineAt: Date | null;
}

const ConnectionContext = createContext<ConnectionContextType>({
  status: 'online',
  lastOnlineAt: null,
});

export const ConnectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<ConnectionStatus>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );

  useEffect(() => {
    const handleOnline = () => {
      setStatus('reconnecting');
      setLastOnlineAt(new Date());
      // Brief "reconnecting" state, then online
      setTimeout(() => setStatus('online'), 1500);
    };
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync TanStack Query's online manager
    onlineManager.setEventListener((setOnline) => {
      const onlineHandler = () => setOnline(true);
      const offlineHandler = () => setOnline(false);
      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
      return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      };
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ConnectionContext.Provider value={{ status, lastOnlineAt }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => useContext(ConnectionContext);
```

2. **Create `ConnectionBanner.tsx`** — a sticky banner at the top of the viewport:
   - `offline`: Red banner — "You're offline. Changes won't be saved."
   - `reconnecting`: Yellow banner — "Reconnecting..." (auto-dismisses)
   - `online`: Hidden

3. **Mount in `App.tsx`** — wrap with `<ConnectionProvider>`, render `<ConnectionBanner />` above the router outlet.

4. **Update `queryClient.ts`** — set `networkMode: 'offlineFirst'` on mutations so TanStack Query pauses them when offline and auto-fires when back online:
```typescript
mutations: {
  networkMode: 'offlineFirst',
  // ... existing retry config
},
```

5. **Guard in `apiClient.ts`** — at the top of `request()`, if `!navigator.onLine`, throw immediately with a clear message instead of letting fetch fail with a cryptic TypeError:
```typescript
if (!navigator.onLine) {
  throw new AppError(0, `Cannot ${method} ${path}: you are offline`);
}
```

**Acceptance criteria**:
- A red banner appears within 1 second of going offline
- The banner disappears after reconnection (with brief "Reconnecting..." transition)
- Mutations fired while offline are paused and execute when back online (TanStack `networkMode`)
- The apiClient throws a clear "you are offline" error instead of a generic TypeError
- No banner flicker on page load when online

**Dependencies**: Task 3 (retry config must exist so reconnection retries work correctly)

---

### Task 5: Toast Deduplication + "Taking Too Long" Indicators

**Files touched**:
1. `frontend/src/hooks/useToast.ts`
2. `frontend/src/components/Toast.tsx`
3. `frontend/src/components/SlowQueryIndicator.tsx` (new)
4. `frontend/src/hooks/useSlowQuery.ts` (new)
5. `frontend/src/pages/SummaryPage.tsx` (add slow indicator)

**What to do**:

1. **Add deduplication to `useToast.ts`** — before adding a toast, check if an identical message+type combo already exists in the active toasts array. If so, skip it:

```typescript
addToast: (message, type = 'info', duration = 5000) => {
  const state = useToast.getState();
  // Deduplicate: skip if same message+type already showing
  const isDuplicate = state.toasts.some(
    (t) => t.message === message && t.type === type
  );
  if (isDuplicate) return;

  const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  set({ toasts: [...state.toasts, { id, message, type, duration }] });
},
```

2. **Add max toast limit** — cap at 3 visible toasts. If a 4th arrives, remove the oldest:
```typescript
const MAX_TOASTS = 3;
// After adding, trim:
set((state) => ({
  toasts: state.toasts.slice(-MAX_TOASTS),
}));
```

3. **Create `useSlowQuery.ts`** — a hook that returns whether a query has been loading for longer than a threshold:
```typescript
import { useEffect, useState } from 'react';

export const useSlowQuery = (isLoading: boolean, thresholdMs = 10_000) => {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) { setIsSlow(false); return; }
    const timer = setTimeout(() => setIsSlow(true), thresholdMs);
    return () => clearTimeout(timer);
  }, [isLoading, thresholdMs]);

  return isSlow;
};
```

4. **Create `SlowQueryIndicator.tsx`** — a small inline component:
```tsx
interface Props { message?: string; }
export const SlowQueryIndicator = ({ message = 'This is taking longer than usual...' }: Props) => (
  <p className="text-sm text-amber-600 dark:text-amber-400 animate-pulse mt-2">{message}</p>
);
```

5. **Integrate in `SummaryPage.tsx`** — below the loading skeleton, if `useSlowQuery(isLoading)` returns true, render `<SlowQueryIndicator />`.

**Acceptance criteria**:
- Identical error toasts (same message + type) are never shown simultaneously
- Maximum 3 toasts visible at once; oldest is evicted when a 4th arrives
- After 10 seconds of loading on SummaryPage, a "taking longer than usual" message appears
- The slow indicator disappears immediately when loading completes
- Existing toast behavior (auto-dismiss, manual close) is unchanged

**Dependencies**: None (can run in Window 3 after Tasks 1-4 are merged to avoid conflicts with apiClient changes)

---

### Task 6: Partial Page Rendering on Error + Batch Save Partial Reporting

**Files touched**:
1. `frontend/src/pages/SummaryPage.tsx`
2. `frontend/src/components/QueryErrorInline.tsx` (new)
3. `frontend/src/hooks/useMovementSubmit.ts`
4. `frontend/src/hooks/useMovementBulkActions.ts` (reference only — already correct)
5. `frontend/src/components/ErrorBoundary.tsx` (add section-level variant)

**What to do**:

1. **Create `QueryErrorInline.tsx`** — a small inline error component for individual failed queries:
```tsx
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  message: string;
  onRetry: () => void;
}

export const QueryErrorInline = ({ message, onRetry }: Props) => (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
    <span className="text-sm text-red-700 dark:text-red-300 flex-1">{message}</span>
    <button
      onClick={onRetry}
      className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
    >
      <RefreshCw className="w-3 h-3" /> Retry
    </button>
  </div>
);
```

2. **Refactor `SummaryPage.tsx` error handling** — instead of OR-ing all errors into a single full-page block:
   - Remove the combined `isError` / `queryError` pattern
   - Let each section render independently
   - If `accountsIsError`, show `<QueryErrorInline>` in the accounts section with `refetch` from the query hook
   - If `settingsIsError`, show inline error in the settings-dependent section
   - The page still renders whatever data loaded successfully
   - Only show full-page error if ALL critical queries fail (accounts AND pockets AND settings)

```tsx
// Instead of blocking the whole page:
if (accountsIsError && pocketsIsError && settingsIsError) {
  return <FullPageError />;
}

// Render sections independently:
{accountsIsError ? (
  <QueryErrorInline message="Failed to load accounts" onRetry={() => accountsRefetch()} />
) : (
  <AccountsSection accounts={accounts} ... />
)}
```

3. **Update `useMovementSubmit.handleBatchSave`** — since Task 1 makes batch saves atomic via RPC, the error handling simplifies. But add a fallback for when the atomic endpoint isn't available (graceful degradation): if the batch endpoint returns a 404 (not deployed yet), fall back to sequential with `Promise.allSettled` and report partial results like `useMovementBulkActions` does:

```typescript
const handleBatchSave = async (rows: BatchMovementRow[]) => {
  try {
    // Try atomic batch endpoint first
    await apiClient.post('/api/movements/batch', { movements: rows.map(r => ({...})) });
    toast.success(`Created ${rows.length} movement${rows.length > 1 ? 's' : ''}`);
    setShowBatchForm(false);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) {
      // Fallback: sequential with partial reporting
      const results = await Promise.allSettled(rows.map(row => createMovement.mutateAsync({...})));
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (failed > 0) {
        toast.error(`${succeeded} created, ${failed} failed`);
      } else {
        toast.success(`Created ${rows.length} movements`);
      }
      setShowBatchForm(false);
    } else {
      throw err; // Let mutation error handler deal with it
    }
  }
};
```

4. **Add section-level `ErrorBoundary` usage** — wrap each major section of SummaryPage in its own `<ErrorBoundary>` so a render crash in one section doesn't take down the whole page. The existing `ErrorBoundary` component already supports this via the `fallback` prop.

**Acceptance criteria**:
- If accounts query fails but pockets/settings succeed, the page still renders pockets and settings sections
- Each failed section shows an inline error with a "Retry" button that calls the specific query's `refetch()`
- Clicking "Retry" re-fetches only that section, not the whole page
- Batch save reports partial results (X created, Y failed) when the atomic endpoint isn't available
- A render crash in one section is contained by ErrorBoundary and doesn't blank the page

**Dependencies**: Task 1 (the batch endpoint must exist for the atomic path), Task 5 (toast dedup prevents flooding from partial failures)

---

## Execution Summary

```
Window 1 (parallel):  Task 1 + Task 2    → Fixes CRITICAL data integrity + auth
Window 2 (parallel):  Task 3 + Task 4    → Fixes timeouts, retry, offline
Window 3 (solo):      Task 5             → Toast UX + slow indicators
Window 4 (solo):      Task 6             → Partial rendering + batch reporting
```

Total: 6 tasks covering all 10 audit findings.

| Audit Finding | Addressed In |
|---------------|-------------|
| 1. Transfer atomicity (CRITICAL) | Task 1 |
| 2. No offline detection | Task 4 |
| 3. No mutation retry | Task 3 |
| 4. No 401 interceptor | Task 2 |
| 5. No request timeouts | Task 3 |
| 6. No connection indicator | Task 4 |
| 7. Batch non-atomic | Task 1 + Task 6 |
| 8. Toast flooding/dedup | Task 5 |
| 9. No "taking too long" | Task 5 |
| 10. Partial page rendering | Task 6 |
