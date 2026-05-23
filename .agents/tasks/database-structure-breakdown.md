# Database Structure — Task Breakdown

**Generated**: 2026-05-21
**Source**: `.agents/analysis/database-structure-audit.md`
**Target**: Supabase project `fzndohawryghtzcqbrmz`
**Execution**: `supabase db push` or SQL editor

---

## Execution Windows

| Window | Tasks | Can Parallel? | Risk Level | Notes |
|--------|-------|---------------|------------|-------|
| W1 — Trigger Fixes | 1, 2 | No (2 depends on 1) | CRITICAL | Must run first; fixes data corruption bugs |
| W2 — CHECK Constraints | 3, 4, 5 | Yes | Low | Validate existing data before applying |
| W3 — Column Type Fixes | 6, 7, 8 | Yes | None | Backward-compatible type changes |
| W4 — RPC Type Safety | 9 | No | Low | Replaces functions; must re-grant |
| W5 — Indexes | 10, 11 | Yes | None | Performance only; no schema change |
| W6 — FK Constraints | 12 | No | Medium | Must verify data integrity first |
| W7 — Documentation | 13 | Independent | None | stock_prices table migration |
| W8 — Auto-update Trigger | 14 | Independent | None | Quality-of-life improvement |

**Dependency graph**:
```
W1 → W2 → W6
W3 (independent)
W4 (independent)
W5 (independent, but benefits from W1 being done)
W7 (independent)
W8 (independent)
```

---

## Task Details

### Task 1: Fix balance trigger NULL-safety bug (IS DISTINCT FROM)

- **Migration file**: `backend/migrations/014_fix_trigger_null_safety.sql`
- **Priority**: CRITICAL — data corruption risk
- **Files touched**: 1 (migration only)

- **What to do**:
  Replace `OLD.pocket_id <> NEW.pocket_id` with `OLD.pocket_id IS DISTINCT FROM NEW.pocket_id` in `calculate_pocket_balance()`. Same fix for `OLD.account_id <> NEW.account_id` in `calculate_account_balance()`. Drop and recreate both triggers.

- **SQL**:
```sql
-- Fix: NULL-unsafe comparison in balance triggers
-- OLD.pocket_id <> NEW.pocket_id evaluates to NULL (not TRUE) when either side is NULL,
-- causing stale balances when pocket_id changes to/from NULL.

CREATE OR REPLACE FUNCTION calculate_pocket_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE pockets
        SET balance = (
            SELECT COALESCE(SUM(
                CASE
                    WHEN type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN amount
                    ELSE -amount
                END
            ), 0)
            FROM movements
            WHERE pocket_id = NEW.pocket_id
              AND (is_pending IS NULL OR is_pending = FALSE)
        )
        WHERE id = NEW.pocket_id;
    END IF;

    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.pocket_id IS DISTINCT FROM NEW.pocket_id)) THEN
        UPDATE pockets
        SET balance = (
            SELECT COALESCE(SUM(
                CASE
                    WHEN type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN amount
                    ELSE -amount
                END
            ), 0)
            FROM movements
            WHERE pocket_id = OLD.pocket_id
              AND (is_pending IS NULL OR is_pending = FALSE)
        )
        WHERE id = OLD.pocket_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE accounts
        SET balance = (
            SELECT COALESCE(SUM(balance), 0)
            FROM pockets
            WHERE account_id = NEW.account_id
        )
        WHERE id = NEW.account_id;
    END IF;

    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id)) THEN
        UPDATE accounts
        SET balance = (
            SELECT COALESCE(SUM(balance), 0)
            FROM pockets
            WHERE account_id = OLD.account_id
        )
        WHERE id = OLD.account_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

- **Pre-check query**: None needed — `CREATE OR REPLACE FUNCTION` is safe on existing functions.
- **Verification query**:
```sql
-- Confirm the function body contains IS DISTINCT FROM
SELECT prosrc FROM pg_proc WHERE proname = 'calculate_pocket_balance';
-- Should contain 'IS DISTINCT FROM' instead of '<>'
```
- **Acceptance criteria**:
  - `calculate_pocket_balance()` uses `IS DISTINCT FROM` for pocket_id comparison
  - `calculate_account_balance()` uses `IS DISTINCT FROM` for account_id comparison
  - Existing triggers continue to fire (no DROP TRIGGER needed — functions are replaced in-place)
- **Rollback**: Re-run migration 002 SQL to restore old function bodies
- **Dependencies**: None

---

### Task 2: Recalculate all balances (post-trigger-fix verification)

- **Migration file**: `backend/migrations/015_recalculate_balances.sql`
- **Priority**: CRITICAL — ensures no stale data from the old trigger bug
- **Files touched**: 1 (migration only)

- **What to do**:
  Full recalculation of all pocket and account balances using the corrected logic. This catches any balances that were corrupted by the NULL-comparison bug.

- **SQL**:
```sql
-- Recalculate all pocket balances (excludes pending movements)
UPDATE pockets p
SET balance = (
    SELECT COALESCE(SUM(
        CASE
            WHEN m.type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN m.amount
            ELSE -m.amount
        END
    ), 0)
    FROM movements m
    WHERE m.pocket_id = p.id
      AND (m.is_pending IS NULL OR m.is_pending = FALSE)
);

-- Recalculate all account balances from pocket sums
UPDATE accounts a
SET balance = (
    SELECT COALESCE(SUM(p.balance), 0)
    FROM pockets p
    WHERE p.account_id = a.id
);
```

- **Pre-check query**:
```sql
-- Snapshot current balances for comparison
SELECT id, name, balance FROM accounts ORDER BY name;
SELECT id, name, balance, account_id FROM pockets ORDER BY name;
```
- **Verification query**:
```sql
-- Verify no pocket has a balance mismatch with its movements
SELECT p.id, p.name, p.balance AS stored_balance,
    COALESCE(SUM(
        CASE WHEN m.type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN m.amount ELSE -m.amount END
    ), 0) AS calculated_balance
FROM pockets p
LEFT JOIN movements m ON m.pocket_id = p.id AND (m.is_pending IS NULL OR m.is_pending = FALSE)
GROUP BY p.id, p.name, p.balance
HAVING p.balance <> COALESCE(SUM(
    CASE WHEN m.type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN m.amount ELSE -m.amount END
), 0);
-- Should return 0 rows
```
- **Acceptance criteria**:
  - Query above returns zero rows (all balances match calculated values)
  - No pocket or account has a stale balance
- **Rollback**: Re-run the same recalculation (idempotent)
- **Dependencies**: Task 1 (trigger fix must be in place first)

---

### Task 3: Add CHECK constraint on exchange_rates.rate

- **Migration file**: `backend/migrations/016_exchange_rate_check.sql`
- **Priority**: CRITICAL — prevents rate poisoning (division by zero)
- **Files touched**: 1 (migration only)

- **What to do**:
  Add `CHECK (rate > 0)` to `exchange_rates.rate` to prevent zero or negative rates that would cause division-by-zero in currency conversion.

- **SQL**:
```sql
ALTER TABLE exchange_rates
ADD CONSTRAINT exchange_rates_rate_positive CHECK (rate > 0);
```

- **Pre-check query**:
```sql
-- Verify no existing rows violate the constraint
SELECT * FROM exchange_rates WHERE rate <= 0;
-- Must return 0 rows before applying
```
- **Verification query**:
```sql
-- Confirm constraint exists
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'exchange_rates'::regclass AND conname = 'exchange_rates_rate_positive';
-- Should return 1 row

-- Confirm it rejects bad data
INSERT INTO exchange_rates (base_currency, target_currency, rate)
VALUES ('TEST', 'BAD', 0);
-- Should fail with CHECK violation
```
- **Acceptance criteria**:
  - Constraint `exchange_rates_rate_positive` exists on the table
  - Inserting `rate = 0` or `rate = -1` fails
  - Existing valid rates are unaffected
- **Rollback**: `ALTER TABLE exchange_rates DROP CONSTRAINT exchange_rates_rate_positive;`
- **Dependencies**: None

---

### Task 4: Add conditional NOT NULL constraint on movements (account_id, pocket_id)

- **Migration file**: `backend/migrations/017_movements_conditional_not_null.sql`
- **Priority**: CRITICAL — prevents inserting movements with no account/pocket unless orphaned
- **Files touched**: 1 (migration only)

- **What to do**:
  Add CHECK constraints ensuring non-orphaned movements always have `account_id` and `pocket_id`. Orphaned movements (where the account was deleted) are allowed to have NULLs.

- **SQL**:
```sql
-- Non-orphaned movements must have account_id and pocket_id
ALTER TABLE movements
ADD CONSTRAINT movements_require_account_when_active
    CHECK (is_orphaned = TRUE OR account_id IS NOT NULL);

ALTER TABLE movements
ADD CONSTRAINT movements_require_pocket_when_active
    CHECK (is_orphaned = TRUE OR pocket_id IS NOT NULL);
```

- **Pre-check query**:
```sql
-- Check for non-orphaned movements missing account_id
SELECT id, type, amount, is_orphaned, account_id, pocket_id
FROM movements
WHERE is_orphaned = FALSE AND (account_id IS NULL OR pocket_id IS NULL);
-- Must return 0 rows. If rows exist, they must be fixed first (set is_orphaned = TRUE or assign valid IDs)
```
- **Verification query**:
```sql
-- Confirm constraints exist
SELECT conname FROM pg_constraint
WHERE conrelid = 'movements'::regclass
  AND conname IN ('movements_require_account_when_active', 'movements_require_pocket_when_active');
-- Should return 2 rows

-- Confirm rejection of bad insert
INSERT INTO movements (user_id, type, amount, displayed_date, is_orphaned, account_id, pocket_id)
VALUES ('00000000-0000-0000-0000-000000000000', 'IngresoNormal', 100, NOW(), FALSE, NULL, NULL);
-- Should fail with CHECK violation
```
- **Acceptance criteria**:
  - Both CHECK constraints exist
  - Non-orphaned movements cannot have NULL account_id or pocket_id
  - Orphaned movements (is_orphaned = TRUE) can have NULL account_id/pocket_id
  - Existing data passes validation (pre-check returns 0 rows)
- **Rollback**:
```sql
ALTER TABLE movements DROP CONSTRAINT movements_require_account_when_active;
ALTER TABLE movements DROP CONSTRAINT movements_require_pocket_when_active;
```
- **Dependencies**: None (but run pre-check first; if violations exist, fix data manually before applying)

---

### Task 5: Add NOT NULL to display_order columns

- **Migration file**: `backend/migrations/018_display_order_not_null.sql`
- **Priority**: Moderate — prevents NULL ordering bugs
- **Files touched**: 1 (migration only)

- **What to do**:
  Add `NOT NULL` constraint to `display_order` on `accounts`, `pockets`, and `sub_pockets`. The DEFAULT 0 already exists, so this just prevents explicit NULL inserts.

- **SQL**:
```sql
-- Backfill any NULLs first (defensive)
UPDATE accounts SET display_order = 0 WHERE display_order IS NULL;
UPDATE pockets SET display_order = 0 WHERE display_order IS NULL;
UPDATE sub_pockets SET display_order = 0 WHERE display_order IS NULL;

-- Add NOT NULL constraints
ALTER TABLE accounts ALTER COLUMN display_order SET NOT NULL;
ALTER TABLE pockets ALTER COLUMN display_order SET NOT NULL;
ALTER TABLE sub_pockets ALTER COLUMN display_order SET NOT NULL;
```

- **Pre-check query**:
```sql
SELECT 'accounts' AS tbl, COUNT(*) AS null_count FROM accounts WHERE display_order IS NULL
UNION ALL
SELECT 'pockets', COUNT(*) FROM pockets WHERE display_order IS NULL
UNION ALL
SELECT 'sub_pockets', COUNT(*) FROM sub_pockets WHERE display_order IS NULL;
-- Shows how many rows need backfill (should be 0 or small)
```
- **Verification query**:
```sql
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_name IN ('accounts', 'pockets', 'sub_pockets')
  AND column_name = 'display_order';
-- All should show is_nullable = 'NO'
```
- **Acceptance criteria**:
  - All three `display_order` columns are NOT NULL
  - No existing rows have NULL display_order (backfilled to 0)
- **Rollback**:
```sql
ALTER TABLE accounts ALTER COLUMN display_order DROP NOT NULL;
ALTER TABLE pockets ALTER COLUMN display_order DROP NOT NULL;
ALTER TABLE sub_pockets ALTER COLUMN display_order DROP NOT NULL;
```
- **Dependencies**: None

---

### Task 6: Convert TIMESTAMP columns to TIMESTAMPTZ

- **Migration file**: `backend/migrations/019_timestamp_to_timestamptz.sql`
- **Priority**: Should fix — timezone consistency
- **Files touched**: 1 (migration only)

- **What to do**:
  Convert `accounts.maturity_date` and `accounts.cd_created_at` from `TIMESTAMP` to `TIMESTAMPTZ`. PostgreSQL preserves existing values and interprets them as UTC during conversion — no data loss.

- **SQL**:
```sql
ALTER TABLE accounts
    ALTER COLUMN maturity_date TYPE TIMESTAMPTZ USING maturity_date AT TIME ZONE 'UTC',
    ALTER COLUMN cd_created_at TYPE TIMESTAMPTZ USING cd_created_at AT TIME ZONE 'UTC';
```

- **Pre-check query**:
```sql
-- Check current column types
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'accounts' AND column_name IN ('maturity_date', 'cd_created_at');
-- Should show 'timestamp without time zone'

-- Check if any rows use these columns
SELECT COUNT(*) FROM accounts WHERE maturity_date IS NOT NULL OR cd_created_at IS NOT NULL;
```
- **Verification query**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'accounts' AND column_name IN ('maturity_date', 'cd_created_at');
-- Should show 'timestamp with time zone' for both
```
- **Acceptance criteria**:
  - Both columns are now `TIMESTAMPTZ`
  - Existing values preserved (interpreted as UTC)
  - No application errors (TypeScript `Date` handles both types identically)
- **Rollback**:
```sql
ALTER TABLE accounts
    ALTER COLUMN maturity_date TYPE TIMESTAMP,
    ALTER COLUMN cd_created_at TYPE TIMESTAMP;
```
- **Dependencies**: None

---

### Task 7: Standardize money column precision to DECIMAL(20,6)

- **Migration file**: `backend/migrations/020_standardize_decimal_precision.sql`
- **Priority**: Should fix — prevents truncation on large amounts
- **Files touched**: 1 (migration only)

- **What to do**:
  Widen `sub_pockets.value_total`, `sub_pockets.balance`, `reminder_exceptions.new_amount`, and `reminders.amount` to `DECIMAL(20,6)` for consistency with movements and pockets. Widening precision never loses data.

- **SQL**:
```sql
-- sub_pockets: DECIMAL(15,2) → DECIMAL(20,6)
ALTER TABLE sub_pockets
    ALTER COLUMN value_total TYPE DECIMAL(20, 6),
    ALTER COLUMN balance TYPE DECIMAL(20, 6);

-- reminders: DECIMAL(15,2) → DECIMAL(20,6)
ALTER TABLE reminders
    ALTER COLUMN amount TYPE DECIMAL(20, 6);

-- reminder_exceptions: DECIMAL(10,2) → DECIMAL(20,6)
ALTER TABLE reminder_exceptions
    ALTER COLUMN new_amount TYPE DECIMAL(20, 6);

-- budget_entries: DECIMAL(15,2) → DECIMAL(20,6)
ALTER TABLE budget_entries
    ALTER COLUMN amount TYPE DECIMAL(20, 6);

-- net_worth_snapshots: DECIMAL(15,2) → DECIMAL(20,6)
ALTER TABLE net_worth_snapshots
    ALTER COLUMN total_net_worth TYPE DECIMAL(20, 6);
```

- **Pre-check query**:
```sql
-- Verify current precision
SELECT table_name, column_name, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE (table_name, column_name) IN (
    ('sub_pockets', 'value_total'), ('sub_pockets', 'balance'),
    ('reminders', 'amount'), ('reminder_exceptions', 'new_amount'),
    ('budget_entries', 'amount'), ('net_worth_snapshots', 'total_net_worth')
);
```
- **Verification query**:
```sql
-- All should show precision=20, scale=6
SELECT table_name, column_name, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE (table_name, column_name) IN (
    ('sub_pockets', 'value_total'), ('sub_pockets', 'balance'),
    ('reminders', 'amount'), ('reminder_exceptions', 'new_amount'),
    ('budget_entries', 'amount'), ('net_worth_snapshots', 'total_net_worth')
)
AND (numeric_precision <> 20 OR numeric_scale <> 6);
-- Should return 0 rows
```
- **Acceptance criteria**:
  - All money columns listed above are `DECIMAL(20,6)`
  - Existing values unchanged (widening never truncates)
- **Rollback**:
```sql
ALTER TABLE sub_pockets ALTER COLUMN value_total TYPE DECIMAL(15, 2);
ALTER TABLE sub_pockets ALTER COLUMN balance TYPE DECIMAL(15, 2);
ALTER TABLE reminders ALTER COLUMN amount TYPE DECIMAL(15, 2);
ALTER TABLE reminder_exceptions ALTER COLUMN new_amount TYPE DECIMAL(10, 2);
ALTER TABLE budget_entries ALTER COLUMN amount TYPE DECIMAL(15, 2);
ALTER TABLE net_worth_snapshots ALTER COLUMN total_net_worth TYPE DECIMAL(15, 2);
```
- **Dependencies**: None

---

### Task 8: Widen accounts.principal to DECIMAL(20,6)

- **Migration file**: `backend/migrations/021_principal_precision.sql`
- **Priority**: Should fix — CD principal uses DECIMAL(20,2), inconsistent with other money columns
- **Files touched**: 1 (migration only)

- **What to do**:
  Widen `accounts.principal` from `DECIMAL(20,2)` to `DECIMAL(20,6)` for consistency.

- **SQL**:
```sql
ALTER TABLE accounts
    ALTER COLUMN principal TYPE DECIMAL(20, 6);
```

- **Pre-check query**:
```sql
SELECT numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'accounts' AND column_name = 'principal';
```
- **Verification query**:
```sql
SELECT numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'accounts' AND column_name = 'principal';
-- Should show 20, 6
```
- **Acceptance criteria**: `accounts.principal` is `DECIMAL(20,6)`
- **Rollback**: `ALTER TABLE accounts ALTER COLUMN principal TYPE DECIMAL(20, 2);`
- **Dependencies**: None

---

### Task 9: Change RPC function parameters from TEXT to UUID

- **Migration file**: `backend/migrations/022_rpc_uuid_params.sql`
- **Priority**: Should fix — type safety at function boundary
- **Files touched**: 1 (migration only)

- **What to do**:
  Replace `create_transfer` and `delete_account_cascade` with versions that accept `UUID` parameters instead of `TEXT`. Must drop old function signatures first (PostgreSQL treats different parameter types as different functions), then create new ones and re-grant.

- **SQL**:
```sql
-- Drop old TEXT-parameter versions
DROP FUNCTION IF EXISTS create_transfer(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT);
DROP FUNCTION IF EXISTS delete_account_cascade(UUID, TEXT, BOOLEAN);

-- Recreate create_transfer with UUID params
CREATE OR REPLACE FUNCTION create_transfer(
    p_user_id UUID,
    p_source_account_id UUID,
    p_source_pocket_id UUID,
    p_target_account_id UUID,
    p_target_pocket_id UUID,
    p_amount DECIMAL,
    p_displayed_date TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_now TIMESTAMPTZ := NOW();
    v_expense_id UUID := gen_random_uuid();
    v_income_id UUID := gen_random_uuid();
    v_expense_notes TEXT;
    v_income_notes TEXT;
    v_expense_row movements%ROWTYPE;
    v_income_row movements%ROWTYPE;
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RAISE EXCEPTION 'Not authorized to create transfer for this user';
    END IF;

    IF p_amount IS NULL OR p_amount < 0 THEN
        RAISE EXCEPTION 'Transfer amount must be non-negative';
    END IF;

    IF p_notes IS NOT NULL AND length(p_notes) > 0 THEN
        v_expense_notes := 'Transfer to target: ' || p_notes;
        v_income_notes := 'Transfer from source: ' || p_notes;
    ELSE
        v_expense_notes := 'Transfer to target';
        v_income_notes := 'Transfer from source';
    END IF;

    INSERT INTO movements (
        id, user_id, type, account_id, pocket_id,
        amount, notes, displayed_date, created_at, is_pending
    )
    VALUES (
        v_expense_id, p_user_id, 'EgresoNormal', p_source_account_id, p_source_pocket_id,
        p_amount, v_expense_notes, p_displayed_date, v_now, FALSE
    )
    RETURNING * INTO v_expense_row;

    INSERT INTO movements (
        id, user_id, type, account_id, pocket_id,
        amount, notes, displayed_date, created_at, is_pending
    )
    VALUES (
        v_income_id, p_user_id, 'IngresoNormal', p_target_account_id, p_target_pocket_id,
        p_amount, v_income_notes, p_displayed_date, v_now, FALSE
    )
    RETURNING * INTO v_income_row;

    RETURN jsonb_build_object(
        'expense', to_jsonb(v_expense_row),
        'income', to_jsonb(v_income_row)
    );
END;
$$;

-- Recreate delete_account_cascade with UUID param
CREATE OR REPLACE FUNCTION delete_account_cascade(
    p_user_id UUID,
    p_account_id UUID,
    p_delete_movements BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_account_name TEXT;
    v_account_currency TEXT;
    v_account_owner UUID;
    v_movements_affected INT := 0;
    v_sub_pockets_deleted INT := 0;
    v_pockets_deleted INT := 0;
    v_accounts_deleted INT := 0;
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RAISE EXCEPTION 'Not authorized to delete account for this user';
    END IF;

    SELECT name, currency, user_id
      INTO v_account_name, v_account_currency, v_account_owner
      FROM accounts
     WHERE id = p_account_id;

    IF v_account_owner IS NULL THEN
        RAISE EXCEPTION 'Account % not found', p_account_id;
    END IF;

    IF v_account_owner <> p_user_id THEN
        RAISE EXCEPTION 'Account % does not belong to this user', p_account_id;
    END IF;

    IF p_delete_movements THEN
        WITH deleted AS (
            DELETE FROM movements
             WHERE user_id = p_user_id
               AND account_id = p_account_id
            RETURNING 1
        )
        SELECT COUNT(*) INTO v_movements_affected FROM deleted;
    ELSE
        WITH updated AS (
            UPDATE movements m
               SET is_orphaned = TRUE,
                   orphaned_account_name = v_account_name,
                   orphaned_account_currency = v_account_currency,
                   orphaned_pocket_name = COALESCE(p.name, m.orphaned_pocket_name)
              FROM (
                  SELECT id, name FROM pockets WHERE account_id = p_account_id
              ) p
             WHERE m.user_id = p_user_id
               AND m.account_id = p_account_id
               AND (m.pocket_id = p.id OR m.pocket_id IS NULL)
            RETURNING 1
        )
        SELECT COUNT(*) INTO v_movements_affected FROM updated;

        WITH updated2 AS (
            UPDATE movements
               SET is_orphaned = TRUE,
                   orphaned_account_name = v_account_name,
                   orphaned_account_currency = v_account_currency
             WHERE user_id = p_user_id
               AND account_id = p_account_id
               AND is_orphaned IS DISTINCT FROM TRUE
            RETURNING 1
        )
        SELECT v_movements_affected + COUNT(*) INTO v_movements_affected FROM updated2;
    END IF;

    WITH deleted AS (
        DELETE FROM sub_pockets
         WHERE pocket_id IN (
             SELECT id FROM pockets WHERE account_id = p_account_id AND user_id = p_user_id
         )
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_sub_pockets_deleted FROM deleted;

    WITH deleted AS (
        DELETE FROM pockets
         WHERE account_id = p_account_id
           AND user_id = p_user_id
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_pockets_deleted FROM deleted;

    WITH deleted AS (
        DELETE FROM accounts
         WHERE id = p_account_id
           AND user_id = p_user_id
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_accounts_deleted FROM deleted;

    RETURN jsonb_build_object(
        'movements_affected', v_movements_affected,
        'sub_pockets_deleted', v_sub_pockets_deleted,
        'pockets_deleted', v_pockets_deleted,
        'accounts_deleted', v_accounts_deleted,
        'movements_deleted', p_delete_movements
    );
END;
$$;

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION create_transfer(UUID, UUID, UUID, UUID, UUID, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_account_cascade(UUID, UUID, BOOLEAN) TO authenticated;
```

- **Pre-check query**:
```sql
-- Verify current function signatures
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN ('create_transfer', 'delete_account_cascade');
```
- **Verification query**:
```sql
-- Confirm new signatures exist with UUID params
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN ('create_transfer', 'delete_account_cascade');
-- create_transfer should show UUID params for account/pocket IDs
-- delete_account_cascade should show UUID for p_account_id
```
- **Acceptance criteria**:
  - Old TEXT-parameter functions are dropped
  - New UUID-parameter functions exist and are callable
  - `authenticated` role has EXECUTE permission on both
  - Frontend service calls still work (Supabase client passes strings that PostgreSQL casts to UUID)
- **Rollback**: Re-run migration 011 SQL to restore TEXT-parameter versions
- **Dependencies**: None (but test frontend after applying — the Supabase JS client sends strings which auto-cast to UUID)

---

### Task 10: Add composite indexes for query performance

- **Migration file**: `backend/migrations/023_composite_indexes.sql`
- **Priority**: Nice to have — query and trigger performance
- **Files touched**: 1 (migration only)

- **What to do**:
  Add targeted composite indexes that benefit the balance trigger and common UI queries. Remove low-selectivity standalone boolean indexes that the composites supersede.

- **SQL**:
```sql
-- Composite index for balance trigger: pocket_id + is_pending filter
-- Partial index only includes non-pending rows (what the trigger actually sums)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movements_pocket_balance
ON movements (pocket_id)
WHERE is_pending = FALSE;

-- Primary UI query: list movements by date for a user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movements_user_date
ON movements (user_id, displayed_date DESC);

-- Account ordering for drag-and-drop
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_user_order
ON accounts (user_id, display_order);

-- Reminder listing sorted by due date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_user_due
ON reminders (user_id, due_date);

-- Drop low-selectivity standalone boolean indexes (superseded by composites)
DROP INDEX IF EXISTS idx_movements_is_pending;
DROP INDEX IF EXISTS idx_movements_is_orphaned;
```

- **Pre-check query**: None needed — `CREATE INDEX CONCURRENTLY IF NOT EXISTS` is safe.
- **Verification query**:
```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'movements'
  AND indexname IN ('idx_movements_pocket_balance', 'idx_movements_user_date');
-- Should return 2 rows

SELECT indexname FROM pg_indexes
WHERE indexname IN ('idx_movements_is_pending', 'idx_movements_is_orphaned');
-- Should return 0 rows (dropped)
```
- **Acceptance criteria**:
  - 4 new indexes created
  - 2 old boolean indexes dropped
  - No change to query results (indexes are transparent)
- **Rollback**:
```sql
DROP INDEX IF EXISTS idx_movements_pocket_balance;
DROP INDEX IF EXISTS idx_movements_user_date;
DROP INDEX IF EXISTS idx_accounts_user_order;
DROP INDEX IF EXISTS idx_reminders_user_due;
-- Recreate old indexes if needed:
CREATE INDEX idx_movements_is_pending ON movements (is_pending);
CREATE INDEX idx_movements_is_orphaned ON movements (is_orphaned);
```
- **Dependencies**: None

**Note**: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. If using `supabase db push` (which wraps in a transaction), remove `CONCURRENTLY` or run via SQL editor instead.

---

### Task 11: Add partial index for orphaned movement queries

- **Migration file**: `backend/migrations/024_orphaned_movements_index.sql`
- **Priority**: Nice to have — supports orphaned movement UI display
- **Files touched**: 1 (migration only)

- **What to do**:
  Add a partial index for querying orphaned movements (used in the UI to display movements from deleted accounts).

- **SQL**:
```sql
-- Partial index for orphaned movements (used in UI listing)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movements_orphaned
ON movements (user_id, displayed_date DESC)
WHERE is_orphaned = TRUE;
```

- **Pre-check query**: None needed.
- **Verification query**:
```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE indexname = 'idx_movements_orphaned';
-- Should return 1 row with the partial WHERE clause
```
- **Acceptance criteria**: Index exists with correct partial filter
- **Rollback**: `DROP INDEX IF EXISTS idx_movements_orphaned;`
- **Dependencies**: None (can run in parallel with Task 10)

**Note**: Same `CONCURRENTLY` caveat as Task 10.

---

### Task 12: Add FK constraints on movements (account_id, pocket_id, sub_pocket_id)

- **Migration file**: `backend/migrations/025_movements_fk_constraints.sql`
- **Priority**: Should fix — safety net for referential integrity
- **Files touched**: 1 (migration only)

- **What to do**:
  Add foreign key constraints with `ON DELETE SET NULL` to `movements.account_id`, `movements.pocket_id`, and `movements.sub_pocket_id`. This is safe because the orphaning system already NULLs these on delete — FKs just add a DB-level safety net.

  **IMPORTANT**: Must verify no movements reference non-existent accounts/pockets first.

- **SQL**:
```sql
-- Add FK constraints with ON DELETE SET NULL (matches orphaning behavior)
ALTER TABLE movements
ADD CONSTRAINT fk_movements_account
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE movements
ADD CONSTRAINT fk_movements_pocket
    FOREIGN KEY (pocket_id) REFERENCES pockets(id) ON DELETE SET NULL;

ALTER TABLE movements
ADD CONSTRAINT fk_movements_sub_pocket
    FOREIGN KEY (sub_pocket_id) REFERENCES sub_pockets(id) ON DELETE SET NULL;
```

- **Pre-check query** (CRITICAL — must pass before applying):
```sql
-- Movements pointing to non-existent accounts
SELECT m.id, m.account_id, m.is_orphaned
FROM movements m
WHERE m.account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = m.account_id);
-- Must return 0 rows. If rows exist: SET account_id = NULL, is_orphaned = TRUE on those rows first.

-- Movements pointing to non-existent pockets
SELECT m.id, m.pocket_id, m.is_orphaned
FROM movements m
WHERE m.pocket_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pockets p WHERE p.id = m.pocket_id);
-- Must return 0 rows. Same fix: NULL out pocket_id and mark orphaned.

-- Movements pointing to non-existent sub_pockets
SELECT m.id, m.sub_pocket_id
FROM movements m
WHERE m.sub_pocket_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sub_pockets sp WHERE sp.id = m.sub_pocket_id);
-- Must return 0 rows. Fix: SET sub_pocket_id = NULL.
```

- **Data fix (if pre-check fails)**:
```sql
-- Fix orphaned references before adding FKs
UPDATE movements SET account_id = NULL, is_orphaned = TRUE
WHERE account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM accounts WHERE id = movements.account_id);

UPDATE movements SET pocket_id = NULL, is_orphaned = TRUE
WHERE pocket_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pockets WHERE id = movements.pocket_id);

UPDATE movements SET sub_pocket_id = NULL
WHERE sub_pocket_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sub_pockets WHERE id = movements.sub_pocket_id);
```

- **Verification query**:
```sql
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'movements'::regclass
  AND conname IN ('fk_movements_account', 'fk_movements_pocket', 'fk_movements_sub_pocket');
-- Should return 3 rows
```
- **Acceptance criteria**:
  - All 3 FK constraints exist
  - Deleting an account/pocket sets the movement's reference to NULL (ON DELETE SET NULL)
  - No existing data violates the constraints
  - The `delete_account_cascade` RPC still works (it deletes pockets after orphaning movements, so the FK SET NULL fires harmlessly)
- **Rollback**:
```sql
ALTER TABLE movements DROP CONSTRAINT fk_movements_account;
ALTER TABLE movements DROP CONSTRAINT fk_movements_pocket;
ALTER TABLE movements DROP CONSTRAINT fk_movements_sub_pocket;
```
- **Dependencies**: Task 4 (conditional NOT NULL must be in place so the FK SET NULL doesn't violate the CHECK — but since SET NULL makes is_orphaned irrelevant for those rows... actually no dependency. The CHECK says `is_orphaned = TRUE OR account_id IS NOT NULL`. If FK fires SET NULL on account_id, the CHECK would fail unless is_orphaned is also set TRUE. This means the `delete_account_cascade` RPC must set is_orphaned BEFORE the pocket/account delete. Review the RPC — it does set is_orphaned first, then deletes. Safe.)

---

### Task 13: Document stock_prices table (create migration + RLS)

- **Migration file**: `backend/migrations/026_stock_prices_table.sql`
- **Priority**: CRITICAL — undocumented table in production with unknown RLS status
- **Files touched**: 1 (migration only)

- **What to do**:
  Create a migration that documents the `stock_prices` table schema (already exists in production — use `IF NOT EXISTS`). Add RLS policy allowing any authenticated user to read/write (it's a shared cache like `exchange_rates`). Add a UNIQUE constraint on `symbol`.

- **SQL**:
```sql
-- Document the stock_prices table that was created manually in Supabase dashboard.
-- Uses IF NOT EXISTS since the table already exists in production.
CREATE TABLE IF NOT EXISTS stock_prices (
    id              TEXT PRIMARY KEY,  -- Uses stock symbol as ID (e.g., "VOO")
    symbol          TEXT NOT NULL,
    price           DECIMAL(20, 6) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    market_state    TEXT,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure symbol uniqueness (the app upserts on symbol)
-- The id IS the symbol, but add explicit constraint for clarity
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_prices_symbol
ON stock_prices (symbol);

COMMENT ON TABLE stock_prices IS 'Shared cache of stock/ETF prices. Not user-scoped — all users share the same price data. Refreshed by InvestmentService.';
COMMENT ON COLUMN stock_prices.id IS 'Uses stock symbol as primary key (e.g., "VOO"). Not UUID — intentional for upsert simplicity.';

-- Enable RLS (may already be enabled — safe to call again)
ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read (shared cache)
CREATE POLICY IF NOT EXISTS "Authenticated users can read stock prices"
ON stock_prices FOR SELECT
TO authenticated
USING (true);

-- Allow any authenticated user to insert/update (shared cache, like exchange_rates)
CREATE POLICY IF NOT EXISTS "Authenticated users can insert stock prices"
ON stock_prices FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can update stock prices"
ON stock_prices FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add CHECK constraint on price (prevent zero/negative like exchange_rates)
ALTER TABLE stock_prices
ADD CONSTRAINT stock_prices_price_positive CHECK (price >= 0);
-- Note: price CAN be 0 for delisted stocks, unlike exchange_rates where 0 causes division errors
```

- **Pre-check query**:
```sql
-- Verify table exists in production
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'stock_prices' AND table_schema = 'public'
);
-- Should return TRUE

-- Check current RLS status
SELECT relrowsecurity FROM pg_class WHERE relname = 'stock_prices';

-- Check existing data
SELECT * FROM stock_prices LIMIT 5;
```
- **Verification query**:
```sql
-- Confirm RLS is enabled
SELECT relrowsecurity FROM pg_class WHERE relname = 'stock_prices';
-- Should return TRUE

-- Confirm policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'stock_prices';
-- Should return 3 policies

-- Confirm constraint
SELECT conname FROM pg_constraint
WHERE conrelid = 'stock_prices'::regclass AND conname = 'stock_prices_price_positive';
-- Should return 1 row
```
- **Acceptance criteria**:
  - Migration file documents the full schema
  - RLS is enabled with authenticated read/write policies
  - Price CHECK constraint prevents negative values
  - Existing data is unaffected
  - The `SupabaseStockPriceRepository.ts` continues to work without changes
- **Rollback**:
```sql
DROP POLICY IF EXISTS "Authenticated users can read stock prices" ON stock_prices;
DROP POLICY IF EXISTS "Authenticated users can insert stock prices" ON stock_prices;
DROP POLICY IF EXISTS "Authenticated users can update stock prices" ON stock_prices;
ALTER TABLE stock_prices DROP CONSTRAINT IF EXISTS stock_prices_price_positive;
-- Don't drop the table — it has production data
```
- **Dependencies**: None (independent of all other tasks)

---

### Task 14: Add updated_at auto-update trigger

- **Migration file**: `backend/migrations/027_updated_at_trigger.sql`
- **Priority**: Should fix — removes fragile app-level timestamp management
- **Files touched**: 1 (migration only)

- **What to do**:
  Create a reusable trigger function that sets `updated_at = NOW()` on any UPDATE, then attach it to all tables that have an `updated_at` column. This makes the timestamp reliable regardless of whether the app remembers to set it.

- **SQL**:
```sql
-- Generic trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to all tables with updated_at columns
CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pockets_updated_at
    BEFORE UPDATE ON pockets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sub_pockets_updated_at
    BEFORE UPDATE ON sub_pockets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reminder_exceptions_updated_at
    BEFORE UPDATE ON reminder_exceptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_budget_entries_updated_at
    BEFORE UPDATE ON budget_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_movement_templates_updated_at
    BEFORE UPDATE ON movement_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_fixed_expense_groups_updated_at
    BEFORE UPDATE ON fixed_expense_groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- **Pre-check query**: None needed — `CREATE TRIGGER` on non-existent trigger names is safe.
- **Verification query**:
```sql
-- Confirm triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_%_updated_at'
ORDER BY event_object_table;
-- Should return 9 rows (one per table)

-- Functional test: update a setting and check timestamp
UPDATE settings SET primary_currency = primary_currency WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
SELECT updated_at > NOW() - INTERVAL '5 seconds' AS recently_updated FROM settings LIMIT 1;
-- Should return TRUE
```
- **Acceptance criteria**:
  - `set_updated_at()` function exists
  - 9 BEFORE UPDATE triggers attached to all tables with `updated_at`
  - Any UPDATE to these tables automatically refreshes `updated_at`
  - App-level `updated_at` setting still works (trigger overwrites it — this is intentional)
- **Rollback**:
```sql
DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
DROP TRIGGER IF EXISTS trg_pockets_updated_at ON pockets;
DROP TRIGGER IF EXISTS trg_sub_pockets_updated_at ON sub_pockets;
DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS trg_reminders_updated_at ON reminders;
DROP TRIGGER IF EXISTS trg_reminder_exceptions_updated_at ON reminder_exceptions;
DROP TRIGGER IF EXISTS trg_budget_entries_updated_at ON budget_entries;
DROP TRIGGER IF EXISTS trg_movement_templates_updated_at ON movement_templates;
DROP TRIGGER IF EXISTS trg_fixed_expense_groups_updated_at ON fixed_expense_groups;
DROP FUNCTION IF EXISTS set_updated_at();
```
- **Dependencies**: None

---

## Audit Finding → Task Mapping

| Audit Section | Finding | Task |
|---------------|---------|------|
| §1 TIMESTAMP vs TIMESTAMPTZ | `maturity_date`, `cd_created_at` wrong type | Task 6 |
| §1 TEXT where UUID should be | RPC params use TEXT for UUID columns | Task 9 |
| §1 Precision inconsistencies | sub_pockets, reminders, budget use smaller DECIMAL | Task 7, 8 |
| §2 Missing FK on movements | No FK on account_id, pocket_id, sub_pocket_id | Task 12 |
| §3 Missing indexes | Composite indexes for common queries | Task 10, 11 |
| §3 Redundant indexes | Standalone boolean indexes low selectivity | Task 10 (drops them) |
| §6 Missing NOT NULL | display_order nullable | Task 5 |
| §6 Conditional NOT NULL | movements.account_id/pocket_id nullable when shouldn't be | Task 4 |
| §9 Undocumented stock_prices | No migration, unknown RLS | Task 13 |
| §10 Exchange rate poisoning | No CHECK on rate > 0 | Task 3 |
| §11 Trigger NULL-safety bug | `<>` vs `IS DISTINCT FROM` | Task 1 |
| §11 Balance verification | Stale balances from old bug | Task 2 |
| Audit recommendation | updated_at auto-trigger | Task 14 |

### Findings explicitly NOT addressed (with rationale)

| Finding | Reason not addressed |
|---------|---------------------|
| §4 RLS — SECURITY DEFINER risk | Architectural concern, not a migration fix. RPCs correctly check auth.uid(). |
| §5 Redundant/derived data (shares, monto_invertido) | Intentional design — allows manual override. No migration needed. |
| §7 Spanish naming (monto_invertido, movement types) | Audit recommends NOT renaming (data loss risk). Document only. |
| §8 Missing defaults | Audit found no critical missing defaults. |
| §9 Recommended new tables (audit_log, categories) | Feature work, not structural fixes. Separate project. |
| §10 Race condition in trigger | Single-user app with sequential UI. Fix requires architectural change (row locking or incremental updates). Out of scope for migration-only tasks. |
| §10 App-level cascade (DeleteAccountCascadeUseCase) | App code fix, not a migration. Separate task. |
| §12 reminder_exceptions UUID generation inconsistency | `uuid_generate_v4()` vs `gen_random_uuid()` — functionally identical. Not worth a migration. |

---

## Execution Checklist

```
[ ] Run pre-check queries for Tasks 4, 5, 12 (data validation)
[ ] Fix any data violations found in pre-checks
[ ] Window 1: Task 1 (trigger fix) → Task 2 (recalculate)
[ ] Window 2: Tasks 3, 4, 5 (CHECK constraints — parallel OK)
[ ] Window 3: Tasks 6, 7, 8 (type changes — parallel OK)
[ ] Window 4: Task 9 (RPC replacement)
[ ] Window 5: Tasks 10, 11 (indexes — parallel OK, use SQL editor for CONCURRENTLY)
[ ] Window 6: Task 12 (FK constraints — after data validation)
[ ] Window 7: Task 13 (stock_prices documentation)
[ ] Window 8: Task 14 (updated_at trigger)
[ ] Post-execution: Run all verification queries
[ ] Post-execution: Test frontend flows (transfers, account deletion, movement creation)
```

---

## Notes for Coder Agents

1. **Migration numbering**: Start at 014. Each task = one file. Do not combine tasks.
2. **Supabase specifics**: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. For Tasks 10/11, either remove `CONCURRENTLY` (acceptable for small tables) or instruct the user to run via SQL editor.
3. **Testing**: After each migration, the verification query must pass. If it doesn't, the migration has a bug.
4. **Frontend impact**: Task 9 (RPC type change) is the only task that could break the frontend. The Supabase JS client sends strings for UUID params — PostgreSQL auto-casts `'abc-123'::uuid`, so it should work. But test the transfer and delete-account flows after applying.
5. **Rollback strategy**: Every task has a rollback. If a migration fails mid-way, run the rollback SQL manually in the SQL editor.
6. **`CREATE POLICY IF NOT EXISTS`**: This syntax is available in PostgreSQL 15+. The project runs PG 17, so it's safe.
