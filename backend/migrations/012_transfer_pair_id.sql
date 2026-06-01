-- Add transfer_pair_id column to link transfer pairs
ALTER TABLE movements ADD COLUMN IF NOT EXISTS transfer_pair_id UUID DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_movements_transfer_pair ON movements(transfer_pair_id) WHERE transfer_pair_id IS NOT NULL;

-- Recreate create_transfer RPC with new params
DROP FUNCTION IF EXISTS create_transfer(UUID, UUID, UUID, UUID, UUID, DECIMAL, DATE, TEXT);
CREATE FUNCTION create_transfer(
  p_user_id UUID, p_source_account_id UUID, p_source_pocket_id UUID,
  p_target_account_id UUID, p_target_pocket_id UUID, p_amount DECIMAL,
  p_displayed_date DATE, p_notes TEXT DEFAULT NULL,
  p_transfer_pair_id UUID DEFAULT NULL, p_source_notes TEXT DEFAULT NULL,
  p_target_notes TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_expense_id UUID := gen_random_uuid();
  v_income_id UUID := gen_random_uuid();
  v_pair_id UUID := COALESCE(p_transfer_pair_id, gen_random_uuid());
  v_src_notes TEXT := COALESCE(p_source_notes, p_notes);
  v_tgt_notes TEXT := COALESCE(p_target_notes, p_notes);
  v_result JSONB;
BEGIN
  INSERT INTO movements (id, user_id, type, account_id, pocket_id, amount, notes, displayed_date, is_pending, transfer_pair_id, created_at)
  VALUES (v_expense_id, p_user_id, 'EgresoNormal', p_source_account_id, p_source_pocket_id, p_amount, v_src_notes, p_displayed_date, FALSE, v_pair_id, NOW());

  INSERT INTO movements (id, user_id, type, account_id, pocket_id, amount, notes, displayed_date, is_pending, transfer_pair_id, created_at)
  VALUES (v_income_id, p_user_id, 'IngresoNormal', p_target_account_id, p_target_pocket_id, p_amount, v_tgt_notes, p_displayed_date, FALSE, v_pair_id, NOW());

  SELECT jsonb_build_object(
    'expense', (SELECT to_jsonb(m) FROM movements m WHERE m.id = v_expense_id),
    'income', (SELECT to_jsonb(m) FROM movements m WHERE m.id = v_income_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
