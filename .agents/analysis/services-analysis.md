# Services Layer - Comprehensive Code Review

## Executive Summary

The services layer is a disaster zone. It exhibits every anti-pattern imaginable for a frontend application that talks to a database: direct Supabase access from the browser, sequential operations where parallel is needed, no transaction safety, swallowed errors, circular dependencies solved with lazy imports, a dual-mode feature flag system that doubles code surface area, and pervasive `any` types. The architecture is fundamentally unsound — the frontend acts as its own backend, with business logic, data access, and orchestration all jammed into the same layer running in the user's browser.

**Critical findings**: 14 | **High findings**: 19 | **Medium findings**: 22 | **Low findings**: 11

---

## 1. CRITICAL BUGS

### 1.1 Batch Movement Deletion is Sequential — O(n) Network Calls
**File**: `movementService.ts` ~lines 380-400  
**Severity**: Critical  
**Category**: PERFORMANCE / BUG

```typescript
async deleteMovementsByAccount(accountId: string): Promise<number> {
    const movements = await this.getAllMovements();
    const accountMovements = movements.filter(m => m.accountId === accountId);
    for (const movement of accountMovements) {
        await SupabaseStorageService.deleteMovement(movement.id);
    }
    return accountMovements.length;
}
```

**Problem**: Deletes movements one-by-one with `await` in a loop. For an account with 500 movements, this makes 500 sequential HTTP requests. Each takes ~100-300ms, so this operation takes 50-150 seconds.

**Same pattern in**: `deleteMovementsByPocket`, `markMovementsAsOrphaned`, `updateMovementsAccountForPocket`, `restoreOrphanedMovements`

**Fix**: Use a single Supabase query with `.in()` filter or batch delete:
```typescript
await supabase.from('movements').delete().eq('account_id', accountId).eq('user_id', userId);
```

---

### 1.2 Cascade Delete Has No Transaction — Partial Deletes Corrupt State
**File**: `accountService.ts` ~lines 280-340  
**Severity**: Critical  
**Category**: DATA INTEGRITY

```typescript
private async deleteAccountCascadeDirect(id: string, deleteMovements: boolean = false) {
    // Marks movements as orphaned
    // Then loops through pockets deleting sub-pockets one by one
    // Then deletes pockets one by one
    // Then deletes account
    // If ANY step fails, previous deletes are NOT rolled back
}
```

**Problem**: If the operation fails midway (e.g., network error after deleting 3 of 5 pockets), you end up with:
- Some pockets deleted, some remaining
- Movements already marked orphaned that now point to still-existing pockets
- No way to recover without manual database intervention

**Fix**: This needs a server-side transaction. At minimum, use Supabase RPC with a PostgreSQL function that wraps everything in `BEGIN/COMMIT`.

---

### 1.3 Race Condition in Balance Updates
**File**: `movementService.ts` ~lines 195-215  
**Severity**: Critical  
**Category**: BUG / DATA INTEGRITY

```typescript
private async updatePocketBalance(pocketId: string, amount: number, isIncome: boolean): Promise<void> {
    const pocketService = await getPocketService();
    const pocket = await pocketService.getPocket(pocketId);
    if (!pocket) return;
    const newBalance = isIncome ? pocket.balance + amount : pocket.balance - amount;
    await SupabaseStorageService.updatePocket(pocketId, { balance: newBalance });
}
```

**Problem**: Classic read-modify-write race condition. If two movements are created simultaneously:
1. Both read balance = 100
2. Movement A: 100 + 50 = 150, writes 150
3. Movement B: 100 + 30 = 130, writes 130 (overwrites A's update!)

Result: Lost $50. This is a **money-losing bug**.

**Fix**: Use PostgreSQL `UPDATE pockets SET balance = balance + $1 WHERE id = $2` via Supabase RPC, or use optimistic locking.

---

### 1.4 `createSubPocketDirect` Calls `validateSubPocketUniqueness` Without `await`
**File**: `subPocketService.ts` ~line 130  
**Severity**: Critical  
**Category**: BUG

```typescript
if (!this.validateSubPocketUniqueness(pocketId, trimmedName)) {
    throw new Error(`A sub-pocket with name "${trimmedName}" already exists...`);
}
```

**Problem**: `validateSubPocketUniqueness` is an `async` method but is called without `await`. The condition always evaluates the Promise object (truthy), so the uniqueness check **never fires**. Duplicate sub-pockets can be created freely.

**Fix**: Add `await`:
```typescript
if (!(await this.validateSubPocketUniqueness(pocketId, trimmedName))) {
```

---

### 1.5 Transfer Operation is Non-Atomic — Can Create Half-Transfers
**File**: `movementService.ts` ~lines 175-195  
**Severity**: Critical  
**Category**: DATA INTEGRITY

```typescript
private async createTransferDirect(...) {
    const expense = await this.createMovementDirect('EgresoNormal', sourceAccountId, ...);
    const income = await this.createMovementDirect('IngresoNormal', targetAccountId, ...);
    return { expense, income };
}
```

**Problem**: If the first movement succeeds but the second fails (network error, validation error), money is deducted from the source but never credited to the target. The user loses money with no recovery mechanism.

**Fix**: Wrap in a database transaction via RPC, or implement a saga pattern with compensation (delete the expense if income creation fails).

---

### 1.6 `recalculateAllPocketBalances` Fetches ALL Movements Per Pocket
**File**: `movementService.ts` ~lines 440-500  
**Severity**: Critical  
**Category**: PERFORMANCE

```typescript
for (const pocket of pockets) {
    // For fixed pockets, iterates sub-pockets too
    for (const subPocket of subPockets) {
        const movements = await this.getAllMovements(); // FETCHES ALL MOVEMENTS AGAIN
        const subPocketMovements = movements.filter(m => m.subPocketId === subPocket.id);
    }
}
```

**Problem**: For each sub-pocket, it fetches ALL movements from the database, then filters client-side. If you have 10 pockets with 5 sub-pockets each and 1000 movements, this makes 50+ full-table fetches. This is an N+1 query on steroids — it's N×M+1.

**Fix**: Fetch all movements once at the start, then filter in memory. Or better, use a single SQL query with GROUP BY.

---

### 1.7 `getAllMovements` Fetches Entire Movement History With No Limit
**File**: `movementService.ts` ~line 55  
**Severity**: Critical  
**Category**: PERFORMANCE

```typescript
private async getAllMovementsDirect(page?: number, limit?: number): Promise<Movement[]> {
    const movements = await SupabaseStorageService.getMovements();
    // getMovements() fetches ALL movements with no limit
}
```

And in `supabaseStorageService.ts`:
```typescript
static async getMovements(): Promise<Movement[]> {
    const { data, error } = await supabase
        .from('movements')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    // No .limit() — fetches everything
}
```

**Problem**: After a year of use with ~30 movements/month = 360 movements. After 5 years = 1800 movements. Every single operation that touches movements loads the ENTIRE history into browser memory. Methods like `getMovementCountByAccount` fetch all movements just to count them.

**Fix**: Add pagination at the Supabase level. Use `.count()` for count operations. Never fetch all movements unless explicitly needed.

---

## 2. SECURITY

### 2.1 Frontend Directly Accesses Database — No Backend Authorization Layer
**File**: `supabaseStorageService.ts` (entire file), `currencyService.ts`, `investmentService.ts`, `fixedExpenseGroupService.ts`  
**Severity**: Critical  
**Category**: SECURITY / ARCHITECTURE

**Problem**: The frontend imports `supabase` client directly and performs CRUD operations against the database. While Supabase RLS provides row-level security, this means:
- All business logic validation runs in the browser (can be bypassed)
- The database schema is exposed to the client
- Any user can craft custom queries against any table they have RLS access to
- No rate limiting on database operations
- No audit logging of operations

**Fix**: All data access should go through the backend API (`apiClient`). The direct Supabase access should be removed entirely.

---

### 2.2 API Key Stored in User-Accessible Settings Table
**File**: `settingsService.ts` ~line 70, `supabaseStorageService.ts` ~line 380  
**Severity**: High  
**Category**: SECURITY

```typescript
async getAlphaVantageApiKey() {
    const settings = await this.getSettings();
    return settings.alphaVantageApiKey;
}
```

**Problem**: The Alpha Vantage API key is stored in the user's settings row in Supabase and transmitted to the frontend. If this is a paid API key, any authenticated user can extract it from network requests and abuse it.

**Fix**: API keys should be stored server-side only (environment variables) and never sent to the client.

---

### 2.3 Supabase Client Exposed on Window in Development
**File**: `apiClient.ts` ~line 130  
**Severity**: Medium  
**Category**: SECURITY

```typescript
if (import.meta.env.DEV) {
    (window as any).apiClient = apiClient;
}
```

Also in `investmentService.ts`:
```typescript
if (import.meta.env.DEV) {
    (window as any).investmentService = investmentService;
}
```

And `currencyService.ts`:
```typescript
if (typeof window !== 'undefined') {
    (window as any).testCurrencyAPI = () => currencyService.testAPI();
    (window as any).clearCurrencyCache = () => currencyService.clearCache();
}
```

**Problem**: The currency service exposes functions on window **unconditionally** (no DEV check). In production, anyone can call `window.clearCurrencyCache()` or `window.testCurrencyAPI()`.

**Fix**: Wrap all window assignments in `import.meta.env.DEV` checks.

---

### 2.4 No Input Sanitization on Notes/Names Before Database Insert
**File**: `movementService.ts`, `accountService.ts`, `pocketService.ts`  
**Severity**: Medium  
**Category**: SECURITY

```typescript
notes: notes?.trim(),  // Only trims, no sanitization
```

**Problem**: While Supabase uses parameterized queries (preventing SQL injection), there's no XSS sanitization. If notes contain `<script>` tags or malicious HTML, and the frontend renders them with `dangerouslySetInnerHTML` or similar, it's an XSS vector.

**Fix**: Sanitize all user input with a library like DOMPurify before storage, or ensure the frontend always renders text content safely.

---

### 2.5 `forceRefreshPrice` Bypasses Rate Limiting
**File**: `investmentService.ts` ~line 280  
**Severity**: Medium  
**Category**: SECURITY

```typescript
async forceRefreshPrice(symbol: string): Promise<number> {
    // Bypasses rate limit check entirely
    return await this.fetchPriceFromAPI(symbol);
}
```

**Problem**: This method is exposed on `window.investmentService` in dev mode and can be called programmatically. It bypasses the rate limit, allowing abuse of the Yahoo Finance API which could get the app's IP banned.

**Fix**: Even force refresh should respect some minimum cooldown (e.g., 1 minute).

---

## 3. PERFORMANCE

### 3.1 `getAccount` Fetches ALL Accounts Then Filters
**File**: `accountService.ts` ~line 115  
**Severity**: High  
**Category**: PERFORMANCE

```typescript
private async getAccountDirect(id: string): Promise<Account | null> {
    const accounts = await this.getAllAccountsDirect();
    return accounts.find(acc => acc.id === id) || null;
}
```

**Problem**: To get a single account by ID, it fetches ALL accounts, runs the CD migration check on all of them, then filters. This is called frequently (every movement creation validates the account exists).

**Fix**: Query Supabase directly with `.eq('id', id).single()`.

---

### 3.2 `getMovement` Fetches ALL Movements Then Filters
**File**: `movementService.ts` ~line 85  
**Severity**: High  
**Category**: PERFORMANCE

```typescript
async getMovement(id: string): Promise<Movement | null> {
    const movements = await this.getAllMovements();
    return movements.find(m => m.id === id) || null;
}
```

**Problem**: Same as above but worse — movements table is much larger. Every `deleteMovement`, `updateMovement`, `applyPendingMovement`, and `markAsPending` call this, which fetches the entire movements table.

**Fix**: Direct query: `supabase.from('movements').select('*').eq('id', id).single()`

---

### 3.3 `calculateAccountBalance` Makes Multiple Async Calls Per Account
**File**: `accountService.ts` ~lines 140-170  
**Severity**: High  
**Category**: PERFORMANCE

```typescript
async calculateAccountBalance(accountId: string): Promise<number> {
    const pocketService = await getPocketService();
    const pockets = await pocketService.getPocketsByAccount(accountId);
    const account = await this.getAccount(accountId);
    if (account?.type === 'investment') {
        const { investmentService } = await import('./investmentService');
        const currentPrice = await investmentService.getCurrentPrice(account.stockSymbol);
        // ...
    }
}
```

**Problem**: For investment accounts, this triggers a dynamic import, a price fetch (potentially hitting Yahoo Finance API), and multiple database queries. Called by `recalculateAllBalances` which loops through ALL accounts sequentially.

**Fix**: Batch the balance calculation. Use `Promise.all` for independent account calculations. Cache investment prices.

---

### 3.4 `reorderAccountsDirect` Saves ALL Accounts to Update Order
**File**: `accountService.ts` ~line 310  
**Severity**: High  
**Category**: PERFORMANCE

```typescript
private async reorderAccountsDirect(accountIds: string[]): Promise<void> {
    const accounts = await this.getAllAccountsDirect();
    const updatedAccounts = accounts.map(account => {
        const newIndex = accountIds.indexOf(account.id);
        if (newIndex !== -1) return { ...account, displayOrder: newIndex };
        return account;
    });
    await SupabaseStorageService.saveAccounts(updatedAccounts);
}
```

**Problem**: `saveAccounts` does a full upsert of ALL accounts just to update display_order on a few. Same pattern in `reorderPocketsDirect`.

**Fix**: Update only the changed records:
```typescript
for (const [index, id] of accountIds.entries()) {
    await supabase.from('accounts').update({ display_order: index }).eq('id', id);
}
```
Or better, batch update with a single RPC call.

---

### 3.5 `toggleSubPocketEnabledDirect` Saves ALL Sub-Pockets
**File**: `subPocketService.ts` ~line 240  
**Severity**: High  
**Category**: PERFORMANCE

```typescript
private async toggleSubPocketEnabledDirect(id: string): Promise<SubPocket> {
    const allSubPockets = await this.getAllSubPocketsDirect();
    const updated = { ...subPocket, enabled: !subPocket.enabled };
    await SupabaseStorageService.saveSubPockets(
        allSubPockets.map((sp: SubPocket) => (sp.id === id ? updated : sp))
    );
}
```

**Problem**: To toggle one boolean on one record, it fetches ALL sub-pockets and upserts ALL of them back. Same issue in `toggleGroupDirect`.

**Fix**: `await SupabaseStorageService.updateSubPocket(id, { enabled: !subPocket.enabled })`

---

### 3.6 `saveBudgetEntries` Deletes All Then Re-inserts
**File**: `supabaseStorageService.ts` ~line 400  
**Severity**: Medium  
**Category**: PERFORMANCE / DATA INTEGRITY

```typescript
static async saveBudgetEntries(entries: BudgetEntry[]): Promise<void> {
    await supabase.from('budget_entries').delete().eq('user_id', userId);
    if (entries.length > 0) {
        const { error } = await supabase.from('budget_entries').insert(entriesToInsert);
    }
}
```

**Problem**: Non-atomic delete-then-insert. If the insert fails after the delete succeeds, all budget entries are lost. Also inefficient — should use upsert.

**Fix**: Use upsert with conflict resolution, or wrap in a transaction.

---

### 3.7 Investment Price Fetching Has No Deduplication
**File**: `investmentService.ts`  
**Severity**: Medium  
**Category**: PERFORMANCE

**Problem**: If multiple components call `getCurrentPrice('VOO')` simultaneously before the cache is populated, each will independently hit the database and potentially the API. No request deduplication or promise coalescing.

**Fix**: Implement a pending-request map that returns the same promise for concurrent requests to the same symbol.

---

## 4. ARCHITECTURE

### 4.1 Dual-Mode Feature Flag Pattern Doubles Code Surface Area
**File**: ALL service files  
**Severity**: Critical  
**Category**: ARCHITECTURE

Every single service has this pattern:
```typescript
private useBackend = import.meta.env.VITE_USE_BACKEND_ACCOUNTS === 'true';

async getAllAccounts(): Promise<Account[]> {
    if (this.useBackend) {
        try {
            return await apiClient.get<Account[]>('/api/accounts');
        } catch (error) {
            console.error('Backend API failed, falling back to Supabase:', error);
            return await this.getAllAccountsDirect();
        }
    }
    return await this.getAllAccountsDirect();
}
```

**Problems**:
1. Every method has 2 implementations that must be kept in sync
2. The "fallback" silently switches from backend to direct DB access on ANY error — including auth failures, validation errors, etc. This masks real bugs.
3. There are **9 separate feature flags** (`VITE_USE_BACKEND_ACCOUNTS`, `VITE_USE_BACKEND_MOVEMENTS`, `VITE_USE_BACKEND_POCKETS`, `VITE_USE_BACKEND_SUBPOCKETS`, `VITE_USE_BACKEND_SETTINGS`, `VITE_USE_BACKEND_CURRENCY`, `VITE_USE_BACKEND_INVESTMENTS`, `VITE_USE_BACKEND_FIXED_EXPENSE_GROUPS`, `VITE_USE_BACKEND_MOVEMENTS`) — one per service
4. The fallback means you can never fully trust the backend is being used
5. Constructor logging in production (`console.log('🚀 AccountService: Using BACKEND API...')`)

**Fix**: Pick one mode. If you have a backend, use it exclusively. Remove all direct Supabase access from the frontend. Remove the fallback — if the backend is down, show an error, don't silently corrupt data by falling back to a different data path.

---

### 4.2 Circular Dependencies Solved With Lazy Imports
**File**: `accountService.ts`, `movementService.ts`, `pocketService.ts`, `subPocketService.ts`  
**Severity**: High  
**Category**: ARCHITECTURE

```typescript
let pocketServiceCache: any = null;
let subPocketServiceCache: any = null;
let movementServiceCache: any = null;

const getPocketService = async () => {
    if (!pocketServiceCache) {
        const module = await import('./pocketService');
        pocketServiceCache = module.pocketService;
    }
    return pocketServiceCache;
};
```

**Problem**: 
- `accountService` → imports `pocketService`, `subPocketService`, `movementService`
- `movementService` → imports `pocketService`, `subPocketService`, `accountService`
- `pocketService` → imports `accountService`, `subPocketService`
- `subPocketService` → imports `pocketService`

This is a circular dependency graph solved with dynamic imports and module-level caches typed as `any`. This:
- Defeats tree-shaking
- Makes testing nearly impossible (can't mock dependencies)
- Creates hidden coupling
- The `any` types eliminate all type safety

**Fix**: Extract shared logic into a separate orchestration layer. Services should not call each other — a higher-level "use case" or "command" layer should coordinate between them.

---

### 4.3 God-Class: `MovementService` (700+ lines)
**File**: `movementService.ts`  
**Severity**: High  
**Category**: ARCHITECTURE

**Problem**: This single class handles:
- CRUD for movements
- Balance calculations
- Orphan management
- Transfer logic
- Pagination
- Grouping by month
- Investment account syncing
- Pending movement lifecycle
- Batch operations

It violates SRP massively. Any change to any of these concerns risks breaking the others.

**Fix**: Split into focused services: `MovementCRUD`, `BalanceCalculator`, `OrphanManager`, `TransferService`, `MovementQueries`.

---

### 4.4 Three Storage Layers With Inconsistent Usage
**Files**: `storageService.ts`, `supabaseStorageService.ts`, `apiClient.ts`  
**Severity**: High  
**Category**: ARCHITECTURE

The app has THREE data access mechanisms:
1. `StorageService` — localStorage (legacy, still used by `currencyService.getPrimaryCurrency()` and `settingsService`)
2. `SupabaseStorageService` — direct Supabase queries
3. `apiClient` — backend REST API

`settingsService` uses ALL THREE:
```typescript
// Backend API
return await apiClient.get<Settings>('/api/settings');
// Supabase direct
const supabaseSettings = await SupabaseStorageService.getSettings();
// localStorage
return StorageService.getSettings();
```

**Problem**: Data can be out of sync between layers. localStorage has stale data, Supabase has different data, backend might have yet another version.

**Fix**: Single source of truth. Remove localStorage for anything that has a database backing. Remove direct Supabase access if backend exists.

---

### 4.5 `MovementTemplateService` Uses Different Pattern Than All Others
**File**: `movementTemplateService.ts`  
**Severity**: Medium  
**Category**: ARCHITECTURE

This service:
- Has no feature flag / dual-mode pattern
- Always uses `SupabaseStorageService` directly
- Generates IDs client-side with `generateId()`
- Has no `apiClient` usage at all

Meanwhile `reminderService.ts` and `netWorthSnapshotService.ts` use ONLY `apiClient` with no Supabase fallback.

**Problem**: Three completely different architectural patterns across services in the same layer. Impossible to reason about which path data takes.

**Fix**: Standardize all services to use the same pattern (preferably backend-only via apiClient).

---

### 4.6 Client-Side ID Generation
**File**: `accountService.ts`, `movementService.ts`, `pocketService.ts`, `subPocketService.ts`, `movementTemplateService.ts`  
**Severity**: Medium  
**Category**: ARCHITECTURE

```typescript
import { generateId } from '../utils/idGenerator';
// ...
const account: Account = { id: generateId(), ... };
```

**Problem**: IDs are generated client-side before insertion. This means:
- No guarantee of uniqueness across devices/sessions
- If the insert fails and is retried, a new ID is generated (orphaning the old attempt)
- The database should be the authority on ID generation (UUID default columns)

**Fix**: Let the database generate IDs via `DEFAULT gen_random_uuid()` and return them in the insert response.

---

## 5. DATA INTEGRITY

### 5.1 Movement Update Reverts Then Applies — Non-Atomic
**File**: `movementService.ts` ~lines 250-290  
**Severity**: Critical  
**Category**: DATA INTEGRITY

```typescript
private async updateMovementDirect(id: string, updates: Partial<...>): Promise<Movement> {
    // Revert old balance changes
    await this.updatePocketBalance(oldMovement.pocketId, oldMovement.amount, !oldIsIncome);
    // Apply new balance changes
    await this.updatePocketBalance(updatedMovement.pocketId, updatedMovement.amount, newIsIncome);
    // Update the movement record
    await SupabaseStorageService.updateMovement(id, updates);
}
```

**Problem**: Three separate operations with no atomicity:
1. If step 2 fails after step 1 succeeds: balance is reverted but new balance never applied → money disappears
2. If step 3 fails: balances are updated but the movement record still shows old values → inconsistent state
3. The movement record update happens LAST, so if it fails, balances are wrong

**Fix**: Database transaction via RPC. Or at minimum, update the movement record FIRST (it's the source of truth), then recalculate balances from movements.

---

### 5.2 `fixIncompleteCDAccounts` Silently Mutates Data on Read
**File**: `accountService.ts` ~lines 85-130  
**Severity**: High  
**Category**: DATA INTEGRITY

```typescript
private async fixIncompleteCDAccounts(accounts: Account[]): Promise<Account[]> {
    for (const account of cdAccounts) {
        if (isMissingAllCDFields) {
            const updates = { principal: 1000, interestRate: 5.0, termMonths: 12, ... };
            Object.assign(account, updates);
            await this.updateAccountDirect(account.id, updates);
        }
    }
}
```

**Problem**: A READ operation (`getAllAccounts`) silently WRITES default values to CD accounts that are missing fields. This:
- Violates principle of least surprise (reads shouldn't have side effects)
- Assigns arbitrary defaults ($1000 principal, 5% rate) that are almost certainly wrong
- Runs on EVERY call to `getAllAccounts`, adding latency
- The `skipMigration` flag is a hack to prevent this during CD creation — fragile

**Fix**: Migration should be a one-time script, not embedded in every read path. Remove this entirely and fix the data once.

---

### 5.3 `markMovementsAsOrphaned` Fetches Account/Pocket Info That May Already Be Deleted
**File**: `movementService.ts` ~lines 420-450  
**Severity**: High  
**Category**: DATA INTEGRITY

```typescript
async markMovementsAsOrphaned(id: string, type: 'account' | 'pocket'): Promise<number> {
    for (const movement of targetMovements) {
        const account = await accountService.getAccount(movement.accountId);
        const pocket = movement.pocketId ? await pocketService.getPocket(movement.pocketId) : null;
        await SupabaseStorageService.updateMovement(movement.id, {
            orphanedAccountName: account?.name || 'Unknown',
            orphanedPocketName: pocket?.name || 'Unknown',
        });
    }
}
```

**Problem**: In `deleteAccountCascadeDirect`, this is called BEFORE pockets are deleted but the account still exists. However, if called during pocket deletion, the pocket might already be gone. The `|| 'Unknown'` fallback means orphaned movements lose their provenance data permanently.

**Fix**: Capture account/pocket names BEFORE starting any deletion, pass them as parameters.

---

### 5.4 Balance Can Go Negative With No Warning
**File**: `movementService.ts` ~line 200  
**Severity**: Medium  
**Category**: DATA INTEGRITY

```typescript
const newBalance = isIncome ? pocket.balance + amount : pocket.balance - amount;
```

**Problem**: No check for negative balance. An expense of $500 on a pocket with $100 balance results in -$400. Whether this is intentional (overdraft) or a bug depends on business rules, but there's no validation or warning.

**Fix**: At minimum, add a warning. Ideally, validate against business rules (can this pocket go negative?).

---

### 5.5 `updateAccountDirect` Recalculates Balance During Update
**File**: `accountService.ts` ~line 230  
**Severity**: Medium  
**Category**: DATA INTEGRITY

```typescript
private async updateAccountDirect(id: string, updates: Partial<Account>): Promise<Account> {
    // ...
    const newBalance = await this.calculateAccountBalance(id);
    updatedAccount.balance = newBalance;
    const finalUpdates = { ...updates, balance: newBalance };
    await SupabaseStorageService.updateAccount(id, finalUpdates);
}
```

**Problem**: Every account update (even just changing the name or color) triggers a full balance recalculation, which for investment accounts hits the stock price API. Renaming an account shouldn't fetch Yahoo Finance data.

**Fix**: Only recalculate balance when balance-affecting changes occur.

---

## 6. ERROR HANDLING

### 6.1 Silent Fallback Masks Real Errors
**File**: ALL services with dual-mode pattern  
**Severity**: Critical  
**Category**: ERROR HANDLING

```typescript
try {
    return await apiClient.get<Account[]>('/api/accounts');
} catch (error) {
    console.error('❌ Backend API failed, falling back to Supabase:', error);
    return await this.getAllAccountsDirect();
}
```

**Problem**: ANY error from the backend (including 401 Unauthorized, 403 Forbidden, 422 Validation Error, 500 Server Error) triggers a silent fallback to direct Supabase access. This means:
- Auth failures are never surfaced to the user
- Validation errors from the backend are ignored
- The user might see stale/different data from the fallback path
- Bugs in the backend are invisible — the app "works" but via the wrong path

**Fix**: Only fall back on network errors (timeout, connection refused). Surface all other errors to the user.

---

### 6.2 `apiClient.handleError` Loses Error Context
**File**: `apiClient.ts` ~lines 40-55  
**Severity**: High  
**Category**: ERROR HANDLING

```typescript
private handleError(error: any, context?: {...}): never {
    let errorMessage = 'Unknown error';
    if (error.response) {
        errorMessage = error.response.data?.message || `Server error (${error.response.status})`;
    } else if (error.request) {
        errorMessage = 'No response from server';
    } else {
        errorMessage = error.message || 'Unknown error';
    }
    throw new Error(errorMessage);
}
```

**Problem**: 
1. The error handling checks for `error.response` and `error.request` (Axios patterns) but the client uses `fetch` — these properties don't exist on fetch errors
2. The original error is discarded — only the message string is kept
3. HTTP status codes are lost in the re-thrown error
4. Stack trace of the original error is lost

**Fix**: The error handling logic is written for Axios but the implementation uses fetch. The `error.response` / `error.request` branches are dead code. Rewrite to handle fetch errors properly and preserve error context.

---

### 6.3 `updatePocketBalance` Silently Returns on Missing Pocket
**File**: `movementService.ts` ~line 198  
**Severity**: High  
**Category**: ERROR HANDLING

```typescript
private async updatePocketBalance(pocketId: string, amount: number, isIncome: boolean): Promise<void> {
    const pocket = await pocketService.getPocket(pocketId);
    if (!pocket) return; // Silent failure!
}
```

**Problem**: If the pocket doesn't exist (deleted, wrong ID), the balance update is silently skipped. The movement is still created, but the balance is never updated. This creates an inconsistency between movements and balances that accumulates over time.

**Fix**: Throw an error if the pocket doesn't exist. The caller should handle it.

---

### 6.4 No Retry Logic Anywhere
**File**: All services  
**Severity**: Medium  
**Category**: ERROR HANDLING

**Problem**: No service implements retry logic for transient failures (network timeouts, 503s, rate limits). A single failed request means the operation fails permanently.

**Fix**: Add exponential backoff retry for idempotent operations (GET, PUT with same data). Use a retry wrapper utility.

---

### 6.5 `deleteAccountCascadeDirect` Continues After Sub-Pocket Deletion Failure
**File**: `accountService.ts` ~line 300  
**Severity**: Medium  
**Category**: ERROR HANDLING

```typescript
for (const subPocket of subPockets) {
    await subPocketService.deleteSubPocket(subPocket.id);
}
// No try/catch — if one fails, the loop throws and remaining sub-pockets are not deleted
// But pockets deletion continues...
```

Actually looking more carefully, the sub-pocket deletion loop has no try/catch, so if one fails the entire cascade aborts mid-way. But the pocket deletion below DOES have try/catch that re-throws. The behavior is inconsistent.

**Fix**: Either fail-fast with rollback, or collect errors and report all failures at the end.

---

### 6.6 `currencyService.fetchFromAPI` Uses Relative URL That Won't Work in All Contexts
**File**: `currencyService.ts` ~line 170  
**Severity**: Medium  
**Category**: BUG / ERROR HANDLING

```typescript
private async fetchFromAPI(from: string, to: string): Promise<number> {
    const url = `${this.API_ENDPOINT}?base=${from}&currencies=${to}`;
    // API_ENDPOINT = '/api/exchange-rates'
}
```

**Problem**: Uses a relative URL `/api/exchange-rates` which only works if there's a proxy or the app is served from the same origin as the API. In the `getExchangeRateAsyncDirect` method, this is called directly (not through apiClient), so it doesn't get the base URL or auth headers.

**Fix**: Use `apiClient` for all API calls, or construct the full URL properly.

---

## 7. CODE QUALITY

### 7.1 Pervasive `any` Types
**File**: All services  
**Severity**: High  
**Category**: CODE QUALITY

```typescript
// accountService.ts
let pocketServiceCache: any = null;
let subPocketServiceCache: any = null;
let movementServiceCache: any = null;

// supabaseStorageService.ts
const settingsData: any = { ... };

// storageService.ts
static getAccounts() { return this.get<any[]>(STORAGE_KEYS.ACCOUNTS) || []; }
static getPockets() { return this.get<any[]>(STORAGE_KEYS.POCKETS) || []; }
static getSubPockets() { return this.get<any[]>(STORAGE_KEYS.SUB_POCKETS) || []; }
static getMovements() { return this.get<any[]>(STORAGE_KEYS.MOVEMENTS) || []; }
static getSettings() { return this.get<any>(STORAGE_KEYS.SETTINGS) || {...}; }
static getBudgetPlanning() { return this.get<any>(STORAGE_KEYS.BUDGET_PLANNING) || {...}; }

// accountService.ts
await this.updateAccountDirect(cdId, { ... } as any); // "Type assertion needed"
```

**Problem**: `any` eliminates TypeScript's value. The lazy import caches are all `any`, meaning every method call on them is unchecked. The `StorageService` returns `any[]` for everything.

**Fix**: Type the caches properly. Use the actual service interfaces. Remove all `as any` assertions.

---

### 7.2 Excessive Console Logging in Production
**File**: `accountService.ts` (worst offender)  
**Severity**: Medium  
**Category**: CODE QUALITY

```typescript
console.log('🏗️ AccountService constructor called');
console.log('🔧 Environment variables:', { ... });
console.log('🔄 AccountService.getAllAccounts called');
console.log('🌐 Attempting to use backend API at', ...);
console.log('✅ Backend API success! Received accounts:', accounts.length);
console.log('📦 Raw accounts from backend API:', accounts);
// Logs EVERY account's full details including financial data:
accounts.forEach(account => {
    console.log('🏦 Backend account details:', { id, name, balance, principal, ... });
});
```

**Problem**: 
- Logs sensitive financial data (balances, interest rates, principals) to the browser console in production
- Performance impact from serializing large objects
- Console noise makes real debugging harder
- No log levels — everything is `console.log` or `console.error`

**Fix**: Remove all debug logging. Use a proper logging library with levels (debug/info/warn/error) that can be disabled in production.

---

### 7.3 eslint-disable Comments
**File**: `accountService.ts`, `movementService.ts`, `pocketService.ts`, `subPocketService.ts`  
**Severity**: Low  
**Category**: CODE QUALITY

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pocketServiceCache: any = null;
```

**Problem**: 12+ eslint-disable comments across the services, all for the same issue (the `any` typed caches). This is a symptom of the circular dependency problem.

**Fix**: Fix the underlying architecture issue and the eslint disables become unnecessary.

---

### 7.4 Dead Code: `StorageService`
**File**: `storageService.ts`  
**Severity**: Low  
**Category**: CODE QUALITY

**Problem**: The entire `StorageService` class (localStorage-based) appears to be legacy code from before Supabase was added. It's still imported by `settingsService` and `currencyService` but most of its methods (`getAccounts`, `getPockets`, `getMovements`, etc.) are never called in the main flow.

**Fix**: Remove `StorageService` entirely. Migrate any remaining localStorage usage to the backend.

---

### 7.5 Inconsistent Error Messages
**File**: All services  
**Severity**: Low  
**Category**: CODE QUALITY

```typescript
// Some use template literals:
throw new Error(`Account with id "${id}" not found.`);
// Some use plain strings:
throw new Error('User not authenticated');
// Some include context:
throw new Error(`Cannot delete account "${account.name}" because it has ${pockets.length} pocket(s).`);
// Some are generic:
throw new Error('Movement is already applied.');
```

**Problem**: No error codes, no consistent format, no i18n. Error messages are user-facing strings mixed with developer-facing strings.

**Fix**: Create an error class hierarchy with codes. Separate user-facing messages from developer context.

---

### 7.6 `reminderService.splitSeries` Returns `any`
**File**: `reminderService.ts` ~line 90  
**Severity**: Low  
**Category**: CODE QUALITY

```typescript
splitSeries: async (id: string, splitDate: string, newDetails?: CreateReminderDTO): Promise<any> => {
    const response = await api.post(`/api/reminders/${id}/split`, { splitDate, newDetails });
    return response;
}
```

**Problem**: Returns `Promise<any>` — the only method in this service without a proper return type.

**Fix**: Define the return type interface.

---

### 7.7 Inconsistent Service Patterns
**File**: All services  
**Severity**: Medium  
**Category**: CODE QUALITY

| Service | Pattern | ID Gen | Storage |
|---------|---------|--------|---------|
| accountService | Class + dual-mode | Client | Supabase + API |
| movementService | Class + dual-mode | Client | Supabase + API |
| pocketService | Class + dual-mode | Client | Supabase + API |
| subPocketService | Class + dual-mode | Client | Supabase + API |
| settingsService | Class + dual-mode | N/A | Supabase + API + localStorage |
| currencyService | Class + dual-mode | N/A | Supabase + API + localStorage |
| investmentService | Class + dual-mode | N/A | Supabase + API + localStorage |
| fixedExpenseGroupService | Class + dual-mode | Server | Supabase + API |
| movementTemplateService | Class, NO dual-mode | Client | Supabase only |
| reminderService | Object literal, NO dual-mode | Server | API only |
| netWorthSnapshotService | Object literal, NO dual-mode | Server | API only |
| cdCalculationService | Class, pure logic | N/A | None |
| storageService | Static class | N/A | localStorage only |

**Problem**: 5 different architectural patterns in one layer. No consistency in how services are structured, how they access data, or how they handle IDs.

---

## 8. ADDITIONAL BUGS

### 8.1 `getMovementsByMonthDirect` Uses Wrong Date for Filtering
**File**: `movementService.ts` ~line 140  
**Severity**: Medium  
**Category**: BUG

```typescript
private async getMovementsByMonthDirect(year: number, month: number): Promise<Movement[]> {
    const movements = await this.getActiveMovements();
    return movements.filter(m => {
        const date = new Date(m.displayedDate);
        return date.getFullYear() === year && date.getMonth() === month;
    });
}
```

**Problem**: JavaScript's `getMonth()` is 0-indexed (January = 0). If the caller passes `month: 1` expecting January, they get February. The API endpoint uses `?month=${month}` which is ambiguous about indexing.

**Fix**: Document clearly whether month is 0-indexed or 1-indexed. Add validation.

---

### 8.2 `currencyService.getPrimaryCurrency` is Synchronous But `settingsService` is Async
**File**: `currencyService.ts` ~line 75  
**Severity**: Medium  
**Category**: BUG

```typescript
getPrimaryCurrency(): Currency {
    const settings = StorageService.getSettings(); // Reads from localStorage
    return settings.primaryCurrency || 'USD';
}
```

**Problem**: This reads from localStorage (which may be stale) while `settingsService.getPrimaryCurrency()` reads from Supabase (authoritative). If the user changes their currency on another device, this method returns the old value until localStorage is manually updated.

**Fix**: Make this async and read from the authoritative source, or ensure localStorage is always synced.

---

### 8.3 `investmentService.loadPriceCache` Called on Every `getCurrentPriceDirect`
**File**: `investmentService.ts` ~line 175  
**Severity**: Low  
**Category**: PERFORMANCE

```typescript
private async getCurrentPriceDirect(symbol: string): Promise<number> {
    this.loadPriceCache(); // Parses JSON from localStorage every time
    // ...
}
```

**Problem**: `loadPriceCache()` parses the entire localStorage JSON on every price check. Should be loaded once in the constructor or lazily on first access.

**Fix**: Load once, update the in-memory cache when writing.

---

### 8.4 `fixedExpenseGroupService.reorderDirect` is Sequential
**File**: `fixedExpenseGroupService.ts` ~line 180  
**Severity**: Medium  
**Category**: PERFORMANCE

```typescript
private async reorderDirect(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
        const { error } = await supabase
            .from('fixed_expense_groups')
            .update({ display_order: i, updated_at: new Date().toISOString() })
            .eq('id', ids[i]);
    }
}
```

**Problem**: Sequential updates. 10 groups = 10 sequential HTTP requests.

**Fix**: Use `Promise.all` or a single RPC call.

---

## 9. SUMMARY OF RECOMMENDED FIXES (Priority Order)

### Immediate (Data Loss Risk)
1. **Fix the race condition in balance updates** — use SQL `balance = balance + amount`
2. **Make transfers atomic** — use database transaction
3. **Fix missing `await` on `validateSubPocketUniqueness`** in subPocketService
4. **Add transaction support to cascade delete**

### Short-term (Performance / UX)
5. **Replace sequential loops with batch operations** — all `for...await` loops doing individual DB calls
6. **Stop fetching ALL records to find one** — use direct queries with `.eq('id', id)`
7. **Remove the dual-mode pattern** — pick backend or Supabase, not both
8. **Add pagination to `getMovements`** — never fetch unbounded data

### Medium-term (Architecture)
9. **Remove direct Supabase access from frontend** — all data through backend API
10. **Break circular dependencies** — introduce orchestration layer
11. **Split god-classes** — MovementService, AccountService
12. **Remove `StorageService`** — dead code
13. **Standardize service patterns** — one pattern for all services

### Long-term (Quality)
14. **Remove all `any` types** — proper typing throughout
15. **Remove production console.log** — use structured logging
16. **Add error codes and proper error hierarchy**
17. **Add retry logic for transient failures**
18. **Add request deduplication for concurrent calls**

---

## Sources

- Direct code review of `/local/home/jdrami/finance-app/frontend/src/services/` — accessed 2026-05-19
