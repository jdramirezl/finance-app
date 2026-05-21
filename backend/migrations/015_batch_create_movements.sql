-- Migration: Batch create movements RPC
--
-- Atomically inserts multiple movements in a single transaction.
-- If any row fails, the entire batch rolls back.

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
    v_ids TEXT[];
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_movements IS NULL OR jsonb_typeof(p_movements) <> 'array' THEN
        RAISE EXCEPTION 'p_movements must be a JSON array';
    END IF;

    IF jsonb_array_length(p_movements) = 0 THEN
        RETURN '[]'::JSONB;
    END IF;

    -- Collect IDs for the SELECT after insert
    SELECT array_agg(COALESCE(entry->>'id', gen_random_uuid()::text))
      INTO v_ids
      FROM jsonb_array_elements(p_movements) AS entry;

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
       AND m.id = ANY(v_ids);

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION batch_create_movements(UUID, JSONB) TO authenticated;
