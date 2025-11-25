# 🐌 Performance Audit & Optimization TODO

## 🔴 Critical Issues (Causing Slowness)

### 1. Fetch-All-Save-All Pattern
**Problem:** Services fetch ALL items, modify one, save ALL back
**Impact:** Every operation fetches 100% of data when only 1% changes
**Status:** ✅ FIXED for all services!

**Files fixed:**
- [x] `src/services/accountService.ts` - uses insertAccount, updateAccount, deleteAccount
- [x] `src/services/pocketService.ts` - uses insertPocket, updatePocket, deletePocket
- [x] `src/services/movementService.ts` - uses insertMovement, updateMovement, deleteMovement

**Solution:** ✅ All services now use efficient single-record operations

---

### 2. Unnecessary Recalculations
**Problem:** After every operation, services call `updateAccount()` or `updatePocket()` which triggers cascading reloads
**Impact:** Single operation triggers 3-5 database queries
**Status:** ✅ FIXED - removed all unnecessary recalculation calls

**Changes made:**
- [x] Removed `updateAccount()` calls from pocketService and movementService
- [x] Removed `updatePocket()` calls from movementService
- [x] Added comments: "Note: Balance will be recalculated by store when it reloads"

**Solution:** ✅ Store now handles all reloading in background

---

### 3. Synchronous Balance Calculations
**Problem:** Balance calculations call other services synchronously
**Impact:** Creates waterfall of sequential queries
**Location:**
- [ ] `accountService.calculateAccountBalance()` - calls `getPocketsByAccount()`
- [ ] `pocketService.calculatePocketBalance()` - calls `getSubPocketsByPocket()`

**Solution:** Calculate balances from already-loaded data in store, not by fetching again

---

### 4. Missing Database Indexes
**Problem:** Queries might be slow without proper indexes
**Impact:** Each query takes longer than necessary
**Check:**
- [ ] Verify indexes exist on `user_id` columns (should be from schema)
- [ ] Add composite indexes for common queries
- [ ] Check Supabase dashboard for slow queries

**Solution:** Add indexes in Supabase SQL editor:
```sql
CREATE INDEX IF NOT EXISTS idx_pockets_user_account ON pockets(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_sub_pockets_user_pocket ON sub_pockets(user_id, pocket_id);
CREATE INDEX IF NOT EXISTS idx_movements_user_account ON movements(user_id, account_id);
```

---

### 5. No Request Batching
**Problem:** Store makes multiple sequential API calls
**Impact:** Network latency multiplied by number of calls
**Location:**
- [ ] Store `loadAccounts()`, `loadPockets()`, `loadSubPockets()` called separately
- [ ] After create/update, multiple reload calls

**Solution:** Batch related queries or use Supabase's batch API

---

## 🟡 Medium Issues (Noticeable Impact)

### 6. Store Reloads Everything After Every Action
**Problem:** Even with optimistic updates, we reload ALL data
**Impact:** Unnecessary network traffic and re-renders
**Location:**
- [ ] Every create/update/delete action calls `get().loadAccounts()`, `get().loadPockets()`, etc.

**Solution:** Only reload affected entities, or use Supabase Realtime subscriptions

---

### 7. No Caching Strategy
**Problem:** Every page load fetches fresh data
**Impact:** Slow initial page loads
**Solution:**
- [ ] Add React Query or SWR for automatic caching
- [ ] Implement stale-while-revalidate pattern
- [ ] Cache in Zustand with TTL

---

### 8. Movements Save Entire Array
**Problem:** `saveMovements()` uses upsert for ALL movements
**Impact:** Slow when user has many movements
**Status:** ✅ FIXED

**Changes made:**
- [x] `movementService.createMovement()` - now uses insertMovement()
- [x] `movementService.updateMovement()` - now uses updateMovement()
- [x] `movementService.deleteMovement()` - now uses deleteMovement()

**Solution:** ✅ All movement operations use efficient single-record methods

---

### 9. Circular Dependency Workarounds
**Problem:** Dynamic imports with `await getPocketService()` add overhead
**Impact:** Small delay on every service call
**Location:**
- [ ] All services use lazy loading pattern

**Solution:** Restructure to avoid circular dependencies, or accept the small cost

---

### 10. No Loading States for Background Reloads
**Problem:** User doesn't know data is being refreshed
**Impact:** Confusion when balances update after delay
**Solution:**
- [ ] Add subtle loading indicators for background operations
- [ ] Show "Syncing..." badge when reloading

---

## 🟢 Minor Issues (Small Impact)

### 11. Redundant Array Checks
**Problem:** `Array.isArray()` checks on every load
**Impact:** Minimal, but unnecessary
**Location:**
- [ ] All `loadX()` methods in store

**Solution:** Remove if we trust the service layer

---

### 12. No Pagination
**Problem:** Loading ALL movements/accounts at once
**Impact:** Slow with large datasets (100+ movements)
**Solution:**
- [ ] Implement pagination for movements
- [ ] Load recent movements first, older on demand

---

### 13. Supabase Region Latency
**Problem:** Supabase server might be far from user
**Impact:** 100-300ms base latency per request
**Check:**
- [ ] Check Supabase project region in dashboard
- [ ] Consider edge functions for critical operations

---

### 14. No Debouncing on Updates
**Problem:** Rapid updates (like drag & drop) trigger multiple saves
**Impact:** Unnecessary API calls
**Solution:**
- [ ] Debounce reorder operations
- [ ] Batch multiple updates

---

### 15. Large Payload Sizes
**Problem:** Fetching unnecessary columns
**Impact:** Slower network transfer
**Solution:**
- [ ] Use `.select('id, name, balance')` instead of `.select('*')`
- [ ] Only fetch what's needed for each view

---

## 🎯 Quick Wins (Easy to Fix)

1. **✅ DONE:** Optimistic updates in store
2. **✅ DONE:** Individual insert/update/delete for SubPockets
3. **✅ DONE:** Remove unnecessary `updateAccount()` and `updatePocket()` calls
4. **✅ DONE:** Add individual insert/update/delete for Accounts, Pockets, Movements
5. **TODO:** Stop reloading everything after every action (needs store optimization)
6. **TODO:** Add database indexes for common queries

---

## 📊 Expected Performance Improvements

| Optimization | Current | Target | Impact |
|--------------|---------|--------|--------|
| SubPocket create | ~2s | ~200ms | ✅ 10x faster |
| Account create | ~2s | ~300ms | ✅ Should be 6-10x faster now |
| Pocket create | ~2s | ~300ms | ✅ Should be 6-10x faster now |
| Movement create | ~2s | ~400ms | ✅ Should be 5-8x faster now |
| Page load | ~1s | ~500ms | 🔄 Need caching |

---

## 🔧 Implementation Priority

### Phase 1 (Now - 30 min)
1. Add insert/update/delete methods for Accounts, Pockets, Movements
2. Update services to use direct insert/update/delete
3. Remove unnecessary recalculation calls

### Phase 2 (Later - 1 hour)
4. Add database indexes
5. Implement proper caching strategy
6. Add pagination for movements

### Phase 3 (Future - 2 hours)
7. Add Supabase Realtime subscriptions
8. Implement request batching
9. Optimize payload sizes

---

## 🧪 How to Test Performance

1. **Open Chrome DevTools → Network tab**
2. **Filter by "Fetch/XHR"**
3. **Create a pocket and watch:**
   - How many requests are made?
   - How long does each take?
   - Are we fetching unnecessary data?

4. **Use React DevTools Profiler:**
   - See which components re-render
   - Identify unnecessary re-renders

5. **Check Supabase Dashboard:**
   - Go to Database → Query Performance
   - Look for slow queries
   - Check if indexes are being used

---

## 💡 Long-term Solutions

1. **Supabase Realtime:** Subscribe to changes instead of polling
2. **React Query:** Automatic caching, background refetching, optimistic updates
3. **Virtual Scrolling:** For large lists of movements
4. **Service Workers:** Cache static data offline
5. **Edge Functions:** Move calculations closer to user

---

**Current Status:** � PPhase 1 Complete! All CRUD operations optimized
**Next Action:** Test performance, then move to Phase 2 (indexes and caching)
