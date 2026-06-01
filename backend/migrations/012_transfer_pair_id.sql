-- Migration: Add transfer_pair_id support to create_transfer RPC
-- Also updates the function to accept per-side notes for auto-generated transfer descriptions.

DROP FUNCTION IF EXISTS create_transfer(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_transfer(
    p_user_id UUID,
    p_source_account_id TEXT,
    p_source_pocket_id TEXT,
    p_target_account_id TEXT,
    p_target_pocket_id TEXT,
    p_amount DECIMAL,
    p_displayed_date TEXT,
    p_notes TEXT DEFAULT NULL,
    p_transfer_pair_id UUID DEFAULT NULL,
    p_source_notes TEXT DEFAULT NULL,
    p_target_notes TEXT DEFAULT NULL
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
    v_pair_id UUID;
    v_expense_row movements%ROWTYPE;
    v_income_row movements%ROWTYPE;
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RAISE EXCEPTION 'Not authorized to create transfer for this user';
    END IF;

    IF p_amount IS NULL OR p_amount < 0 THEN
        RAISE EXCEPTION 'Transfer amount must be non-negative';
    END IF;

    v_pair_id := COALESCE(p_transfer_pair_id, gen_random_uuid());
    v_expense_notes := COALESCE(p_source_notes, p_notes, 'Transfer to target');
    v_income_notes := COALESCE(p_target_notes, p_notes, 'Transfer from source');

    INSERT INTO movements (
        id, user_id, type, account_id, pocket_id,
        amount, notes, displayed_date, created_at, is_pending, transfer_pair_id
    )
    VALUES (
        v_expense_id, p_user_id, 'EgresoNormal', p_source_account_id, p_source_pocket_id,
        p_amount, v_expense_notes, p_displayed_date, v_now, FALSE, v_pair_id
    )
    RETURNING * INTO v_expense_row;

    INSERT INTO movements (
        id, user_id, type, account_id, pocket_id,
        amount, notes, displayed_date, created_at, is_pending, transfer_pair_id
    )
    VALUES (
        v_income_id, p_user_id, 'IngresoNormal', p_target_account_id, p_target_pocket_id,
        p_amount, v_income_notes, p_displayed_date, v_now, FALSE, v_pair_id
    )
    RETURNING * INTO v_income_row;

    RETURN jsonb_build_object(
        'expense', to_jsonb(v_expense_row),
        'income', to_jsonb(v_income_row)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION create_transfer(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;
