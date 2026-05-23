-- Migration: Atomic operations for transfers, budget saves, and cascade deletes
--
-- These RPC functions wrap multi-step writes in a single transaction so that
-- partial failures cannot leave the database in a corrupt state. They are all
-- SECURITY DEFINER but enforce p_user_id matches the caller's auth.uid() to
-- prevent cross-user writes.

-- ============================================================================
-- 1. create_transfer
-- ============================================================================
-- Atomically creates two movements (an expense from the source pocket and an
-- income into the target pocket). If either insert fails, both roll back.
-- Returns a JSON object: { "expense": <movement>, "income": <movement> }.

CREATE OR REPLACE FUNCTION create_transfer(
    p_user_id UUID,
    p_source_account_id TEXT,
    p_source_pocket_id TEXT,
    p_target_account_id TEXT,
    p_target_pocket_id TEXT,
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
    v_expense_id TEXT := gen_random_uuid()::text;
    v_income_id TEXT := gen_random_uuid()::text;
    v_expense_notes TEXT;
    v_income_notes TEXT;
    v_expense_row movements%ROWTYPE;
    v_income_row movements%ROWTYPE;
BEGIN
    -- Authorization: caller must be the user whose data is being modified
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

    -- Insert expense (source side). The trailing RETURNING * gives us the
    -- canonical row including any DB-side defaults.
    INSERT INTO movements (
        id, user_id, type, account_id, pocket_id,
        amount, notes, displayed_date, created_at, is_pending
    )
    VALUES (
        v_expense_id, p_user_id, 'EgresoNormal', p_source_account_id, p_source_pocket_id,
        p_amount, v_expense_notes, p_displayed_date, v_now, FALSE
    )
    RETURNING * INTO v_expense_row;

    -- Insert income (target side) in the same transaction.
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

-- ============================================================================
-- 2. save_budget_entries_atomic
-- ============================================================================
-- Atomically replaces the user's budget_entries: deletes existing rows and
-- inserts the new set in the same transaction. If the insert fails the delete
-- is rolled back, so the user never ends up with empty budget data.
--
-- p_entries is a JSONB array of objects: { id, name, amount, display_order }.

CREATE OR REPLACE FUNCTION save_budget_entries_atomic(
    p_user_id UUID,
    p_entries JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RAISE EXCEPTION 'Not authorized to save budget entries for this user';
    END IF;

    IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' THEN
        RAISE EXCEPTION 'p_entries must be a JSON array';
    END IF;

    -- Replace the user's budget set in a single transaction.
    DELETE FROM budget_entries WHERE user_id = p_user_id;

    IF jsonb_array_length(p_entries) > 0 THEN
        INSERT INTO budget_entries (id, user_id, name, amount, display_order)
        SELECT
            entry->>'id',
            p_user_id,
            entry->>'name',
            (entry->>'amount')::DECIMAL,
            COALESCE((entry->>'display_order')::INT, 0)
        FROM jsonb_array_elements(p_entries) AS entry;
    END IF;
END;
$$;

-- ============================================================================
-- 3. delete_account_cascade
-- ============================================================================
-- Atomically removes (or orphans) every record tied to an account. When
-- p_delete_movements is TRUE, the account's movements are deleted outright;
-- otherwise they are flagged as orphaned with the original account name
-- captured for later restoration. Sub-pockets, pockets, and the account row
-- itself are then deleted. Returns a JSON object reporting how many rows of
-- each type were touched.

CREATE OR REPLACE FUNCTION delete_account_cascade(
    p_user_id UUID,
    p_account_id TEXT,
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

    -- Fetch the account and verify ownership before any destructive work.
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

    -- Either delete movements outright or flag them as orphaned, capturing
    -- the original account name/currency and pocket name on each row so the
    -- user can restore them later.
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

        -- Catch movements that did not match any pocket join (defensive).
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

    -- Sub-pockets live under pockets that live under the account.
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

-- ============================================================================
-- Grants
-- ============================================================================
-- Allow authenticated users to call these functions. Inside each function,
-- auth.uid() is checked against p_user_id to enforce per-user access.

GRANT EXECUTE ON FUNCTION create_transfer(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION save_budget_entries_atomic(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_account_cascade(UUID, TEXT, BOOLEAN) TO authenticated;
