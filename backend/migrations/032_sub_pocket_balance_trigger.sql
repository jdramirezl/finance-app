-- Sub-pocket balance trigger: recalculates sub_pockets.balance when movements change.
-- Previously only pockets.balance had a trigger; sub-pocket balances were never updated.

CREATE OR REPLACE FUNCTION calculate_sub_pocket_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.sub_pocket_id IS NOT NULL THEN
            UPDATE sub_pockets
            SET balance = (
                SELECT COALESCE(SUM(
                    CASE
                        WHEN type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN amount
                        ELSE -amount
                    END
                ), 0)
                FROM movements
                WHERE sub_pocket_id = NEW.sub_pocket_id
                  AND (is_pending IS NULL OR is_pending = FALSE)
            )
            WHERE id = NEW.sub_pocket_id;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.sub_pocket_id IS DISTINCT FROM NEW.sub_pocket_id)) THEN
        IF OLD.sub_pocket_id IS NOT NULL THEN
            UPDATE sub_pockets
            SET balance = (
                SELECT COALESCE(SUM(
                    CASE
                        WHEN type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN amount
                        ELSE -amount
                    END
                ), 0)
                FROM movements
                WHERE sub_pocket_id = OLD.sub_pocket_id
                  AND (is_pending IS NULL OR is_pending = FALSE)
            )
            WHERE id = OLD.sub_pocket_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sub_pocket_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON movements
FOR EACH ROW
EXECUTE FUNCTION calculate_sub_pocket_balance();

-- Fix existing stale sub-pocket balances
UPDATE sub_pockets sp
SET balance = (
    SELECT COALESCE(SUM(
        CASE
            WHEN m.type IN ('IngresoNormal', 'IngresoFijo', 'InvestmentIngreso') THEN m.amount
            ELSE -m.amount
        END
    ), 0)
    FROM movements m
    WHERE m.sub_pocket_id = sp.id
      AND (m.is_pending IS NULL OR m.is_pending = FALSE)
);
