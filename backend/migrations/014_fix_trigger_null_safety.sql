-- Migration 014: Fix balance trigger NULL-safety bug
--
-- Problem: calculate_pocket_balance() uses `OLD.pocket_id <> NEW.pocket_id` which
-- evaluates to NULL (not TRUE) when either side is NULL. This means when a movement's
-- pocket_id changes to/from NULL, the old pocket's balance is never recalculated.
-- Same issue exists in calculate_account_balance() with account_id.
--
-- Fix: Replace `<>` with `IS DISTINCT FROM` which treats NULL as a comparable value,
-- returning TRUE when one side is NULL and the other is not.

-- 1. Replace pocket balance function with NULL-safe comparison
CREATE OR REPLACE FUNCTION calculate_pocket_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT/UPDATE: Update the new pocket
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

    -- For DELETE/UPDATE: Update the old pocket (if different from new)
    -- FIX: IS DISTINCT FROM handles NULL correctly (NULL <> 'x' returns NULL, not TRUE)
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

-- 2. Replace account balance function with NULL-safe comparison
CREATE OR REPLACE FUNCTION calculate_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT/UPDATE: Update the new account
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE accounts
        SET balance = (
            SELECT COALESCE(SUM(balance), 0)
            FROM pockets
            WHERE account_id = NEW.account_id
        )
        WHERE id = NEW.account_id;
    END IF;

    -- For DELETE/UPDATE: Update the old account (if different from new)
    -- FIX: IS DISTINCT FROM handles NULL correctly
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

-- 3. Drop and recreate triggers to ensure they use the new functions
DROP TRIGGER IF EXISTS update_pocket_balance_trigger ON movements;
CREATE TRIGGER update_pocket_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON movements
FOR EACH ROW
EXECUTE FUNCTION calculate_pocket_balance();

DROP TRIGGER IF EXISTS update_account_balance_trigger ON pockets;
CREATE TRIGGER update_account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON pockets
FOR EACH ROW
EXECUTE FUNCTION calculate_account_balance();
