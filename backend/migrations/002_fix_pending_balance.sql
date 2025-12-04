-- Migration: Fix balance calculation to exclude pending movements
-- This fixes the bug where pending movements were incorrectly affecting balances

-- 1. Drop existing triggers
DROP TRIGGER IF EXISTS update_pocket_balance_trigger ON movements;
DROP TRIGGER IF EXISTS update_account_balance_trigger ON pockets;

-- 2. Function to calculate pocket balance (FIXED: excludes pending movements)
CREATE OR REPLACE FUNCTION calculate_pocket_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the balance of the affected pocket(s)
    -- We need to handle both OLD and NEW for updates/deletes
    
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
              AND (is_pending IS NULL OR is_pending = FALSE)  -- EXCLUDE PENDING
        )
        WHERE id = NEW.pocket_id;
    END IF;

    -- For DELETE/UPDATE: Update the old pocket (if different)
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.pocket_id <> NEW.pocket_id)) THEN
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
              AND (is_pending IS NULL OR is_pending = FALSE)  -- EXCLUDE PENDING
        )
        WHERE id = OLD.pocket_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to calculate account balance (unchanged, but recreated for consistency)
CREATE OR REPLACE FUNCTION calculate_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the balance of the affected account(s)
    
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

    -- For DELETE/UPDATE: Update the old account (if different)
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.account_id <> NEW.account_id)) THEN
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

-- 4. Recreate Triggers on movements table
CREATE TRIGGER update_pocket_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON movements
FOR EACH ROW
EXECUTE FUNCTION calculate_pocket_balance();

-- 5. Recreate Triggers on pockets table
CREATE TRIGGER update_account_balance_trigger
AFTER INSERT OR UPDATE OR DELETE ON pockets
FOR EACH ROW
EXECUTE FUNCTION calculate_account_balance();

-- 6. Recalculate all balances to fix existing data (EXCLUDING PENDING)
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
      AND (m.is_pending IS NULL OR m.is_pending = FALSE)  -- EXCLUDE PENDING
);

UPDATE accounts a
SET balance = (
    SELECT COALESCE(SUM(p.balance), 0)
    FROM pockets p
    WHERE p.account_id = a.id
);
