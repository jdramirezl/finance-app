# Database Structure Audit — Finance App (Supabase)

**Date**: 2026-05-21  
**Project**: fzndohawryghtzcqbrmz  
**Postgres Version**: 17  
**Migrations reviewed**: 000 through 013

---

## Executive Summary

The schema is reasonably well-designed for a single-user personal finance app but has several structural issues that could cause data corruption, silent bugs, or make future multi-user scaling painful. The most critical findings are:

1. **Balance trigger has NULL-safety bugs** that can corrupt balances on orphaned movements
2. **`movements` table lacks foreign key constraints** on `account_id` and `pocket_id` — intentional for orphaning but creates integrity risks for non-orphaned rows
3. **Undocumented `stock_prices` table** exists in production but has no migration
4. **No `updated_at` auto-update trigger** — the app manually sets it, which is fragile
5. **`create_transfer` RPC uses TEXT parameters for UUID columns** — type mismatch risk
6. **`maturity_date` and `cd_created_at` use TIMESTAMP instead of TIMESTAMPTZ** — timezone bugs

---

## 1. Column Type Issues

### CRITICAL: TIMESTAMP vs TIMESTAMPTZ

| Table | Column | Current Type | Should Be | Risk |
|-------|--------|-------------|-----------|------|
| `accounts` | `maturity_date` | `TIMESTAMP` | `TIMESTAMPTZ` or `DATE` | Timezone-unaware; if server TZ changes, dates shift silently |
| `accounts` | `cd_created_at` | `TIMESTAMP` | `TIMESTAMPTZ` | Same issue — inconsistent with `created_at` (TIMESTAMPTZ) on same table |

**Impact**: Low for single user in one timezone, but a latent bug. All other date columns correctly use TIMESTAMPTZ.

### MODERATE: TEXT where UUID should be

The `create_transfer` RPC function declares `p_source_account_id TEXT`, `p_source_pocket_id TEXT`, etc. — but the actual columns are `UUID`. PostgreSQL will implicitly cast, but:
- No compile-time validation
- Allows garbage strings to be passed (fails at INSERT, not at function call)
- Inconsistent with the rest of the schema

Similarly, `delete_account_cascade` uses `p_account_id TEXT`.

### MINOR: Precision inconsistencies

| Table | Column | Precision | Notes |
|-------|--------|-----------|-------|
| `sub_pockets.value_total` | `DECIMAL(15,2)` | OK for currency |
| `sub_pockets.balance` | `DECIMAL(15,2)` | Inconsistent with `pockets.balance` which is `DECIMAL(20,6)` |
| `reminder_exceptions.new_amount` | `DECIMAL(10,2)` | Smaller than `reminders.amount` `DECIMAL(15,2)` — could truncate |
| `movement_templates.default_amount` | `DECIMAL(20,6)` | Matches movements — correct |

**Recommendation**: Standardize all money columns to `DECIMAL(20,6)` for consistency.

---

## 2. Missing Foreign Key Constraints

### CRITICAL: `movements` table

```sql
account_id  UUID,       -- NO FK constraint
pocket_id   UUID,       -- NO FK constraint  
sub_pocket_id UUID,     -- NO FK constraint
```

**Why it's this way**: The orphaning system (migration 011) sets `is_orphaned = TRUE` and NULLs out the account/pocket references when an account is deleted. If FKs existed with `ON DELETE SET NULL`, this would work — but the current design allows:
- Inserting a movement with a non-existent `account_id` (no validation at DB level)
- Inserting a movement pointing to another user's account (RLS prevents reads but not writes via RPC)

**Recommendation**: Add FK constraints with `ON DELETE SET NULL` for `account_id` and `pocket_id`. The orphaning logic already handles the cascade — FKs would just add a safety net. For `sub_pocket_id`, use `REFERENCES sub_pockets(id) ON DELETE SET NULL`.

### MODERATE: `movement_templates` has FKs but movements doesn't

`movement_templates` correctly has:
```sql
account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
pocket_id   UUID REFERENCES pockets(id) ON DELETE SET NULL,
sub_pocket_id UUID REFERENCES sub_pockets(id) ON DELETE SET NULL,
```

This inconsistency means templates are safer than actual movements.

---

## 3. Missing or Redundant Indexes

### Already indexed (migration 013):
- `movements`: user_id, account_id, pocket_id, sub_pocket_id, is_pending, is_orphaned
- `pockets`: account_id, user_id
- `sub_pockets`: pocket_id, group_id, user_id
- `budget_entries`: user_id
- `movement_templates`: user_id
- `net_worth_snapshots`: (user_id, snapshot_date DESC)
- `reminder_exceptions`: reminder_id

### Missing indexes:

| Table | Suggested Index | Reason |
|-------|----------------|--------|
| `movements` | `(user_id, displayed_date DESC)` | Listing movements by date is the primary UI query |
| `movements` | `(pocket_id, is_pending) WHERE is_pending = FALSE` | Partial index for balance trigger performance |
| `accounts` | `(user_id, display_order)` | Drag-and-drop ordering queries |
| `reminders` | `(user_id, due_date)` | Reminder listing sorted by due date |
| `exchange_rates` | Already has UNIQUE on `(base_currency, target_currency)` — sufficient |

### Potentially redundant:
- `idx_movements_is_pending` and `idx_movements_is_orphaned` as standalone boolean indexes have very low selectivity. A composite index like `(pocket_id, is_pending)` would be more useful for the trigger.

---

## 4. RLS Policy Coverage

**All tables have RLS enabled** (migration 012). Coverage is complete:

| Table | RLS | Policy Strategy |
|-------|-----|-----------------|
| `accounts` | ✅ | `auth.uid() = user_id` |
| `pockets` | ✅ | `auth.uid() = user_id` |
| `sub_pockets` | ✅ | `auth.uid() = user_id` |
| `movements` | ✅ | `auth.uid() = user_id` |
| `settings` | ✅ | `auth.uid() = user_id` |
| `reminders` | ✅ | `auth.uid() = user_id` |
| `reminder_exceptions` | ✅ | JOIN to `reminders.user_id` |
| `exchange_rates` | ✅ | Any authenticated user (shared cache) |
| `budget_entries` | ✅ | `auth.uid() = user_id` |
| `movement_templates` | ✅ | `auth.uid() = user_id` |
| `net_worth_snapshots` | ✅ | `auth.uid() = user_id` |
| `fixed_expense_groups` | ✅ | `auth.uid() = user_id` |
| `stock_prices` | ❓ | **UNDOCUMENTED TABLE — unknown RLS status** |

### RLS concern with SECURITY DEFINER functions

The RPC functions (`create_transfer`, `save_budget_entries_atomic`, `delete_account_cascade`) use `SECURITY DEFINER` which **bypasses RLS**. They manually check `auth.uid() = p_user_id`. This is correct but means:
- If a bug in the function skips the auth check, RLS won't save you
- The `exchange_rates` policy allows any authenticated user to write — a malicious user could poison the rate cache

---

## 5. Redundant/Derived Data

| Table | Column | Issue |
|-------|--------|-------|
| `accounts.balance` | Derived from `SUM(pockets.balance)` | Correct — maintained by trigger. Not redundant, it's a materialized aggregate for performance. |
| `pockets.balance` | Derived from `SUM(movements.amount)` | Same — trigger-maintained. |
| `accounts.shares` | Stored separately from pocket balance | Potentially redundant — if shares are tracked as movements in a "Shares" pocket, the pocket balance already represents this. The app appears to maintain both independently. |
| `accounts.monto_invertido` | "Amount invested" | Could be derived from sum of InvestmentIngreso movements, but storing it allows manual override. Acceptable. |

**Verdict**: The balance columns are correctly implemented as materialized aggregates. The investment fields (`shares`, `monto_invertido`) are borderline — they duplicate what movements already track but allow manual correction.

---

## 6. Missing NOT NULL Constraints

### CRITICAL

| Table | Column | Current | Should Be | Reason |
|-------|--------|---------|-----------|--------|
| `movements.account_id` | `UUID` (nullable) | `UUID NOT NULL` for non-orphaned | Orphaned movements have NULL account_id, but new movements should always have one. A CHECK constraint would be better: `CHECK (is_orphaned = TRUE OR account_id IS NOT NULL)` |
| `movements.pocket_id` | `UUID` (nullable) | Same as above | Same reasoning |

### MODERATE

| Table | Column | Current | Should Be | Reason |
|-------|--------|---------|-----------|--------|
| `accounts.display_order` | `INTEGER DEFAULT 0` | `INTEGER NOT NULL DEFAULT 0` | Should always have a value |
| `pockets.display_order` | `INTEGER DEFAULT 0` | `INTEGER NOT NULL DEFAULT 0` | Same |
| `sub_pockets.display_order` | `INTEGER DEFAULT 0` | `INTEGER NOT NULL DEFAULT 0` | Same |
| `fixed_expense_groups.display_order` | `INTEGER NOT NULL DEFAULT 0` | ✅ Already correct | — |

---

## 7. Naming Inconsistencies

The schema is consistently `snake_case` — good. However:

| Issue | Location | Notes |
|-------|----------|-------|
| Spanish column name | `accounts.monto_invertido` | Should be `amount_invested` for consistency with English schema |
| Movement types use Spanish | `IngresoNormal`, `EgresoNormal`, `IngresoFijo`, `EgresoFijo` | Functional but inconsistent with English column names. Changing would require data migration. |
| `displayed_date` | `movements` | Slightly awkward — `transaction_date` or `effective_date` would be clearer |

**Recommendation**: Don't rename existing columns (data loss risk). Document the naming convention and use English for new columns.

---

## 8. Missing Default Values

| Table | Column | Issue |
|-------|--------|-------|
| `movements.is_orphaned` | Has `DEFAULT FALSE` | ✅ Correct |
| `movements.is_pending` | Has `DEFAULT FALSE` | ✅ Correct |
| `accounts.type` | Has `DEFAULT 'normal'` | ✅ Correct |
| `pockets.type` | Has `DEFAULT 'normal'` | ✅ Correct |
| `budget_entries.display_order` | Has `DEFAULT 0` | ✅ Correct |
| `settings.primary_currency` | Has `DEFAULT 'USD'` | ✅ Correct |

No critical missing defaults found.

---

## 9. Missing Tables

### CRITICAL: `stock_prices` — Undocumented

The backend code references a `stock_prices` table that has **no migration file**:

```typescript
// From SupabaseStockPriceRepository.ts
interface StockPriceRow {
  id: string;          // Uses symbol as ID (not UUID!)
  symbol: string;
  price: number;
  currency: string;
  market_state: string | null;
  last_updated: string;
  created_at: string;
}
```

This table was likely created manually in the Supabase dashboard. It needs:
- A migration file documenting its schema
- RLS policy (currently unknown status)
- A UNIQUE constraint on `symbol` (the code upserts on it)

### RECOMMENDED: Tables that should exist

| Table | Purpose | Priority |
|-------|---------|----------|
| `audit_log` | Track who changed what and when | Low (single user) |
| `user_preferences` | Already covered by `settings` table | N/A |
| `categories` / `tags` | Movement categorization beyond type | Medium — would improve reporting |
| `recurring_movements` | Separate from reminders — actual auto-generated movements | Low |

---

## 10. Data Integrity & Concurrency Risks

### CRITICAL: Balance trigger race condition

The `calculate_pocket_balance()` trigger recalculates the entire pocket balance on every movement INSERT/UPDATE/DELETE:

```sql
UPDATE pockets SET balance = (
    SELECT COALESCE(SUM(...), 0)
    FROM movements
    WHERE pocket_id = NEW.pocket_id
      AND (is_pending IS NULL OR is_pending = FALSE)
)
WHERE id = NEW.pocket_id;
```

**Race condition**: If two movements are inserted concurrently for the same pocket:
1. Transaction A inserts movement, trigger fires, recalculates balance (sees only its own movement due to MVCC)
2. Transaction B inserts movement, trigger fires, recalculates balance (sees only its own movement)
3. Final balance reflects only one movement

**Mitigation**: Supabase uses connection pooling in transaction mode. For a single-user app with sequential UI operations, this is unlikely to occur. But batch operations (like `save_budget_entries_atomic`) or rapid-fire API calls could trigger it.

**Fix**: Use `SELECT ... FOR UPDATE` on the pocket row before recalculating, or switch to incremental balance updates (`balance = balance + amount`).

### MODERATE: Orphaning without transaction safety (app-level)

The `delete_account_cascade` RPC handles this correctly in a single transaction. But the app-level `DeleteAccountCascadeUseCase.ts` does the same thing with multiple sequential queries — if the app crashes mid-way, movements could be orphaned without the account being deleted, or vice versa.

**Recommendation**: Always use the RPC function, never the app-level cascade.

### MODERATE: `exchange_rates` poisoning

Any authenticated user can write to `exchange_rates`. A malicious user (or a bug) could set `rate = 0` for USD→MXN, causing division-by-zero or zero-value net worth calculations.

**Fix**: Add a CHECK constraint: `CHECK (rate > 0)`.

---

## 11. Balance Trigger Logic — Edge Case Analysis

### Bug: NULL pocket_id crashes the trigger

```sql
IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE pockets SET balance = (...)
    WHERE id = NEW.pocket_id;  -- If NEW.pocket_id is NULL, this is a no-op (safe)
END IF;

IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.pocket_id <> NEW.pocket_id)) THEN
    -- If OLD.pocket_id is NULL and NEW.pocket_id is NULL:
    -- NULL <> NULL evaluates to NULL (not TRUE), so this branch is SKIPPED
    -- This is actually correct behavior — no pocket to update
END IF;
```

**Verdict**: NULL pocket_id is handled safely (the `WHERE id = NULL` matches nothing). However:

### Bug: Toggling `is_pending` doesn't trigger balance recalculation correctly

When a movement's `is_pending` changes from TRUE to FALSE (applying a pending movement):
1. The trigger fires (it's an UPDATE on movements)
2. The trigger recalculates the pocket balance including the now-non-pending movement
3. This is **correct** — the full recalculation picks up the change

When `is_pending` changes from FALSE to TRUE (marking as pending):
1. Same trigger fires
2. Recalculates excluding the now-pending movement
3. Also **correct**

### Bug: `OLD.pocket_id <> NEW.pocket_id` with NULLs

If a movement is updated from `pocket_id = NULL` to `pocket_id = 'abc'`:
- `NULL <> 'abc'` evaluates to `NULL` (not TRUE)
- The old pocket branch is **skipped** — correct (there's no old pocket to update)

If updated from `pocket_id = 'abc'` to `pocket_id = NULL`:
- `'abc' <> NULL` evaluates to `NULL` (not TRUE)  
- The old pocket branch is **SKIPPED** — **BUG!** The old pocket's balance is never recalculated

**Impact**: If a movement is orphaned by setting `pocket_id = NULL` without using the cascade RPC, the old pocket retains the stale balance. The `delete_account_cascade` RPC handles this by deleting the pocket entirely, so in practice this path may never be hit. But it's a latent bug.

**Fix**:
```sql
IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.pocket_id IS DISTINCT FROM NEW.pocket_id)) THEN
```

### Bug: `is_orphaned` movements still counted in balance

The trigger only excludes `is_pending = TRUE`. It does NOT exclude `is_orphaned = TRUE`. However, orphaned movements have `pocket_id = NULL` (set by the cascade), so `WHERE pocket_id = NEW.pocket_id` won't match them. This is safe **only if** the cascade always NULLs out pocket_id when orphaning.

Looking at `delete_account_cascade`: it does NOT null out `pocket_id` on orphaned movements — it only sets `is_orphaned = TRUE` and captures the name. The pocket is then deleted, which cascades... but wait, there's no FK on `movements.pocket_id`, so deleting the pocket does NOT cascade to movements.

**Result**: After `delete_account_cascade`:
- Movements have `is_orphaned = TRUE`, `pocket_id` still points to the now-deleted pocket
- The pocket no longer exists, so the trigger can't update it
- If the pocket is somehow recreated with the same UUID (impossible with gen_random_uuid), the orphaned movements would be counted in its balance

**Verdict**: Safe in practice but architecturally fragile.

---

## 12. ID Typing

| Table | PK Type | Generation | Notes |
|-------|---------|-----------|-------|
| `accounts` | `UUID` | `gen_random_uuid()` | ✅ |
| `pockets` | `UUID` | `gen_random_uuid()` | ✅ |
| `sub_pockets` | `UUID` | `gen_random_uuid()` | ✅ |
| `movements` | `UUID` | `gen_random_uuid()` | ✅ |
| `settings` | `UUID` | `gen_random_uuid()` | ✅ |
| `reminders` | `UUID` | `gen_random_uuid()` | ✅ |
| `reminder_exceptions` | `UUID` | `uuid_generate_v4()` (migration 003) vs `gen_random_uuid()` (schema 000) | ⚠️ Inconsistent generation function |
| `exchange_rates` | `UUID` | `gen_random_uuid()` (fixed in migration 007) | ✅ |
| `budget_entries` | `UUID` | `gen_random_uuid()` | ✅ |
| `movement_templates` | `UUID` | `gen_random_uuid()` | ✅ |
| `net_worth_snapshots` | `UUID` | `gen_random_uuid()` | ✅ |
| `fixed_expense_groups` | `UUID` | `gen_random_uuid()` | ✅ |
| `stock_prices` | `TEXT` (symbol as ID) | App-generated | ⚠️ Not UUID — uses stock symbol as PK |

### Issue: `stock_prices` uses symbol as ID

The repository does `id: stockPrice.symbol` — using the stock symbol (e.g., "VOO") as the primary key. This works but:
- Inconsistent with every other table
- If the app ever needs to track the same symbol from different sources, it can't

### Issue: RPC functions accept TEXT for UUID parameters

`create_transfer` and `delete_account_cascade` accept `TEXT` parameters for what should be `UUID`. PostgreSQL will cast implicitly, but this bypasses type validation at the function boundary.

---

## Priority Summary

### Must Fix (data corruption risk)

1. **Add `IS DISTINCT FROM` to trigger** — prevents stale balance when pocket_id changes to/from NULL
2. **Document `stock_prices` table** — create migration, add RLS policy
3. **Add CHECK constraint on `exchange_rates.rate`** — `CHECK (rate > 0)` prevents poisoning
4. **Add conditional NOT NULL on movements** — `CHECK (is_orphaned = TRUE OR (account_id IS NOT NULL AND pocket_id IS NOT NULL))`

### Should Fix (correctness/consistency)

5. **Change `maturity_date` and `cd_created_at` to TIMESTAMPTZ** — timezone consistency
6. **Change RPC parameter types from TEXT to UUID** — type safety
7. **Standardize money precision to DECIMAL(20,6)** — sub_pockets and reminder_exceptions use smaller precision
8. **Add composite index `(pocket_id, is_pending) WHERE is_pending = FALSE`** — trigger performance
9. **Add `updated_at` trigger** — `CREATE TRIGGER ... BEFORE UPDATE ... SET NEW.updated_at = NOW()`

### Nice to Have

10. **Add FK constraints on movements** with `ON DELETE SET NULL` — safety net
11. **Add `(user_id, displayed_date DESC)` index on movements** — query performance
12. **Rename `monto_invertido` to `amount_invested`** — English consistency (requires data migration)
13. **Add `categories` table** — better movement categorization

---

## Data Loss Risk Assessment

| Scenario | Risk Level | Mitigation |
|----------|-----------|------------|
| Running trigger fix migration | **NONE** | `IS DISTINCT FROM` is backward-compatible |
| Adding NOT NULL CHECK constraint | **LOW** | Must verify no existing rows violate it first |
| Changing TIMESTAMP → TIMESTAMPTZ | **NONE** | PostgreSQL preserves values, just adds TZ awareness |
| Adding FK constraints to movements | **MEDIUM** | Must verify no orphaned movements point to deleted pockets/accounts. Run: `SELECT * FROM movements WHERE pocket_id IS NOT NULL AND pocket_id NOT IN (SELECT id FROM pockets)` |
| Changing DECIMAL precision | **NONE** | Widening precision never loses data |

**Safe migration order**:
1. Add CHECK constraints (validate existing data first)
2. Fix trigger (`IS DISTINCT FROM`)
3. Add indexes
4. Change column types (TIMESTAMP → TIMESTAMPTZ, DECIMAL widening)
5. Add FK constraints (after verifying data integrity)

---

## Sources

- `/local/home/jdrami/finance-app/backend/migrations/000_initial_schema.sql` — canonical schema reference
- `/local/home/jdrami/finance-app/backend/migrations/001_balance_calculation.sql` — original trigger
- `/local/home/jdrami/finance-app/backend/migrations/002_fix_pending_balance.sql` — current trigger (active)
- `/local/home/jdrami/finance-app/backend/migrations/011_atomic_operations.sql` — RPC functions
- `/local/home/jdrami/finance-app/backend/migrations/012_enable_rls.sql` — RLS policies
- `/local/home/jdrami/finance-app/backend/migrations/013_add_indexes.sql` — indexes
- `/local/home/jdrami/finance-app/backend/src/modules/accounts/infrastructure/SupabaseStockPriceRepository.ts` — undocumented stock_prices table
- `/local/home/jdrami/finance-app/backend/src/modules/movements/application/mappers/MovementMapper.ts` — movement column mapping
